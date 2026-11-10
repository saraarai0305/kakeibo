// 同期の置き場（SyncSpace）を、手元で立てた通知サーバーに対して試す（OpenSpec 変更 sync-no-lost-writes の 2.2・2.3）。
// 使い方（push-server で）:
//   npx wrangler dev --local --port 8799 --var SETUP_KEY:local-test-setup-key --persist-to <使い捨ての道>
//   node test/sync-space-check.mjs http://127.0.0.1:8799 local-test-setup-key
// 試しのデータだけを使う。本番の通知サーバー・本物の鍵・利用者のデータには触れない。終了 0 = 全部通った。
const [base = "http://127.0.0.1:8799", setupKey = "local-test-setup-key"] = process.argv.slice(2);
if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(base)) {
  console.error("手元（127.0.0.1 か localhost）の通知サーバーだけで試します: " + base);
  process.exit(2);
}

const results = [];
const check = (name, ok, detail = "") => results.push([name, ok, detail]);
const call = async (path, opts = {}) => {
  const res = await fetch(base + path, opts);
  const text = await res.text();
  let body = null;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, etag: res.headers.get("ETag"), body };
};

const dev = await call("/v1/devices", { method: "POST", headers: { "X-Mainichi-Setup-Key": setupKey } });
if (dev.status !== 200) { console.error("端末をつなげませんでした", dev); process.exit(1); }
const deviceHeaders = { Authorization: `Bearer ${dev.body.deviceSecret}`, "X-Mainichi-Device-Id": dev.body.deviceId };

const denied = await call("/v1/sync/spaces", { method: "POST", headers: { Authorization: "Bearer wrong", "X-Mainichi-Device-Id": dev.body.deviceId } });
check("端末の鍵が違えば置き場を作らない", denied.status === 401, `状態 ${denied.status}`);

const made = await call("/v1/sync/spaces", { method: "POST", headers: deviceHeaders });
check("つないだ端末は置き場を作れる", made.status === 200 && /^[a-f0-9]{32}$/.test(made.body?.spaceId || ""), `状態 ${made.status}`);
const statePath = `/v1/sync/spaces/${made.body.spaceId}/state`;
const auth = { Authorization: `Bearer ${made.body.spaceSecret}` };
const put = (data, ifMatch, requestId) => call(statePath, {
  method: "PUT",
  headers: { ...auth, "Content-Type": "application/json", ...(ifMatch == null ? {} : { "If-Match": `"${ifMatch}"` }), "X-Mainichi-Request-Id": requestId },
  body: typeof data === "string" ? data : JSON.stringify(data),
});

const empty = await call(statePath, { headers: auth });
check("作った直後は版 0・中身なし", empty.status === 200 && empty.body.version === 0 && empty.body.content === null, JSON.stringify(empty.body));

const wrongKey = await call(statePath, { headers: { Authorization: "Bearer wrong" } });
check("同期の鍵が違えば読ませない", wrongKey.status === 401, `状態 ${wrongKey.status}`);

const noMatch = await put({ plan: {} }, null, "req-no-ifmatch");
check("読んだ版（If-Match）の無い書き込みは断る", noMatch.status === 428, `状態 ${noMatch.status}`);

const first = await put({ plan: { "2099-01-01": [{ id: "base" }] } }, 0, "req-base-0001");
check("読んだ版が今の版なら書ける", first.status === 200 && first.body.version === 1 && first.etag === '"1"', JSON.stringify(first.body));

// 2台が同じ版 1 を読んで、ほぼ同時に書く
const iphoneData = { plan: { "2099-01-01": [{ id: "base" }, { id: "iphone" }] } };
const pcData = { plan: { "2099-01-01": [{ id: "base" }, { id: "pc" }] } };
const [a, b] = await Promise.all([put(iphoneData, 1, "req-iphone-0001"), put(pcData, 1, "req-pc-000001")]);
const statuses = [a.status, b.status].sort().join(",");
check("同じ版からの同時の書き込みは1台だけ通り、もう1台は 409", statuses === "200,409", `状態 ${a.status}・${b.status}`);
const aWon = a.status === 200;
const [won, lost, wonData, lostData, wonId, lostId] = aWon
  ? [a, b, iphoneData, pcData, "req-iphone-0001", "req-pc-000001"]
  : [b, a, pcData, iphoneData, "req-pc-000001", "req-iphone-0001"];
check("断る時は今の版と中身を返す", lost.body?.conflict === true && lost.body.version === 2 && typeof lost.body.content === "string", JSON.stringify(lost.body).slice(0, 120));

const again = await put(wonData, 1, wonId);
check("通った保存を同じ要求 ID で送り直しても二重に入れない", again.status === 200 && again.body.duplicate === true && again.body.version === won.body.version, JSON.stringify(again.body));

// 断られた端末: 返ってきた中身と自分の変更を足し合わせ、返ってきた版で送り直す
const theirs = JSON.parse(lost.body.content);
const ids = new Set([...theirs.plan["2099-01-01"], ...lostData.plan["2099-01-01"]].map(item => item.id));
const merged = { plan: { "2099-01-01": [...ids].map(id => ({ id })) } };
const retry = await put(merged, lost.body.version, lostId + "-r1");
check("断られた端末が足し合わせて送り直すと通る", retry.status === 200 && retry.body.version === 3, JSON.stringify(retry.body));

const final = await call(statePath, { headers: auth });
const finalIds = JSON.parse(final.body.content).plan["2099-01-01"].map(item => item.id).sort().join(",");
check("最後に両方の予定が残る", finalIds === "base,iphone,pc" && final.body.version === 3, `${finalIds}・版 ${final.body.version}`);

const broken = await put("{壊れた", 3, "req-broken-001");
check("JSON でない中身は入れない", broken.status === 400, `状態 ${broken.status}`);

const big = await put(JSON.stringify({ pad: "x".repeat(1_600_000) }), 3, "req-big-000001");
check("大きすぎる中身は入れない", big.status === 413, `状態 ${big.status}`);

const after = await call(statePath, { headers: auth });
check("断った書き込みの後も版は変わらない", after.body.version === 3, `版 ${after.body.version}`);

// たまたま順に届いただけで通っていないかを見る: 4台が同じ版から同時に書く、を10回
let version = 3, rounds = [];
for (let round = 0; round < 10; round++) {
  const res = await Promise.all([0, 1, 2, 3].map(n => put({ round, device: n }, version, `req-r${round}-d${n}-x`)));
  const ok = res.filter(r => r.status === 200).length, ng = res.filter(r => r.status === 409).length;
  rounds.push(`${ok}/${ng}`);
  version += ok;
}
check("4台同時の書き込みを10回くり返しても、毎回1台だけ通る", rounds.every(r => r === "1/3") && version === 13, rounds.join(" "));

for (const [name, ok, detail] of results) console.log(`${ok ? "○" : "×"} ${name}${ok ? "" : " … " + detail}`);
process.exit(results.every(([, ok]) => ok) ? 0 : 1);
