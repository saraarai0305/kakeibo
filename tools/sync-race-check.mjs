// 2台がほぼ同時に保存しても、どちらの記録も消えないかを試す（OpenSpec 変更 sync-no-lost-writes）。
// 使い方: node tools/sync-race-check.mjs index.html   （終了 0 = 全部通った／1 = どれかが落ちた）
//
// 2026-11-07 Codex が偽の同期先で再現した形（便 20261107-155652-6783）を、合格の条件の側から書き直した。
// アプリの本物の pushRemote などを端末ごとの箱で動かし、同期先は手元の偽物（外へは出ない・実データも鍵も使わない）。
// 偽の同期先は2つの形: 場面1・2は今の Gist と同じく「版を見ずに上書き」。場面3は直した後の約束（読みで版を返し、If-Match の違う書き込みを 409 で断る）。
// 保存先の案（design.md の A／B）が決まったら、場面3の約束をその形に合わせて直す。
// 直しが入るまでは落ちる。直しが入った時に tools/check.ps1 から呼ぶ。
import { readFileSync } from "node:fs";
import { createContext, runInContext } from "node:vm";

const [appPath] = process.argv.slice(2);
if (!appPath) { console.error("index.html の道を渡してください"); process.exit(2); }
const html = readFileSync(appPath, "utf8");
const start = html.indexOf("async function pushRemote(){");
const end = html.indexOf("function adoptSyncRemote(", start);
if (start < 0 || end <= start) { console.error("同期の処理が index.html に見つかりません"); process.exit(2); }
const functions = html.slice(start, end);
const GIST_FILE = "mainichi-data.json";
const copy = structuredClone;

// 偽の同期先。最初の2回の読みは、2台がそろって読み終わるまで返さない（同じ版を読んだ後に保存する場面を作る）
// strict: 直した後の約束の形（tasks 3.1）。読みは版（history[0].version）を返し、書き込みは If-Match に読んだ版を要る。
//   版が違う・If-Match が無い書き込みは 409 で断る（中身は変えない）。今の Gist は版を見ないので strict でない形が今の姿
function fakeStore(initial, { strict = false } = {}) {
  let head = copy(initial), version = 1;
  let reads = 0, release, rejected = 0;
  const bothRead = new Promise(resolve => { release = resolve; });
  return {
    head: () => copy(head),
    rejected: () => rejected,
    fetch: async (_path, opts) => {
      if (!opts || !opts.method) {
        const current = copy(head), v = version;
        if (++reads <= 2) { if (reads === 2) release(); await bothRead; }
        return { history: [{ version: String(v) }], files: { [GIST_FILE]: { content: JSON.stringify(current) } } };
      }
      if (strict) {
        const want = opts.headers && (opts.headers["If-Match"] || opts.headers["if-match"]);
        if (want !== String(version)) {
          rejected++;
          const e = new Error(want ? `版が違います（送った ${want}・今 ${version}）` : "If-Match が無い書き込みは受けません");
          e.status = 409; throw e;
        }
      }
      head = JSON.parse(JSON.parse(opts.body).files[GIST_FILE].content);
      version++;
      return { history: [{ version: String(version) }] };
    },
  };
}

function device(base, change, store) {
  const state = copy(base);
  change(state);
  state.savedAt = new Date(Date.now() + Math.random() * 1000).toISOString();
  const storage = new Map([["mainichi.sync-base", JSON.stringify(base)]]);
  const config = { token: "fake", gistId: "fake", role: "rw" };
  const messages = [];
  const context = createContext({
    GIST_FILE, KEY: "mainichi.v1", S: state,
    syncing: false, healthSyncing: false, staleBuild: false,
    gistFetch: store.fetch, bigDrop: () => false, normalize: data => data,
    syncCfg: () => config, setSyncCfg() {}, render() {}, toast() {},
    syncPaint: (status, message) => messages.push({ status, message }),
    localStorage: {
      getItem: key => storage.get(key),
      setItem: (key, value) => storage.set(key, value),
      removeItem: key => storage.delete(key),
    },
  });
  runInContext("const payload = () => JSON.stringify(S);\n" + functions, context);
  return { messages, push: () => runInContext("pushRemote()", context) };
}

const results = [];
async function scenario(name, run) {
  try { const ok = await run(); results.push([name, ok === true ? "通った" : "落ちた: " + ok]); }
  catch (e) { results.push([name, "落ちた: " + e.message]); }
}

const ids = list => (list || []).map(item => item.id).sort().join(",");

await scenario("別々の予定をほぼ同時に保存すると、両方が残る", async () => {
  const base = { plan: { "2099-01-01": [{ id: "base", text: "元" }] }, savedAt: "2099-01-01T00:00:00Z" };
  const store = fakeStore(base);
  const iphone = device(base, s => s.plan["2099-01-01"].push({ id: "iphone", text: "iPhone の試し" }), store);
  const pc = device(base, s => s.plan["2099-01-01"].push({ id: "pc", text: "PC の試し" }), store);
  await Promise.all([iphone.push(), pc.push()]);
  const got = ids(store.head().plan["2099-01-01"]);
  return got === "base,iphone,pc" || `同期先に残ったのは ${got}（両方に「${iphone.messages.at(-1)?.message}」「${pc.messages.at(-1)?.message}」と出た）`;
});

await scenario("同じ予定を2台で違う時刻にすると、どちらの値も黙って捨てない", async () => {
  const base = { plan: { "2099-01-02": [{ id: "e1", text: "試し", time: "09:00" }] }, savedAt: "2099-01-02T00:00:00Z" };
  const store = fakeStore(base);
  const iphone = device(base, s => { s.plan["2099-01-02"][0].time = "10:00"; }, store);
  const pc = device(base, s => { s.plan["2099-01-02"][0].time = "11:00"; }, store);
  await Promise.all([iphone.push(), pc.push()]);
  const head = store.head();
  const kept = new Set([head.plan["2099-01-02"]?.[0]?.time]);
  for (const c of head.syncConflicts || []) for (const v of [c.local, c.remote, ...(c.values || [])]) if (v && v.time) kept.add(v.time);
  return (kept.has("10:00") && kept.has("11:00")) || `残った時刻は ${[...kept].join("・")}（食い違いの退避 syncConflicts は ${head.syncConflicts ? "ある" : "無い"}）`;
});

await scenario("同期先が版の違う書き込みを断る時、断られた端末が読み直して送り直し、両方が残る", async () => {
  const base = { plan: { "2099-01-03": [{ id: "base", text: "元" }] }, savedAt: "2099-01-03T00:00:00Z" };
  const store = fakeStore(base, { strict: true });
  const iphone = device(base, s => s.plan["2099-01-03"].push({ id: "iphone", text: "iPhone の試し" }), store);
  const pc = device(base, s => s.plan["2099-01-03"].push({ id: "pc", text: "PC の試し" }), store);
  await Promise.all([iphone.push(), pc.push()]);
  const got = ids(store.head().plan["2099-01-03"]);
  return got === "base,iphone,pc" || `同期先に残ったのは ${got}（断った回数 ${store.rejected()}・両方に「${iphone.messages.at(-1)?.message}」「${pc.messages.at(-1)?.message}」と出た）`;
});

for (const [name, verdict] of results) console.log(`${verdict.startsWith("通った") ? "○" : "×"} ${name} … ${verdict}`);
process.exit(results.every(([, v]) => v === "通った") ? 0 : 1);
