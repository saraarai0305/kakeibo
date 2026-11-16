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
  headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type, If-Match, X-Mainichi-Setup-Key, X-Mainichi-Device-Id, X-Mainichi-Request-Id");
  headers.set("Access-Control-Expose-Headers", "ETag");
  headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
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

function validPairingId(value) {
  return /^[a-f0-9]{32}$/i.test(String(value || ""));
}

function validPairingEnvelope(value) {
  return Boolean(
    value &&
      typeof value.iv === "string" && value.iv.length >= 12 && value.iv.length <= 200 &&
      typeof value.ciphertext === "string" && value.ciphertext.length >= 24 && value.ciphertext.length <= 20_000,
  );
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

const DAILY_REPORT_FORMAT = "mainichi.daily-report.v1";
const MAX_DAILY_REPORT_BYTES = 64_000;
const MAX_PENDING_DAILY_REPORTS = 60;

function validDailyReport(value) {
  return Boolean(
    value &&
      value.format === DAILY_REPORT_FORMAT &&
      /^\d{4}-\d{2}-\d{2}$/.test(String(value.date || "")) &&
      Array.isArray(value.projects) && value.projects.length >= 1 && value.projects.length <= 30,
  );
}

function dailyReportInbox(env) {
  return env.DAILY_REPORT_INBOX.getByName("inbox");
}

// 端末どうしの同期の置き場（OpenSpec 変更 sync-no-lost-writes・社長 11-10「Cloudflare に移す案で進めてください」）。
// 1つの置き場に、アプリのデータ全体（JSON の字）と版の数を持つ。書き込みは読んだ版（If-Match）が今の版と同じ時だけ通し、
// 違えば 409 で断って今の中身を返す（断られた端末は足し合わせて送り直す）。同じ要求 ID の2回目は二重に入れない。
const MAX_SYNC_BYTES = 1_500_000;
const SYNC_KEEP_VERSIONS = 10;

function validRequestId(value) {
  return /^[A-Za-z0-9_-]{8,64}$/.test(String(value || ""));
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
    if (request.method === "POST" && url.pathname === "/v1/sync/pairings") {
      const sourceDeviceId = String(request.headers.get("X-Mainichi-Device-Id") || "");
      if (!validDeviceId(sourceDeviceId)) return cors(request, json({ error: "通知接続を確認してください" }, 401));
      const source = env.SCHEDULE_REMINDERS.getByName(sourceDeviceId);
      const check = await source.fetch(new Request("https://reminder.internal/auth-check", {
        method: "POST",
        headers: { Authorization: request.headers.get("Authorization") || "" },
      }));
      if (!check.ok) return cors(request, json({ error: "通知接続を確認してください" }, 401));
      const body = await request.json().catch(() => null);
      if (!validPairingEnvelope(body?.envelope) || !/^[A-Za-z0-9_-]{40,100}$/.test(String(body?.pairingSecretHash || ""))) return cors(request, json({ error: "接続コードの内容を確認してください" }, 400));
      const pairingId = crypto.randomUUID().replace(/-/g, "");
      const pairing = env.DEVICE_SYNC_PAIRINGS.getByName(pairingId);
      const response = await pairing.fetch(new Request("https://pairing.internal/init", {
        method: "POST",
        headers: JSON_TYPE,
        body: JSON.stringify({ secretHash: body.pairingSecretHash, envelope: body.envelope }),
      }));
      if (!response.ok) return cors(request, response);
      const made = await response.json().catch(() => ({}));
      return cors(request, json({ pairingId, expiresAt: made?.expiresAt || null }));
    }
    if (request.method === "POST" && url.pathname === "/v1/sync/pairings/join") {
      const body = await request.json().catch(() => null);
      const [pairingId, pairingSecret, ...extra] = String(body?.pairingCode || "").trim().split(".");
      if (extra.length || !validPairingId(pairingId) || !pairingSecret) return cors(request, json({ error: "接続コードの形式を確認してください" }, 400));
      const pairing = env.DEVICE_SYNC_PAIRINGS.getByName(pairingId);
      const response = await pairing.fetch(new Request("https://pairing.internal/join", {
        method: "POST",
        headers: { Authorization: `Bearer ${pairingSecret}` },
      }));
      return cors(request, response);
    }
    if (request.method === "POST" && url.pathname === "/v1/sync/spaces") {
      // 置き場を作れるのは、通知サーバーにつないだ端末だけ（端末の鍵で確かめる）。返す鍵は置き場の読み書きの鍵で、作った端末に一度だけ返す
      await request.arrayBuffer();
      const deviceId = String(request.headers.get("X-Mainichi-Device-Id") || "");
      if (!validDeviceId(deviceId)) return cors(request, json({ error: "端末の認証を確認してください" }, 401));
      const check = await env.SCHEDULE_REMINDERS.getByName(deviceId).fetch(new Request("https://reminder.internal/auth-check", {
        method: "POST",
        headers: { Authorization: request.headers.get("Authorization") || "" },
      }));
      if (!check.ok) return cors(request, json({ error: "端末の認証を確認してください" }, 401));
      const spaceId = crypto.randomUUID().replace(/-/g, "");
      const spaceSecret = randomSecret();
      const response = await env.SYNC_SPACES.getByName(spaceId).fetch(new Request("https://sync.internal/init", {
        method: "POST",
        headers: JSON_TYPE,
        body: JSON.stringify({ secretHash: await digest(spaceSecret) }),
      }));
      if (!response.ok) return cors(request, response);
      return cors(request, json({ spaceId, spaceSecret }));
    }
    const spaceMatch = url.pathname.match(/^\/v1\/sync\/spaces\/([a-f0-9]{32})\/state$/i);
    if (spaceMatch) {
      if (request.method !== "GET" && request.method !== "PUT") return cors(request, json({ error: "見つかりません" }, 404));
      const body = request.method === "PUT" ? await request.text() : undefined;
      const stub = env.SYNC_SPACES.getByName(spaceMatch[1].toLowerCase());
      return cors(request, await stub.fetch(new Request("https://sync.internal/state", {
        method: request.method,
        headers: {
          Authorization: request.headers.get("Authorization") || "",
          "If-Match": request.headers.get("If-Match") || "",
          "X-Mainichi-Request-Id": request.headers.get("X-Mainichi-Request-Id") || "",
        },
        body,
      })));
    }
    if (url.pathname === "/v1/daily-reports" && request.method === "POST") {
      // 送る側（PC の日報の送る道具）は、Worker の秘密の値 DAILY_REPORT_SENDER_KEY と同じ鍵で送る。
      // 本文は先に読み切る（読み残したまま早く応答すると、Worker の終わりに例外になる）
      const text = await request.text();
      if (!env.DAILY_REPORT_SENDER_KEY) return cors(request, json({ error: "日報の送る鍵が未設定です" }, 503));
      if (!sameText(bearer(request), env.DAILY_REPORT_SENDER_KEY)) return cors(request, json({ error: "日報の送る鍵が違います" }, 401));
      if (encoder.encode(text).length > MAX_DAILY_REPORT_BYTES) return cors(request, json({ error: "日報が大きすぎます" }, 413));
      let body = null;
      try { body = JSON.parse(text); } catch { body = null; }
      const report = body?.report || body;
      if (!validDailyReport(report)) return cors(request, json({ error: "日報の形式を確認してください" }, 400));
      return cors(request, await dailyReportInbox(env).fetch(new Request("https://inbox.internal/put", {
        method: "POST",
        headers: JSON_TYPE,
        body: JSON.stringify({ report }),
      })));
    }
    const reportMatch = url.pathname.match(/^\/v1\/daily-reports\/(?:pending|(\d{4}-\d{2}-\d{2})\/ack)$/);
    if (reportMatch) {
      // 読む側（アプリ）は、通知サーバーにつないだ端末の鍵で確かめる。受信箱が預かるのは日報 JSON だけ
      if (request.method === "POST") await request.arrayBuffer();
      const deviceId = String(request.headers.get("X-Mainichi-Device-Id") || "");
      if (!validDeviceId(deviceId)) return cors(request, json({ error: "端末の認証を確認してください" }, 401));
      const check = await env.SCHEDULE_REMINDERS.getByName(deviceId).fetch(new Request("https://reminder.internal/auth-check", {
        method: "POST",
        headers: { Authorization: request.headers.get("Authorization") || "" },
      }));
      if (!check.ok) return cors(request, json({ error: "端末の認証を確認してください" }, 401));
      const date = reportMatch[1];
      if (!date && request.method === "GET") return cors(request, await dailyReportInbox(env).fetch(new Request("https://inbox.internal/pending")));
      if (date && request.method === "POST") return cors(request, await dailyReportInbox(env).fetch(new Request(`https://inbox.internal/ack/${date}`, { method: "POST" })));
      return cors(request, json({ error: "見つかりません" }, 404));
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
    if (action === "auth-check" && request.method === "POST") return json({ ok: true });
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

// GitHubトークンをブラウザ間で平文送信しないための、一回限りの接続コード用保管庫。
// Workerには端末側でAES-GCM暗号化済みの小さな接続情報だけが保存される。
// コードは作ってから PAIRING_TTL_SECONDS（既定 30分）で切れ、1回つないだら消える（社長 11-16「両方進めてください」）。
const PAIRING_TTL_SECONDS_DEFAULT = 30 * 60;
export class DeviceSyncPairing extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.storage = ctx.storage;
    this.env = env;
  }

  ttlMs() {
    const seconds = Number(this.env?.PAIRING_TTL_SECONDS);
    return (Number.isFinite(seconds) && seconds >= 0 ? seconds : PAIRING_TTL_SECONDS_DEFAULT) * 1000;
  }

  async forget() {
    await this.storage.deleteAlarm();
    await this.storage.deleteAll();
  }

  async authorised(request) {
    const stored = await this.storage.get("secretHash");
    return Boolean(stored && sameText(stored, await digest(bearer(request))));
  }

  async fetch(request) {
    const action = new URL(request.url).pathname.replace(/^\//, "");
    if (action === "init" && request.method === "POST") {
      if (await this.storage.get("secretHash")) return json({ error: "接続コードを作成できませんでした" }, 409);
      const body = await request.json().catch(() => null);
      if (!body?.secretHash || !validPairingEnvelope(body?.envelope)) return json({ error: "接続コードの内容を確認してください" }, 400);
      const now = Date.now();
      await this.storage.put({ secretHash: String(body.secretHash), envelope: body.envelope, createdAt: new Date(now).toISOString() });
      await this.storage.setAlarm(now + this.ttlMs());
      return json({ ok: true, expiresAt: new Date(now + this.ttlMs()).toISOString() });
    }
    if (action !== "join" || request.method !== "POST" || !(await this.authorised(request))) {
      return json({ error: "接続コードを確認してください" }, 401);
    }
    const createdAt = Date.parse(String(await this.storage.get("createdAt") || ""));
    if (!Number.isFinite(createdAt) || Date.now() - createdAt >= this.ttlMs()) {
      await this.forget();
      return json({ error: "接続コードの期限が切れています" }, 410);
    }
    const envelope = await this.storage.get("envelope");
    await this.forget();   // 1回つないだら消す（同じコードの2回目は 401）
    if (!validPairingEnvelope(envelope)) return json({ error: "接続コードの内容を確認してください" }, 404);
    return json({ envelope });
  }

  async alarm() {
    await this.storage.deleteAll();
  }
}

// 秘書の日報を、社長のアプリが取り込むまで預かる受信箱。日付ごとに1件（同じ日を送り直すと置き換える）。
// 取り込んで確認済みになった日報は消す。端末全体のデータや同期の情報は預からない。
export class DailyReportInbox extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.storage = ctx.storage;
  }

  async pendingCount() {
    return (await this.storage.list({ prefix: "report:" })).size;
  }

  async fetch(request) {
    const path = new URL(request.url).pathname;
    if (path === "/put" && request.method === "POST") {
      const body = await request.json().catch(() => null);
      const report = body?.report;
      if (!validDailyReport(report)) return json({ error: "日報の形式を確認してください" }, 400);
      const key = `report:${report.date}`;
      const replaced = Boolean(await this.storage.get(key));
      if (!replaced && (await this.pendingCount()) >= MAX_PENDING_DAILY_REPORTS) return json({ error: "未確認の日報が多すぎます" }, 507);
      await this.storage.put(key, { report, receivedAt: new Date().toISOString() });
      return json({ ok: true, id: report.date, replaced, pending: await this.pendingCount() });
    }
    if (path === "/pending" && request.method === "GET") {
      const entries = await this.storage.list({ prefix: "report:" });
      const reports = [...entries.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => ({ id: key.slice("report:".length), report: value.report, receivedAt: value.receivedAt }));
      return json({ reports });
    }
    const ack = path.match(/^\/ack\/(\d{4}-\d{2}-\d{2})$/);
    if (ack && request.method === "POST") {
      const existed = await this.storage.delete(`report:${ack[1]}`);
      return json({ status: "imported", id: ack[1], existed, pending: await this.pendingCount() });
    }
    return json({ error: "見つかりません" }, 404);
  }
}

