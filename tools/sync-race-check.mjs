// 2台がほぼ同時に保存しても、どちらの記録も消えないかを試す（OpenSpec 変更 sync-no-lost-writes）。
// 使い方:
//   node tools/sync-race-check.mjs index.html
//       … 同期の置き場は手元の偽物（外へは出ない・実データも鍵も使わない）
//   node tools/sync-race-check.mjs index.html --cloud http://127.0.0.1:8799 --setup-key local-test-setup-key
//       … 手元で立てた通知サーバー（push-server で wrangler dev --local）の本物の同期の置き場に当てる。127.0.0.1 と localhost だけ
// 終了 0 = 数える場面が全部通った／1 = どれかが落ちた。「参考」の場面は今の Gist の姿を見せるだけで、終了の値に数えない。
//
// 2026-11-07 Codex が偽の同期先で再現した形（便 20261107-155652-6783）を、合格の条件の側から書き直した。
// アプリの本物の pushRemote・syncRead・syncWrite などを端末ごとの箱で動かす。
// 偽の置き場は2つの形: gist＝今の Gist と同じく版を見ずに上書き／cloud＝通知サーバーの同期の置き場と同じ約束
// （読みで版を返し、If-Match が今の版と違う書き込みは 409 で断って今の中身を返す・push-server/src/worker.mjs の SyncSpace）。
import { readFileSync } from "node:fs";
import { createContext, runInContext } from "node:vm";

const args = process.argv.slice(2);
const flag = name => (args.includes(name) ? args[args.indexOf(name) + 1] : null);
const cloudUrl = flag("--cloud");
const setupKey = flag("--setup-key") || "local-test-setup-key";
const appPath = args.find((a, i) => !a.startsWith("--") && !["--cloud", "--setup-key"].includes(args[i - 1]));
if (!appPath) { console.error("index.html の道を渡してください"); process.exit(2); }
if (cloudUrl && !/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(cloudUrl)) { console.error("手元の通知サーバーだけで試します: " + cloudUrl); process.exit(2); }
const html = readFileSync(appPath, "utf8");
const start = html.indexOf("async function pushRemote(){");
const end = html.indexOf("function adoptSyncRemote(", start);
if (start < 0 || end <= start) { console.error("同期の処理が index.html に見つかりません"); process.exit(2); }
const functions = html.slice(start, end);
const GIST_FILE = "mainichi-data.json";
const copy = structuredClone;

// 最初の2回の読みは、2台がそろって読み終わるまで返さない（同じ版を読んだ後に保存する場面を作る）
function readBarrier() {
  let reads = 0, release;
  const both = new Promise(resolve => { release = resolve; });
  return async () => { if (++reads <= 2) { if (reads === 2) release(); await both; } };
}

function fakeGist(initial) {
  let head = copy(initial);
  const wait = readBarrier();
  return {
    rejected: () => 0,
    head: async () => copy(head),
    config: () => ({ token: "fake", gistId: "fake", role: "rw" }),
    gistFetch: async (_path, opts) => {
      if (!opts || !opts.method) {
        const current = copy(head);
        await wait();
        return { files: { [GIST_FILE]: { content: JSON.stringify(current) } } };
      }
      head = JSON.parse(JSON.parse(opts.body).files[GIST_FILE].content);
      return {};
    },
  };
}

