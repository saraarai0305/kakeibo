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

## 端末データ同期の接続コード

通知サーバー接続済みで、かつ既存の端末データ同期（非公開Gist）が設定済みの端末では、アプリの「設定 → 端末データ同期」から接続コードを作成できる。

- 接続コードは、別端末でGitHubトークンを手入力せずに既存Gistへ参加させるための受け渡し手段。
- Gist IDとGitHubトークンは端末側でAES-GCM暗号化してからWorkerへ保管する。Workerが平文のGitHubトークンを保存しない。
- コードを貼り付けた端末は、既存端末の最新データを先に受信してから、以後は双方向で自動同期する。
- 接続コードはパスワード同様に扱う。チャット、日報、Git、スクリーンショットへ残さない。

## 開発時の注意

- `.dev.vars`、VAPID秘密鍵、`SETUP_KEY`、`node_modules/`はGit管理しない。
- iPhone Web Pushはホーム画面へ追加したPWAで許可する。Safariの通常タブでは検証完了にしない。
- Durable Object Alarmは少し遅れる場合があり得る。アラーム失敗はCloudflare側が自動で再試行するが、端末の集中モード・通知設定で表示されない場合は別途端末設定を確認する。
- URLを変えると既存iPhoneのPush購読は新しいサーバーへ移らない。旧URLを維持するか、アプリで接続し直す。

## 日報の受信箱（2026-09-15）

秘書が書いた日報JSON（`mainichi.daily-report.v1`）だけを、アプリで取り込むまで預かる。日付ごとに1件（同じ日を送り直すと置き換える）。アプリで取り込んで確認済みになった日報は消す。端末全体のデータ・家計・体調・同期の情報は預からない。

- 送る: `POST /v1/daily-reports`。`Authorization: Bearer <DAILY_REPORT_SENDER_KEY>`、本文は日報JSON。送る鍵は `wrangler secret put DAILY_REPORT_SENDER_KEY` で置き、PC側はGit管理外の利用者フォルダのファイルに置く。Git・チャット・日報・スクリーンショットへ残さない。
- 読む: `GET /v1/daily-reports/pending` → `{reports:[{id,report,receivedAt}]}`、取り込み後に `POST /v1/daily-reports/{YYYY-MM-DD}/ack`。通知サーバーにつないだ端末の `X-Mainichi-Device-Id` と `Authorization: Bearer <端末の秘密値>` で確かめる（アプリに別の鍵を入れない）。
- 公開: Durable Object `DailyReportInbox` を足すので、`wrangler.jsonc` の migrations に `v3` が入る。
