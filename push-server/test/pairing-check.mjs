// 接続コード（DeviceSyncPairing）を、手元で立てた通知サーバーに対して試す（11-16 期限つき・1回限り）。
// 使い方（push-server で）:
//   npx wrangler dev --local --port 8799 --var SETUP_KEY:local-test-setup-key --persist-to <使い捨ての道>
//   node test/pairing-check.mjs http://127.0.0.1:8799 local-test-setup-key
//   期限切れの試しは --var PAIRING_TTL_SECONDS:0 で立て直して、最後の引数に expired を付ける
// 試しのデータだけを使う。本番の通知サーバー・本物の鍵・利用者のデータには触れない。終了 0 = 全部通った。
import { createHash, randomBytes } from "node:crypto";

const [base = "http://127.0.0.1:8799", setupKey = "local-test-setup-key", mode = "normal"] = process.argv.slice(2);
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
  return { status: res.status, body };
};
const b64url = (buf) => Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const dev = await call("/v1/devices", { method: "POST", headers: { "X-Mainichi-Setup-Key": setupKey } });
if (dev.status !== 200) { console.error("端末をつなげませんでした", dev); process.exit(1); }
const deviceHeaders = { Authorization: `Bearer ${dev.body.deviceSecret}`, "X-Mainichi-Device-Id": dev.body.deviceId, "Content-Type": "application/json" };

const makeCode = async () => {
  const secret = b64url(randomBytes(32));
  const envelope = { iv: b64url(randomBytes(12)), ciphertext: b64url(randomBytes(48)) };
  const made = await call("/v1/sync/pairings", { method: "POST", headers: deviceHeaders, body: JSON.stringify({ envelope, pairingSecretHash: b64url(createHash("sha256").update(secret).digest()) }) });
  return { made, code: `${made.body?.pairingId}.${secret}`, envelope, secret };
};
const join = (code) => call("/v1/sync/pairings/join", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pairingCode: code }) });

if (mode === "expired") {
  const { made, code } = await makeCode();
  check("期限0秒でもコードは作れる", made.status === 200, `状態 ${made.status}`);
  const first = await join(code);
  check("期限を過ぎたコードは断る（410・期限の片付けが先に走れば消えて 401）", first.status === 410 || first.status === 401, `状態 ${first.status}`);
  const again = await join(code);
  check("期限切れで断ったコードは消えている（次も断る）", again.status === 401, `状態 ${again.status}`);
} else {
  const { made, code, envelope, secret } = await makeCode();
  const expires = Date.parse(made.body?.expiresAt || "");
  check("コードを作ると期限（約30分後）を返す", made.status === 200 && Math.abs(expires - Date.now() - 30 * 60 * 1000) < 60 * 1000, `状態 ${made.status} 期限 ${made.body?.expiresAt}`);
  const wrong = await join(`${made.body.pairingId}.${b64url(randomBytes(32))}`);
  check("鍵が違うコードは断る", wrong.status === 401, `状態 ${wrong.status}`);
  const first = await join(code);
  check("1回目は中身を返す（違う鍵で断った後も使える）", first.status === 200 && first.body?.envelope?.ciphertext === envelope.ciphertext, `状態 ${first.status}`);
  const second = await join(code);
  check("同じコードの2回目は断る", second.status === 401, `状態 ${second.status}`);
  const noDevice = await call("/v1/sync/pairings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ envelope, pairingSecretHash: secret }) });
  check("つないでいない端末はコードを作れない", noDevice.status === 401, `状態 ${noDevice.status}`);
}

let failed = 0;
for (const [name, ok, detail] of results) {
  console.log(`${ok ? "通った" : "落ちた"}  ${name}${ok ? "" : "  " + detail}`);
  if (!ok) failed++;
}
console.log(failed ? `落ちた ${failed} / ${results.length}` : `全部通った ${results.length} / ${results.length}`);
process.exit(failed ? 1 : 0);
