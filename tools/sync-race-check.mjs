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
// 日報の取り込み（pushImportedWorkLog）まで入れる。adoptSyncRemote は手元を置き換えて描き直すだけ（render・toast は空の箱）
const end = html.indexOf("async function pullRemote(", start);
if (start < 0 || end <= start) { console.error("同期の処理が index.html に見つかりません"); process.exit(2); }
// 件数（richness）は同期の処理より前にある＝移す処理の件数の照らし合わせのために足す
const richStart = html.indexOf("function richness(o){"), richEnd = html.indexOf("// 記録が大きく減る", richStart);
if (richStart < 0 || richEnd <= richStart) { console.error("richness が index.html に見つかりません"); process.exit(2); }
const functions = html.slice(richStart, richEnd) + "\n" + html.slice(start, end);
const GIST_FILE = "mainichi-data.json";
const copy = structuredClone;

const noWait = async () => {};
// 最初の2回の読みは、2台がそろって読み終わるまで返さない（同じ版を読んだ後に保存する場面を作る）
function readBarrier() {
  let reads = 0, release;
  const both = new Promise(resolve => { release = resolve; });
  return async () => { if (++reads <= 2) { if (reads === 2) release(); await both; } };
}

function fakeGist(initial, { barrier = true } = {}) {
  let head = copy(initial), writes = 0;
  const wait = barrier ? readBarrier() : noWait;
  return {
    rejected: () => 0, writes: () => writes,
    set: data => { head = copy(data); },   // 古い版のアプリが Gist に書いた（移した後の場面）
    head: async () => copy(head),
    config: () => ({ token: "fake", gistId: "fake", role: "rw" }),
    gistFetch: async (_path, opts) => {
      if (!opts || !opts.method) {
        const current = copy(head);
        await wait();
        return { files: { [GIST_FILE]: { content: JSON.stringify(current) } } };
      }
      head = JSON.parse(JSON.parse(opts.body).files[GIST_FILE].content); writes++;
      return {};
    },
  };
}