const response = (status, body) => ({ status, ok: status >= 200 && status < 300, json: async () => copy(body) });
function fakeCloud(initial) {
  let content = JSON.stringify(initial), version = 1, rejected = 0, lastRequestId = null;
  const wait = readBarrier();
  return {
    rejected: () => rejected,
    head: async () => JSON.parse(content),
    config: () => ({ mode: "cloud", cloudBase: "http://fake.invalid", spaceId: "0".repeat(32), spaceSecret: "fake", role: "rw" }),
    fetch: async (_url, opts = {}) => {
      if ((opts.method || "GET") === "GET") {
        const snapshot = { version, content };
        await wait();
        return response(200, snapshot);
      }
      const h = opts.headers || {};
      if (h["X-Mainichi-Request-Id"] && h["X-Mainichi-Request-Id"] === lastRequestId) return response(200, { ok: true, version, duplicate: true });
      const want = String(h["If-Match"] || "").replace(/"/g, "");
      if (want !== String(version)) { rejected++; return response(409, { error: "ほかの端末が先に保存しました", conflict: true, version, content }); }
      content = opts.body; version++; lastRequestId = h["X-Mainichi-Request-Id"];
      return response(200, { ok: true, version });
    },
  };
}

// 手元で立てた通知サーバーの本物の置き場。端末をつなぎ、置き場を作り、元の中身を1回書いてから2台を動かす
async function realCloud(initial) {
  const call = async (path, opts) => { const r = await fetch(cloudUrl + path, opts); return { status: r.status, body: await r.json().catch(() => null) }; };
  const dev = await call("/v1/devices", { method: "POST", headers: { "X-Mainichi-Setup-Key": setupKey } });
  if (dev.status !== 200) throw new Error("通知サーバーに端末をつなげませんでした（状態 " + dev.status + "）");
  const space = await call("/v1/sync/spaces", { method: "POST", headers: { Authorization: `Bearer ${dev.body.deviceSecret}`, "X-Mainichi-Device-Id": dev.body.deviceId } });
  if (space.status !== 200) throw new Error("同期の置き場を作れませんでした（状態 " + space.status + "）");
  const cfg = { mode: "cloud", cloudBase: cloudUrl, spaceId: space.body.spaceId, spaceSecret: space.body.spaceSecret, role: "rw" };
  const statePath = `/v1/sync/spaces/${cfg.spaceId}/state`, auth = { Authorization: `Bearer ${cfg.spaceSecret}` };
  const put = await call(statePath, { method: "PUT", headers: { ...auth, "If-Match": '"0"', "X-Mainichi-Request-Id": "race-check-initial-" + Date.now() }, body: JSON.stringify(initial) });
  if (put.status !== 200) throw new Error("元の中身を書けませんでした（状態 " + put.status + "）");
  const wait = readBarrier();
  let rejected = 0;
  return {
    rejected: () => rejected,
    head: async () => JSON.parse((await call(statePath, { headers: auth })).body.content),
    config: () => ({ ...cfg }),
    fetch: async (url, opts = {}) => {
      const r = await fetch(url, opts);
      const body = await r.json().catch(() => null);
      if ((opts.method || "GET") === "GET") await wait();
      if (r.status === 409) rejected++;
      return response(r.status, body);
    },
  };
}

function device(base, change, store) {
  const state = copy(base);
  change(state);
  state.savedAt = new Date(Date.now() + Math.random() * 1000).toISOString();
  const storage = new Map([["mainichi.sync-base", JSON.stringify(base)]]);
  const config = store.config();
  const messages = [];
  const context = createContext({
    GIST_FILE, KEY: "mainichi.v1", S: state, crypto: globalThis.crypto,
    syncing: false, healthSyncing: false, staleBuild: false,
    gistFetch: store.gistFetch || (async () => { throw new Error("Gist には行かない"); }),
    fetch: store.fetch || (async () => { throw new Error("同期の置き場には行かない"); }),
    bigDrop: () => false, normalize: data => data,
    syncCfg: () => config, setSyncCfg() {}, render() {}, toast() {},
    syncPaint: (status, message) => messages.push({ status, message }),
    localStorage: {
      getItem: key => storage.get(key),
      setItem: (key, value) => storage.set(key, value),
      removeItem: key => storage.delete(key),
    },
  });
  runInContext("const payload = () => JSON.stringify(S);\n" + functions, context);
  return { messages, push: () => runInContext("pushRemote()", context), state: () => runInContext("S", context) };
}

const results = [];
async function scenario(name, run, { reference = false } = {}) {
  try { const ok = await run(); results.push([name, ok === true ? "通った" : "落ちた: " + ok, reference]); }
  catch (e) { results.push([name, "落ちた: " + e.message, reference]); }
}

const ids = list => (list || []).map(item => item.id).sort().join(",");
const cloudStore = initial => (cloudUrl ? realCloud(initial) : fakeCloud(initial));
const where = cloudUrl ? "手元の通知サーバー" : "偽の置き場";
const twoPlans = day => ({ plan: { [day]: [{ id: "base", text: "元" }] }, savedAt: `${day}T00:00:00Z` });
const addPlan = (day, id, text) => s => s.plan[day].push({ id, text });

await scenario("参考・今の Gist: 別々の予定をほぼ同時に保存すると、片方が消える", async () => {
  const day = "2099-01-01", base = twoPlans(day), store = fakeGist(base);
  const iphone = device(base, addPlan(day, "iphone", "iPhone の試し"), store);
  const pc = device(base, addPlan(day, "pc", "PC の試し"), store);
  await Promise.all([iphone.push(), pc.push()]);
  const got = ids((await store.head()).plan[day]);
  return got === "base,iphone,pc" || `同期先に残ったのは ${got}（Gist は版を見ないので、Gist のままでは落ちる）`;
}, { reference: true });

await scenario(`同期の置き場（${where}）: 別々の予定をほぼ同時に保存すると、両方が残る`, async () => {
  const day = "2099-01-03", base = twoPlans(day), store = await cloudStore(base);
  const iphone = device(base, addPlan(day, "iphone", "iPhone の試し"), store);
  const pc = device(base, addPlan(day, "pc", "PC の試し"), store);
  await Promise.all([iphone.push(), pc.push()]);
  const got = ids((await store.head()).plan[day]);
  if (store.rejected() < 1) return `置き場が1回も断っていない（同時の場面になっていない）・残ったのは ${got}`;
  return got === "base,iphone,pc" || `同期先に残ったのは ${got}（断った回数 ${store.rejected()}・「${iphone.messages.at(-1)?.message}」「${pc.messages.at(-1)?.message}」）`;
});

await scenario(`同期の置き場（${where}）: 断られた端末の手元に、両方の予定が入る`, async () => {
  const day = "2099-01-04", base = twoPlans(day), store = await cloudStore(base);
  const iphone = device(base, addPlan(day, "iphone", "iPhone の試し"), store);
  const pc = device(base, addPlan(day, "pc", "PC の試し"), store);
  await Promise.all([iphone.push(), pc.push()]);
  const a = ids(iphone.state().plan[day]), b = ids(pc.state().plan[day]);
  // 先に通った端末は次の受け取りで相手の分が入る。断られた端末は、その場で両方を持つ
  return a === "base,iphone,pc" || b === "base,iphone,pc" || `iPhone ${a}・PC ${b}`;
});

await scenario(`同期の置き場（${where}）: 同じ予定を2台で違う時刻にすると、どちらの値も黙って捨てない`, async () => {
  const day = "2099-01-02";
  const base = { plan: { [day]: [{ id: "e1", text: "試し", time: "09:00" }] }, savedAt: `${day}T00:00:00Z` };
  const store = await cloudStore(base);
  const iphone = device(base, s => { s.plan[day][0].time = "10:00"; }, store);
  const pc = device(base, s => { s.plan[day][0].time = "11:00"; }, store);
  await Promise.all([iphone.push(), pc.push()]);
  const head = await store.head();
  const kept = new Set([head.plan[day]?.[0]?.time]);
  for (const c of head.syncConflicts || []) for (const v of [c.local, c.remote, ...(c.values || [])]) if (v && v.time) kept.add(v.time);
  return (kept.has("10:00") && kept.has("11:00")) || `残った時刻は ${[...kept].join("・")}（食い違いの退避 syncConflicts は ${head.syncConflicts ? "ある" : "無い"}・tasks 3.2 で直す）`;
});

for (const [name, verdict, reference] of results) console.log(`${verdict.startsWith("通った") ? "○" : reference ? "－" : "×"} ${name} … ${verdict}`);
process.exit(results.every(([, v, reference]) => reference || v === "通った") ? 0 : 1);
