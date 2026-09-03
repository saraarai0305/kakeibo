# 前日予定通知サーバー

Cloudflare Workers無料枠のDurable Object Alarmを使い、アプリが閉じたiPhoneへWeb Pushを送る。
予定の通知時刻はアプリ側の設定値（初期値21:00）を使う。サーバーは端末ごとのPush購読と、今後90日分の通知本文だけを保持し、送信済みの本文は削除する。

## 初回公開

1. Cloudflareの無料アカウントへログインする。
2. このフォルダで `pnpm install`、次に `pnpm exec web-push generate-vapid-keys` を一度だけ実行する。
3. `pnpm exec wrangler login`、`pnpm exec wrangler deploy` を実行する。表示された `https://...workers.dev` が通知サーバーのURLになる。
4. 次の4つを `pnpm exec wrangler secret put <名前>` で設定する。秘密値をGit・チャット・画面共有へ残さない。

   - `VAPID_PUBLIC_KEY`（生成した公開鍵）
   - `VAPID_PRIVATE_KEY`（生成した秘密鍵）
   - `VAPID_SUBJECT`（例: `mailto:自分のメールアドレス`）
   - `SETUP_KEY`（自分で生成する長いランダム文字列）

5. iPhoneで公開済み自己管理アプリをホーム画面から開く。「設定 → 予定の通知」でサーバーURLと初回セットアップキーを入力し、「通知サーバーを接続」を押す。通知の許可を求められたら許可する。

`SETUP_KEY` は初回の端末追加にしか使わず、アプリ端末には保存しない。接続後は端末専用の秘密値で予定を更新する。

## 開発時の注意

- `.dev.vars`、VAPID秘密鍵、`SETUP_KEY`、`node_modules/`はGit管理しない。
- iPhone Web Pushはホーム画面へ追加したPWAで許可する。Safariの通常タブでは検証完了にしない。
- Durable Object Alarmは少し遅れる場合があり得る。アラーム失敗はCloudflare側が自動で再試行するが、端末の集中モード・通知設定で表示されない場合は別途端末設定を確認する。
- URLを変えると既存iPhoneのPush購読は新しいサーバーへ移らない。旧URLを維持するか、アプリで接続し直す。
