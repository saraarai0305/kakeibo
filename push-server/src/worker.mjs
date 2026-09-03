import { DurableObject } from "cloudflare:workers";
import webpush from "web-push";

const JSON_TYPE = { "Content-Type": "application/json; charset=utf-8" };
const encoder = new TextEncoder();
const MAX_REMINDERS = 180;
const YEAR_MS = 366 * 24 * 60 * 60 * 1000;

function json(value, status = 200, headers = {}) {
  return new Response(JSON.stringify(value), { status, headers: { ...JSON_TYPE, ...headers } });
}

function cors(request, response) {
  const headers = new Headers(response.headers);
  const origin = request.headers.get("Origin");
  if (origin) headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Vary", "Origin");
  headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type, X-Mainichi-Setup-Key");
  headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function bearer(request) {
  const value = request.headers.get("Authorization") || "";
  return value.startsWith("Bearer ") ? value.slice(7).trim() : "";
}

function randomSecret() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return toBase64Url(bytes);
}

function toBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function digest(value) {
  const bytes = await crypto.subtle.digest("SHA-256", encoder.encode(String(value || "")));
  return toBase64Url(new Uint8Array(bytes));
}

function sameText(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let different = 0;
  for (let index = 0; index < a.length; index++) different |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return different === 0;
}

function validDeviceId(value) {
  return /^[a-f0-9]{32}$/i.test(String(value || ""));
}

function validSubscription(value) {
  return Boolean(
    value &&
      typeof value.endpoint === "string" &&
      value.endpoint.startsWith("https://") &&
      value.keys &&
      typeof value.keys.p256dh === "string" &&
      typeof value.keys.auth === "string",
  );
}

function normaliseReminders(value) {
  if (!Array.isArray(value) || value.length > MAX_REMINDERS) throw new Error("予定通知の件数を確認してください");
  const now = Date.now();
  const unique = new Map();
  for (const raw of value) {
    const scheduledAt = Number(raw?.scheduledAt);
    const id = String(raw?.id || "");
    const title = String(raw?.title || "").trim();
    const body = String(raw?.body || "").trim();
    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id) || !Number.isFinite(scheduledAt)) throw new Error("予定通知の形式を確認してください");
    if (scheduledAt <= now - 60_000 || scheduledAt > now + YEAR_MS) throw new Error("予定通知の時刻を確認してください");
    if (!title || !body || title.length > 160 || body.length > 1_500) throw new Error("通知本文を確認してください");
    unique.set(id, {
      id,
      scheduledAt: Math.floor(scheduledAt),
      title,
      body,
      tag: String(raw?.tag || id).slice(0, 180),
      url: String(raw?.url || "./index.html").slice(0, 500),
      date: String(raw?.date || "").slice(0, 20),
    });
  }
  return [...unique.values()].sort((a, b) => a.scheduledAt - b.scheduledAt);
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return cors(request, new Response(null, { status: 204 }));
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/v1/config") {
      if (!env.VAPID_PUBLIC_KEY) return cors(request, json({ error: "通知サーバーの公開鍵が未設定です" }, 503));
      return cors(request, json({ protocol: "mainichi.schedule-push.v1", vapidPublicKey: env.VAPID_PUBLIC_KEY }));
    }
    if (request.method === "POST" && url.pathname === "/v1/devices") {
      if (!env.SETUP_KEY) return cors(request, json({ error: "通知サーバーの初回キーが未設定です" }, 503));
      if (!sameText(request.headers.get("X-Mainichi-Setup-Key") || "", env.SETUP_KEY)) {
        return cors(request, json({ error: "初回セットアップキーが違います" }, 401));
      }
      const deviceId = crypto.randomUUID().replace(/-/g, "");
      const deviceSecret = randomSecret();
      const stub = env.SCHEDULE_REMINDERS.getByName(deviceId);
      const response = await stub.fetch(new Request("https://reminder.internal/init", {
        method: "POST",
        headers: JSON_TYPE,
        body: JSON.stringify({ secretHash: await digest(deviceSecret) }),
      }));
      if (!response.ok) return cors(request, response);
      return cors(request, json({ deviceId, deviceSecret }));
    }
    const match = url.pathname.match(/^\/v1\/devices\/([a-f0-9]{32})\/(subscribe|plan)$/i);
    if (!match || request.method !== "POST") return cors(request, json({ error: "見つかりません" }, 404));
    const [, deviceId, action] = match;
    const stub = env.SCHEDULE_REMINDERS.getByName(deviceId);
    // Requestをそのまま渡すと、認証で早期応答した場合に本文ストリームが残り、
    // Workerの実行終了時に例外になる。先に本文を一度だけ読み切ってDOへ渡す。
    const body = await request.arrayBuffer();
    const forwarded = new Request(`https://reminder.internal/${action}`, {
      method: request.method,
      headers: request.headers,
      body,
    });
    return cors(request, await stub.fetch(forwarded));
  },
};

