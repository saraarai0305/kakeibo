# 利用手順

アプリの外部連携や端末設定の手順はここにまとめます。

- [ヘルスケア自動取り込み](ヘルスケア連携/README.md)

アプリ本体の設計資料は [`design/README.md`](../design/README.md) を参照してください。

## 日報ファイル取り込み（mainichi.daily-report.v1）

公開前のSafari／PWA確認は、[SAFARI_PUBLIC_QA_CHECKLIST.md](./SAFARI_PUBLIC_QA_CHECKLIST.md)の順で行います。

指定フォルダの常時監視はブラウザの安全制約上行いません。設定画面でファイルを明示的に選び、内容を確認してから取り込みます。既存の日報がある日付は上書きされません。

```json
{
  "format": "mainichi.daily-report.v1",
  "date": "2026-08-13",
  "start": "09:00",
  "end": "18:00",
  "breakMinutes": 60,
  "actualWorkMinutes": 420,
  "projects": [
    {
      "projectName": "プラグイン開発",
      "description": "実際に行った仕事内容を自由に書く",
      "done": "やったこと・成果",
      "statusNote": "今の状況",
      "todo": "やること",
      "trial": "試行・メモ",
      "delivery": "納品・成果物",
      "next": "次回やること"
    }
  ]
}
```

既存のプロジェクト名は自動で仕事カタログへ紐付きます。未登録のプロジェクトは自動作成せず、取り込み前の確認画面で「既存プロジェクトへ対応付け」または「新規プロジェクトとして登録」を選びます。未選択のまま取り込むことはできません。