const response = (status, body) => ({ status, ok: status >= 200 && status < 300, json: async () => copy(body) });
// barrier:false＝1台だけで動かす場面（最初の2回の読みを待ち合わせない）
// initial が null＝まだ何も書いていない置き場（版 0）。POST /v1/sync/spaces は新しい空の置き場を作る（移す場面）
function fakeCloud(initial, { barrier = true } = {}) {
  let content = initial == null ? null : JSON.stringify(initial), version = initial == null ? 0 : 1, rejected = 0, lastRequestId = null, created = 0;
  const wait = barrier ? readBarrier() : noWait;
  return {
    rejected: () => rejected, created: () => created,
    head: async () => JSON.parse(content),
    config: () => ({ mode: "cloud", cloudBase: "http://fake.invalid", spaceId: "0".repeat(32), spaceSecret: "fake", role: "rw" }),
    pushCfg: () => ({ url: "http://fake.invalid", deviceId: "fake-device", deviceSecret: "fake-device-secret" }),
    fetch: async (url, opts = {}) => {
      if (opts.method === "POST" && String(url).endsWith("/v1/sync/spaces")) {
        if ((opts.headers || {})["Authorization"] !== "Bearer fake-device-secret") return response(401, { error: "端末の認証を確認してください" });
        content = null; version = 0; lastRequestId = null; created++;
        return response(200, { spaceId: "1".repeat(32), spaceSecret: "fake-space-secret" });
      }
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
async function realCloud(initial, { barrier = true } = {}) {
  const call = async (path, opts) => { const r = await fetch(cloudUrl + path, opts); return { status: r.status, body: await r.json().catch(() => null) }; };
  const dev = await call("/v1/devices", { method: "POST", headers: { "X-Mainichi-Setup-Key": setupKey } });
  if (dev.status !== 200) throw new Error("通知サーバーに端末をつなげませんでした（状態 " + dev.status + "）");
  const space = await call("/v1/sync/spaces", { method: "POST", headers: { Authorization: `Bearer ${dev.body.deviceSecret}`, "X-Mainichi-Device-Id": dev.body.deviceId } });
  if (space.status !== 200) throw new Error("同期の置き場を作れませんでした（状態 " + space.status + "）");
  const cfg = { mode: "cloud", cloudBase: cloudUrl, spaceId: space.body.spaceId, spaceSecret: space.body.spaceSecret, role: "rw" };
  const statePath = `/v1/sync/spaces/${cfg.spaceId}/state`, auth = { Authorization: `Bearer ${cfg.spaceSecret}` };
  const put = await call(statePath, { method: "PUT", headers: { ...auth, "If-Match": '"0"', "X-Mainichi-Request-Id": "race-check-initial-" + Date.now() }, body: JSON.stringify(initial) });
  if (put.status !== 200) throw new Error("元の中身を書けませんでした（状態 " + put.status + "）");
  const wait = barrier ? readBarrier() : noWait;
  let rejected = 0;
  return {
    rejected: () => rejected,
    head: async () => JSON.parse((await call(statePath, { headers: auth })).body.content),
    config: () => ({ ...cfg }),
    pushCfg: () => ({ url: cloudUrl, deviceId: dev.body.deviceId, deviceSecret: dev.body.deviceSecret }),
    created: () => 0,
    fetch: async (url, opts = {}) => {
      const r = await fetch(url, opts);
      const body = await r.json().catch(() => null);
      if ((opts.method || "GET") === "GET") await wait();
      if (r.status === 409) rejected++;
      return response(r.status, body);
    },
  };
}

// 端末1台。手元の保存（localStorage）は storage の Map。kept を渡すと、その保存から開き直した端末になる
// （閉じて開き直した場面: 中身は "mainichi.v1"、前にそろえた姿は "mainichi.sync-base" から読む＝アプリの起動と同じ）
// gist＝Gist の偽物（移す・戻す場面で、置き場と両方につないだ端末）。config＝同期の設定を丸ごと渡す（setSyncCfg で変わる）
function device(base, change, store, { role, kept, gist, config: given } = {}) {
  const storage = kept ? new Map(kept) : new Map([["mainichi.sync-base", JSON.stringify(base)]]);
  let state;
  if (kept) state = JSON.parse(kept.get("mainichi.v1"));
  else {
    state = copy(base);
    change(state);
    state.savedAt = new Date(Date.now() + Math.random() * 1000).toISOString();
    storage.set("mainichi.v1", JSON.stringify(state)); // アプリは保存（persistNow）で手元に書いてから送る
  }
  let config = given ? copy(given) : { ...store.config(), ...(role ? { role } : {}) };
  const messages = [];
  let scheduled = 0;
  const context = createContext({
    GIST_FILE, KEY: "mainichi.v1", S: state, crypto: globalThis.crypto,
    syncing: false, healthSyncing: false, staleBuild: false,
    gistFetch: (gist || store).gistFetch || (async () => { throw new Error("Gist には行かない"); }),
    fetch: store.fetch || (async () => { throw new Error("同期の置き場には行かない"); }),
    bigDrop: () => false, normalize: data => data,
    syncCfg: () => copy(config), setSyncCfg: c => { config = copy(c); }, render() {}, toast() {},
    schedulePush: () => { scheduled++; },
    clearWorkLogSyncPending: () => storage.delete("mainichi.pending-work-log-sync"),
    syncPaint: (status, message) => messages.push({ status, message }),
    localStorage: {
      getItem: key => storage.get(key),
      setItem: (key, value) => storage.set(key, value),
      removeItem: key => storage.delete(key),
    },
  });
  runInContext("const payload = () => JSON.stringify(S);\n" + functions, context);
  return {
    messages, storage, scheduled: () => scheduled, config: () => copy(config),
    call: (code, value) => { context.__args = copy(value); return runInContext(code, context); },
    push: () => runInContext("pushRemote()", context),
    importWorkLog: (day, record) => { context.__args = copy([day, record]); return runInContext("pushImportedWorkLog(...__args)", context); },
    state: () => runInContext("S", context), run: code => runInContext(code, context),
  };
}
const reopen = (old, store) => device(null, null, store, { kept: old.storage });

// 端末ごとの通り道。置き場は同じまま、送る（PUT）前後に手を入れる
//   before: 送る前（待たせる・回線が切れて届かない＝投げる・送信中に手元を変える）
//   after:  置き場に入った後（応答が途中で消えた＝投げる）
function route(store, { before, after } = {}) {
  return { ...store, fetch: async (url, opts = {}) => {
    const put = (opts.method || "GET") === "PUT";
    if (put && before) await before();
    const r = await store.fetch(url, opts);
    if (put && after) await after(r);
    return r;
  } };
}
const once = fn => { let done = false; return async (...a) => { if (!done) { done = true; return fn(...a); } }; };
const later = ms => () => new Promise(resolve => setTimeout(resolve, ms));

const results = [];
async function scenario(name, run, { reference = false } = {}) {
  try { const ok = await run(); results.push([name, ok === true ? "通った" : "落ちた: " + ok, reference]); }
  catch (e) { results.push([name, "落ちた: " + e.message, reference]); }
}

const ids = list => (list || []).map(item => item.id).sort().join(",");
const cloudStore = (initial, opts) => (cloudUrl ? realCloud(initial, opts) : fakeCloud(initial, opts));
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
  const noise = ((await store.head()).syncConflicts || []).length;
  if (noise) return `別々の予定なのに食い違いを ${noise} 件作った（知らせが鳴りっぱなしになる）`;
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

await scenario(`同期の置き場（${where}）: 食い違いで退避した値を選ぶと、その値になって退避が消え、同期先にも届く`, async () => {
  const day = "2099-01-05";
  const base = { plan: { [day]: [{ id: "e1", text: "試し", time: "09:00" }] }, savedAt: `${day}T00:00:00Z` };
  const store = await cloudStore(base);
  await Promise.all([
    device(base, s => { s.plan[day][0].time = "10:00"; }, store).push(),
    device(base, s => { s.plan[day][0].time = "11:00"; }, store).push(),
  ]);
  const head = await store.head();
  const list = head.syncConflicts || [];
  if (list.length !== 1) return `食い違いの退避が ${list.length} 件（1件のはず）`;
  const now = head.plan[day][0].time, saved = list[0].values?.[1]?.time;
  if (!saved || saved === now) return `退避した値 ${saved}・いま使っている値 ${now}`;
  // 同期先の中身をそろえた姿として持つ3台目で選ぶ（選ぶのはどちらの端末でもよい）
  const third = device(head, () => {}, store);
  if (third.run(`applySyncConflictChoice(S, ${JSON.stringify(list[0].id)}, 1)`) !== true) return "選べなかった";
  await third.push();
  const after = await store.head();
  if (after.plan[day][0].time !== saved) return `選んだ後の同期先の時刻は ${after.plan[day][0].time}（${saved} のはず）`;
  return (after.syncConflicts || []).length === 0 || `選んだ後も退避が ${(after.syncConflicts || []).length} 件残った`;
});

// ここから 1.2（2026-11-14・便 20261114-040324-1324）: 送信中の追加・応答が消えた時・閉じて開き直した時・
// 日報の取り込みと打刻の重なり・読み取り専用
const solo = { barrier: false };
const workBase = day => ({
  plan: {}, workLogs: {}, savedAt: `${day}T00:00:00Z`,
  workProjects: [{ id: "p1", name: "試しの案件", color: "#7AA7F0", note: "" }],
  areas: [{ id: "p1", label: "試しの案件", color: "#7AA7F0", urgent: false, note: "" }],
});
const REPORT_TEXT = "日報の中身（試し）";
// 日報の取り込みが作る記録の形（ui-v2.js の importedRecord・その日に打刻が無い端末で取り込んだ時）
const report = { projectIds: ["p1"], projectNames: { p1: "試しの案件" }, projectId: "p1", project: "試しの案件", workDescriptions: { p1: REPORT_TEXT }, breakMinutes: 0, actualWorkMinutes: null };
const clockIn = day => s => { s.workLogs[day] = { start: "09:00", workSessions: [{ start: "09:00", end: "" }] }; };
const conflictsOf = head => (head.syncConflicts || []).map(c => c.path.concat(c.fields.map(f => f.join("."))).join("/"));

await scenario(`同期の置き場（${where}）: 送っている間に足した予定は、手元に残り、次の送信で届く`, async () => {
  const day = "2099-02-01", base = twoPlans(day), store = await cloudStore(base, solo);
  let phone;
  const r = route(store, { before: once(async () => phone.run(`S.plan["${day}"].push({ id: "late", text: "送信中に足した" })`)) });
  phone = device(base, addPlan(day, "first", "先の予定"), r);
  await phone.push();
  if (!ids(phone.state().plan[day]).includes("late")) return "送信中に足した予定が手元から消えた";
  await phone.push();
  const got = ids((await store.head()).plan[day]);
  return got === "base,first,late" || `同期先に残ったのは ${got}`;
});

await scenario(`同期の置き場（${where}）: 日報を取り込んで送っている間に足した予定は、手元に残り、次の送信で届く`, async () => {
  const day = "2099-02-02", base = workBase(day), store = await cloudStore(base, solo);
  let pc;
  const r = route(store, { before: once(async () => pc.run(`S.plan["${day}"] = [{ id: "late", text: "取り込み中に足した" }]`)) });
  pc = device(base, s => { s.workLogs[day] = copy(report); }, r);
  const res = await pc.importWorkLog(day, report);
  if (!res.ok) return "取り込みが通らなかった: " + (res.error && res.error.message);
  if (!ids(pc.state().plan[day]).includes("late")) return "取り込みの送信中に足した予定が手元から消えた（送り終わりに、送った姿で手元を置き換えた）";
  await pc.push();
  const head = await store.head();
  if (head.workLogs[day]?.workDescriptions?.p1 !== REPORT_TEXT) return "日報の中身が同期先に無い";
  return ids(head.plan[day]) === "late" || `同期先の予定は ${ids(head.plan[day]) || "無し"}`;
});

await scenario(`同期の置き場（${where}）: 保存が入った後に応答が消えても、送り直しで二重にならず、食い違いも作らない`, async () => {
  const day = "2099-02-03", base = twoPlans(day), store = await cloudStore(base, solo);
  const r = route(store, { after: once(async res => { if (res.status === 200) throw new TypeError("応答が途中で消えた（試し）"); }) });
  const phone = device(base, addPlan(day, "phone", "iPhone の試し"), r);
  await phone.push();
  if (phone.messages.at(-1)?.status !== "err") return `応答が消えたのに「${phone.messages.at(-1)?.message}」と出した`;
  await phone.push();
  const head = await store.head(), got = (head.plan[day] || []).map(x => x.id).sort().join(",");
  if (got !== "base,phone") return `同期先の予定は ${got}`;
  if (conflictsOf(head).length) return `食い違いを作った: ${conflictsOf(head).join("・")}`;
  return phone.messages.at(-1)?.status === "ok" || `送り直しの後の表示は「${phone.messages.at(-1)?.message}」`;
});

await scenario(`同期の置き場（${where}）: 日報の取り込みで応答が消えても、取り込み直しで案件も中身も二重にならない`, async () => {
  const day = "2099-02-04", base = workBase(day), store = await cloudStore(base, solo);
  const r = route(store, { after: once(async res => { if (res.status === 200) throw new TypeError("応答が途中で消えた（試し）"); }) });
  const pc = device(base, s => { s.workLogs[day] = copy(report); }, r);
  if ((await pc.importWorkLog(day, report)).ok) return "応答が消えたのに反映したことにした";
  const again = await pc.importWorkLog(day, report);
  if (!again.ok) return "取り込み直しが通らなかった: " + (again.error && again.error.message);
  const head = await store.head();
  if (head.workLogs[day]?.workDescriptions?.p1 !== REPORT_TEXT) return "日報の中身が同期先に無い";
  if (head.workProjects.length !== 1 || head.areas.length !== 1) return `案件 ${head.workProjects.length}・分野 ${head.areas.length}（1つずつのはず）`;
  return conflictsOf(head).length === 0 || `食い違いを作った: ${conflictsOf(head).join("・")}`;
});

await scenario(`同期の置き場（${where}）: 足し合わせた後に回線が切れてアプリを閉じても、開き直して送れば両方の予定が届く`, async () => {
  const day = "2099-02-05", base = twoPlans(day), store = await cloudStore(base, solo);
  await device(base, addPlan(day, "pc", "PC の試し"), store).push();
  const r = route(store, { before: once(async () => { throw new TypeError("回線が切れた（試し）"); }) });
  const phone = device(base, addPlan(day, "phone", "iPhone の試し"), r);
  await phone.push(); // 読む → PC の予定と足し合わせる → 送る所で切れる
  if (ids((await store.head()).plan[day]).includes("phone")) return "回線が切れたのに届いた（場面になっていない）";
  const again = reopen(phone, store);
  await again.push();
  const head = await store.head(), got = ids(head.plan[day]);
  if (got !== "base,pc,phone") return `同期先に残ったのは ${got}`;
  return conflictsOf(head).length === 0 || `食い違いを作った: ${conflictsOf(head).join("・")}`;
});

for (const first of ["iPhone の打刻", "PC の日報の取り込み"]) {
  await scenario(`同期の置き場（${where}）: 日報の取り込みと iPhone の打刻が重なっても（${first}が先に入る）、時刻は iPhone・中身は日報で、食い違いを作らない`, async () => {
    const day = first.startsWith("iPhone") ? "2099-02-06" : "2099-02-07", base = workBase(day), store = await cloudStore(base);
    const slow = route(store, { before: later(40) }), phoneFirst = first.startsWith("iPhone");
    const iphone = device(base, clockIn(day), phoneFirst ? store : slow);
    const pc = device(base, s => { s.workLogs[day] = copy(report); }, phoneFirst ? slow : store);
    const [, res] = await Promise.all([iphone.push(), pc.importWorkLog(day, report)]);
    if (!res.ok) return "取り込みが通らなかった: " + (res.error && res.error.message);
    if (store.rejected() < 1) return "置き場が1回も断っていない（重なりの場面になっていない）";
    const head = await store.head(), w = head.workLogs[day] || {};
    if (w.start !== "09:00" || (w.workSessions || []).length !== 1) return `打刻が残っていない（開始 ${w.start}）`;
    if (w.workDescriptions?.p1 !== REPORT_TEXT) return "日報の中身が残っていない";
    return conflictsOf(head).length === 0 || `決まりで決まる時刻なのに食い違いを作った: ${conflictsOf(head).join("・")}`;
  });
}

await scenario(`同期の置き場（${where}）: 2台とも打刻して開始の時刻が違う時は、今までどおり食い違いとして両方残す`, async () => {
  const day = "2099-02-09", base = workBase(day), store = await cloudStore(base);
  const at = t => s => { s.workLogs[day] = { start: t, workSessions: [{ start: t, end: "" }] }; };
  await Promise.all([device(base, at("09:00"), store).push(), device(base, at("09:30"), store).push()]);
  const head = await store.head(), kept = new Set([head.workLogs[day]?.start]);
  for (const c of head.syncConflicts || []) for (const v of c.values || []) if (v && v.start) kept.add(v.start);
  return (kept.has("09:00") && kept.has("09:30")) || `残った開始の時刻は ${[...kept].join("・")}（食い違い ${conflictsOf(head).join("・") || "無し"}）`;
});

await scenario(`同期の置き場（${where}）: 読み取り専用の端末は、送りも取り込みの反映もせず、手元の記録も消さない`, async () => {
  const day = "2099-02-08", base = workBase(day), store = await cloudStore(base, solo);
  const ro = device(base, s => { s.plan[day] = [{ id: "ro", text: "読み取り専用で足した" }]; s.workLogs[day] = copy(report); }, store, { role: "ro" });
  await ro.push();
  const res = await ro.importWorkLog(day, report);
  const head = await store.head();
  if (head.plan[day] || head.workLogs[day]) return "読み取り専用の端末が同期先を書き換えた";
  if (!res.skipped) return "取り込みの反映を読み取り専用で止めなかった";
  return ids(ro.state().plan[day]) === "ro" || "読み取り専用の端末の手元の記録が消えた";
});

// ── Gist から置き場へ移す・戻す（tasks 3.3・3.4・design.md「Gist から置き場へ移す・戻す」） ──
// 端末は Gist（偽物）と置き場の両方につなぐ。最初は Gist の設定だけ（今の iPhone の姿）。移す前に送っていない記録を1つ持つ
const MOVE_DAY = "2099-03-01";
const moveBase = () => ({ plan: { [MOVE_DAY]: [{ id: "base", text: "元" }] }, spends: [{ id: "s-base", amt: 100 }], savedAt: `${MOVE_DAY}T00:00:00Z` });
const GIST_CFG = { token: "fake", gistId: "fake", role: "rw" };
async function moveSetup(phoneRoute) {
  const base = moveBase(), gist = fakeGist(base, solo), store = await cloudStore(cloudUrl ? {} : null, solo);
  const unsent = s => { s.plan[MOVE_DAY].push({ id: "iphone", text: "移す前に iPhone で足した" }); s.spends.push({ id: "s-iphone", amt: 200 }); };
  const phone = device(base, unsent, phoneRoute ? route(store, phoneRoute) : store, { gist, config: GIST_CFG });
  return { base, gist, store, phone };
}
const readSpace = dev => dev.run("syncRead(syncCfg()).then(r => r.data)");
const addNow = (dev, id) => dev.run(`S.plan["${MOVE_DAY}"].push({ id: "${id}", text: "${id}" }); S.savedAt = new Date().toISOString();`);

await scenario(`移す（${where}）: Gist とこの端末の未送信をそろえて置き場に書き、Gist は書き換えず、退避を残してから設定を変える。移した後の保存は置き場へ届く`, async () => {
  const { base, gist, store, phone } = await moveSetup();
  // 移す前に、ほかの端末が Gist に書いていた（この端末はまだ受け取っていない）
  const elsewhere = copy(base); elsewhere.plan[MOVE_DAY].push({ id: "gist-only", text: "ほかの端末で足した" }); elsewhere.savedAt = new Date().toISOString();
  gist.set(elsewhere);
  const res = await phone.call("moveSyncToCloud(__args)", store.pushCfg());
  const cfg = phone.config();
  if (cfg.mode !== "cloud" || !cfg.spaceId || !cfg.spaceSecret) return `設定が置き場になっていない: mode=${cfg.mode}`;
  if (cfg.token !== "fake" || cfg.gistId !== "fake") return "Gist の鍵を消した（戻せない・古い版の書き込みを拾えない）";
  const head = await readSpace(phone);
  if (ids(head.plan[MOVE_DAY]) !== "base,gist-only,iphone" || ids(head.spends) !== "s-base,s-iphone") return `置き場の中身が違う: 予定 ${ids(head.plan[MOVE_DAY])}・支出 ${ids(head.spends)}`;
  if (gist.writes() !== 0) return `Gist を ${gist.writes()} 回書き換えた`;
  const saved = JSON.parse(phone.storage.get("mainichi.before-cloud") || "null");
  if (!saved || !saved.at || saved.count !== 1 || ids(saved.content?.plan?.[MOVE_DAY]) !== "base,gist-only") return "移す前の Gist の写し（時刻・件数・中身）が手元に無い";
  if (res.count !== 2 || res.savedCount !== 1) return `結果の件数が違う: 置き場 ${res.count}・退避 ${res.savedCount}`;
  addNow(phone, "after");
  await phone.push();
  const after = await readSpace(phone);
  if (gist.writes() !== 0) return "移した後の保存が Gist に行った";
  return ids(after.plan[MOVE_DAY]) === "after,base,gist-only,iphone" || `移した後の保存が置き場に届かない: ${ids(after.plan[MOVE_DAY])}`;
});

await scenario(`移す（${where}）: 置き場に書く所で回線が切れたら、設定を変えずに止まり、今までの Gist の同期のまま送れる`, async () => {
  const { gist, store, phone } = await moveSetup({ before: once(async () => { throw new Error("回線が切れた（試し）"); }) });
  let threw = null;
  try { await phone.call("moveSyncToCloud(__args)", store.pushCfg()); } catch (e) { threw = e.message; }
  if (!threw) return "途中で止まったのに、移したことになった";
  const cfg = phone.config();
  if (cfg.mode || cfg.spaceId) return `止まったのに設定が置き場になった（${threw}）`;
  if (gist.writes() !== 0) return "止まる前に Gist を書き換えた";
  if (ids(phone.state().plan[MOVE_DAY]) !== "base,iphone") return "止まった時に手元の未送信が消えた";
  await phone.push();
  return ids((await gist.head()).plan[MOVE_DAY]) === "base,iphone" || "止まった後の Gist の同期で、未送信が届かない";
});

await scenario(`移した後（${where}）: 古い版のアプリが Gist に書いた分を拾って置き場へ運び、移した後の手元の記録も消さない。2回目は二重に拾わない`, async () => {
  const { base, gist, store, phone } = await moveSetup();
  await phone.call("moveSyncToCloud(__args)", store.pushCfg());
  addNow(phone, "cloud-era");
  const old = copy(base); old.plan[MOVE_DAY].push({ id: "old-app", text: "古い版のアプリで足した" }); old.spends.push({ id: "s-old", amt: 300 });
  old.savedAt = new Date().toISOString();
  gist.set(old);
  const picked = await phone.run("pickLegacyGistWrites()");
  if (!picked.picked) return "Gist の変化を拾わなかった";
  await phone.push();
  const head = await readSpace(phone);
  if (ids(head.plan[MOVE_DAY]) !== "base,cloud-era,iphone,old-app") return `置き場の予定が違う: ${ids(head.plan[MOVE_DAY])}`;
  if (ids(head.spends) !== "s-base,s-iphone,s-old") return `置き場の支出が違う: ${ids(head.spends)}`;
  if (gist.writes() !== 0) return "拾う時に Gist を書き換えた";
  const again = await phone.run("pickLegacyGistWrites()");
  if (again.picked) return "変わっていない Gist をもう一度拾った";
  return ids(phone.state().plan[MOVE_DAY]) === "base,cloud-era,iphone,old-app" || `手元の予定が違う: ${ids(phone.state().plan[MOVE_DAY])}`;
});

await scenario(`戻す（${where}）: 置き場の最新（ほかの端末の分も）と古い版の Gist の分を足して Gist に書き、設定を Gist に戻す。置き場は消さない`, async () => {
  const { base, gist, store, phone } = await moveSetup();
  await phone.call("moveSyncToCloud(__args)", store.pushCfg());
  addNow(phone, "while-cloud");
  await phone.push();
  const ipadCfg = { ...phone.config() }; delete ipadCfg.token; delete ipadCfg.gistId;
  const ipad = device(await readSpace(phone), addPlan(MOVE_DAY, "ipad", "2台目で足した"), store, { config: ipadCfg });
  await ipad.push();
  const old = copy(base); old.plan[MOVE_DAY].push({ id: "old-app", text: "古い版のアプリで足した" }); old.savedAt = new Date().toISOString();
  gist.set(old);
  await phone.run("moveSyncBackToGist()");
  const cfg = phone.config();
  if (cfg.mode || cfg.spaceId || cfg.spaceSecret || cfg.cloudBase) return "設定に置き場の欄が残った";
  if (cfg.token !== "fake") return "Gist の鍵が消えた";
  const g = await gist.head();
  if (ids(g.plan[MOVE_DAY]) !== "base,ipad,iphone,old-app,while-cloud") return `Gist の予定が違う: ${ids(g.plan[MOVE_DAY])}`;
  if (ids(g.spends) !== "s-base,s-iphone") return `Gist の支出が違う: ${ids(g.spends)}`;
  const space = await readSpace(ipad);
  return ids(space.plan[MOVE_DAY]) === "base,ipad,iphone,while-cloud" || `置き場の中身が変わった: ${ids(space?.plan?.[MOVE_DAY])}`;
});

for (const [name, verdict, reference] of results) console.log(`${verdict.startsWith("通った") ? "○" : reference ? "－" : "×"} ${name} … ${verdict}`);
process.exit(results.every(([, v, reference]) => reference || v === "通った") ? 0 : 1);