export class ScheduleReminder extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.ctx = ctx;
    this.env = env;
    this.storage = ctx.storage;
  }

  async authorised(request) {
    const stored = await this.storage.get("secretHash");
    if (!stored) return false;
    const incoming = await digest(bearer(request));
    return sameText(stored, incoming);
  }

  async fetch(request) {
    const action = new URL(request.url).pathname.replace(/^\//, "");
    if (action === "init" && request.method === "POST") {
      const body = await request.json().catch(() => null);
      if (!body?.secretHash || await this.storage.get("secretHash")) return json({ error: "初期化できませんでした" }, 409);
      await this.storage.put("secretHash", String(body.secretHash));
      await this.storage.put("reminders", []);
      return json({ ok: true });
    }
    if (!(await this.authorised(request))) return json({ error: "端末の認証を確認してください" }, 401);
    if (action === "subscribe" && request.method === "POST") {
      const body = await request.json().catch(() => null);
      if (!validSubscription(body?.subscription)) return json({ error: "通知の受信情報を確認してください" }, 400);
      await this.storage.put("subscription", body.subscription);
      await this.storage.put("updatedAt", new Date().toISOString());
      return json({ ok: true });
    }
    if (action === "plan" && request.method === "POST") {
      const body = await request.json().catch(() => null);
      try {
        const reminders = normaliseReminders(body?.reminders);
        await this.storage.put("reminders", reminders);
        await this.storage.put("updatedAt", new Date().toISOString());
        await this.scheduleNext(reminders);
        return json({ ok: true, scheduled: reminders.length });
      } catch (error) {
        return json({ error: error?.message || "予定通知を保存できませんでした" }, 400);
      }
    }
    return json({ error: "見つかりません" }, 404);
  }

  async scheduleNext(reminders = null) {
    const list = reminders || (await this.storage.get("reminders")) || [];
    const next = list.find((item) => Number(item.scheduledAt) > Date.now());
    if (next) await this.storage.setAlarm(Number(next.scheduledAt));
    else await this.storage.deleteAlarm();
  }

  async alarm() {
    const reminders = ((await this.storage.get("reminders")) || []).sort((a, b) => a.scheduledAt - b.scheduledAt);
    const due = reminders.filter((item) => Number(item.scheduledAt) <= Date.now());
    if (!due.length) {
      await this.scheduleNext(reminders);
      return;
    }
    const subscription = await this.storage.get("subscription");
    if (!subscription) {
      await this.storage.put("lastError", "通知の受信登録がありません");
      await this.storage.put("reminders", reminders.filter((item) => !due.includes(item)));
      await this.scheduleNext();
      return;
    }
    webpush.setVapidDetails(this.env.VAPID_SUBJECT, this.env.VAPID_PUBLIC_KEY, this.env.VAPID_PRIVATE_KEY);
    try {
      for (const item of due) {
        await webpush.sendNotification(subscription, JSON.stringify({
          title: item.title,
          body: item.body,
          tag: item.tag,
          url: item.url,
          date: item.date,
        }), { TTL: 86_400, urgency: "high" });
      }
    } catch (error) {
      const status = Number(error?.statusCode || 0);
      if (status === 404 || status === 410) {
        await this.storage.delete("subscription");
        await this.storage.put("lastError", "通知の受信登録が期限切れです。アプリで通知サーバーを接続し直してください。");
        await this.storage.put("reminders", reminders.filter((item) => !due.includes(item)));
        await this.scheduleNext();
        return;
      }
      // 例外を残してDurable Objectの自動再試行（最大6回）へ渡す。
      throw error;
    }
    const remaining = reminders.filter((item) => !due.includes(item));
    await this.storage.put("reminders", remaining);
    await this.storage.put("lastDeliveredAt", new Date().toISOString());
    await this.storage.delete("lastError");
    await this.scheduleNext(remaining);
  }
}