// 端末どうしの同期の置き場。版の比べと書き込みは1つの箱の中で順に行うので、2台が同じ版から書いても通るのは1台だけ。
// 置き場が持つのはアプリのデータの字・版・最後の要求 ID・直近の版の写し（戻すため）だけ。中身を読んで直すことはしない。
export class SyncSpace extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.storage = ctx.storage;
  }

  async authorised(request) {
    const stored = await this.storage.get("secretHash");
    return Boolean(stored && sameText(stored, await digest(bearer(request))));
  }

  async fetch(request) {
    const path = new URL(request.url).pathname;
    if (path === "/init" && request.method === "POST") {
      if (await this.storage.get("secretHash")) return json({ error: "置き場を作成できませんでした" }, 409);
      const body = await request.json().catch(() => null);
      if (!body?.secretHash) return json({ error: "置き場の内容を確認してください" }, 400);
      await this.storage.put({ secretHash: String(body.secretHash), version: 0, createdAt: new Date().toISOString() });
      return json({ ok: true });
    }
    if (path !== "/state") return json({ error: "見つかりません" }, 404);
    const content = request.method === "PUT" ? await request.text() : "";
    if (!(await this.authorised(request))) return json({ error: "同期の鍵を確認してください" }, 401);
    const version = (await this.storage.get("version")) || 0;
    if (request.method === "GET") {
      const current = await this.storage.get("content");
      const updatedAt = await this.storage.get("updatedAt");
      return json({ version, content: current ?? null, updatedAt: updatedAt || null }, 200, { ETag: `"${version}"` });
    }
    if (request.method !== "PUT") return json({ error: "見つかりません" }, 404);

    const requestId = request.headers.get("X-Mainichi-Request-Id") || "";
    if (!validRequestId(requestId)) return json({ error: "要求の ID を確認してください" }, 400);
    const last = await this.storage.get("lastWrite");
    // 応答が端末に届かずに同じ保存を送り直した時は、二重に入れずに前の結果を返す
    if (last && last.requestId === requestId) return json({ ok: true, version: last.version, duplicate: true }, 200, { ETag: `"${last.version}"` });
    const ifMatch = (request.headers.get("If-Match") || "").replace(/^W\//, "").replace(/"/g, "").trim();
    if (!/^\d+$/.test(ifMatch)) return json({ error: "読んだ版（If-Match）を付けてください" }, 428);
    if (Number(ifMatch) !== version) {
      // 別の端末が先に書いた。今の中身を返すので、端末は足し合わせて送り直す
      const current = await this.storage.get("content");
      return json({ error: "ほかの端末が先に保存しました", conflict: true, version, content: current ?? null }, 409, { ETag: `"${version}"` });
    }
    if (encoder.encode(content).length > MAX_SYNC_BYTES) return json({ error: "同期するデータが大きすぎます" }, 413);
    try { JSON.parse(content); } catch { return json({ error: "同期するデータの形式を確認してください" }, 400); }
    const next = version + 1;
    const previous = await this.storage.get("content");
    const writes = { version: next, content, updatedAt: new Date().toISOString(), lastWrite: { requestId, version: next } };
    if (previous != null) writes[`backup:${String(version).padStart(12, "0")}`] = previous;
    await this.storage.put(writes);
    const backups = await this.storage.list({ prefix: "backup:" });
    const extra = [...backups.keys()].sort().slice(0, Math.max(0, backups.size - SYNC_KEEP_VERSIONS));
    if (extra.length) await this.storage.delete(extra);
    return json({ ok: true, version: next }, 200, { ETag: `"${next}"` });
  }
}
