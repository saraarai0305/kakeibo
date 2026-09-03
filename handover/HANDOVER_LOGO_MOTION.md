# 引き継ぎ — ロゴモーション

更新日: 2026-08-30  
部署: `開発｜ロゴモーション`  
作業フォルダ: `D:\仕事用\会社｜codex\開発｜ロゴモーション自動化`

## プロジェクトの目的

ロゴ画像・ブランド意図・動きの意図を、説明可能な中間表現へ分解し、絵コンテで人間確認してから
After Effects 2026等の実行環境へ渡す。観察→一操作→観察を基本にし、推測で進めない。

## 現在の仕様・実装状況

- 中間構造は Brief → Style Profile → Logo Scene Graph → Motion Plan → Storyboard → Render Spec。
- Briefから直接AE、画像だけの解析、絵コンテをAEデータとして扱う設計は採用しない。
- MVPは1ロゴ／1 Briefからパーツ・スタイル・3つのモーション案・4〜5フレーム・Render Spec骨格を作り、再現性・説明可能性・ライセンス除外を確認する。
- 候補はスタイル適合、形状、可読性、実装可能性、ブランドリスクで評価する。
- After Effects 2026のRender Spec接続は、1920x1080、30fps、3.8秒、レイヤー／キーフレームを扱う。
- 実機結果: `synthetic_001`の`geometric-assemble`でコンポ生成、4レイヤー、7バインディング、マスターMP4とアルファAVIの出力を確認。
- アルファの正式テンプレートはWindowsの「ロスレス圧縮（アルファ付き）」AVI。`alpha.mov`を前提にしない。

## 完了済み・現在進行中

- 構成監査とRender Spec→AE2026の接続メモを作成済み。
- `ae2026_import_render_spec.jsx`等の実機導入・レンダー経路を確認済み。
- 現在は、環境反射／GGX prefilter／DFG LUT／multiscatter／bevelの寄与を分離する測定段階。
- broad surfaceは環境反射が支配的で、直接ハイライトは主にbevel端に現れる。
- 実測値: envStrength forced 1.0で差分218,613px（10.5427%、max50）。highlight floorは89,280px（4.3056%、max30）。
- 通常の最終レンダーはbaselineと一致し、AEX SHA-256は`666FE13D28C33D339BB65822A7BD6A65AFC3FC0284B5FB027933780F6871DFB7`。

## 重要な設計判断・不採用案

- AEへ直接推測を流さず、解析・スタイル・モーション・レンダー仕様を段階分離する。原因追跡と人間確認が可能になるため。
- ダウンロード素材を学習データとして扱わず、ライセンス除外条件をMVPの成功条件に含める。
- 見た目を先に実装せず、同一条件の差分測定を先に行う。環境反射の差をbevelやtone rescueの変更と取り違えないため。

## 既知の問題・未完了

- product条件でpanel 5.0の測定が未完了。
- `microNormal`比較、`toneRescue`比較が未完了。測定前に実装変更しない。
- 現行SVGにグループIDがない場合があり、`negative_space`はnullになり得る。easeは正規化が必要。
- 他席がSDK／AE／ビルドロックを使っている間は、AE起動・プラグインビルド・インストールを行わない。

## 作業手順・重要ファイル

1. `CODEX_CONTEXT.md`、`AGENTS.md`、`docs\構成監査_初回.md`、`docs\AE2026_RenderSpec接続メモ.md`を読む。
2. `docs\PROJECT_MAP.md`で実際の対象リポジトリを確認する。
3. Render Spec、SVG、ログ、差分画像を同一条件で保存する。
4. 変更前後を測定し、通常レンダー・差分・アルファ出力を確認する。
5. AE／SDK実機を触る前に共通の即時報告網へ必要事項を送る。

主なファイル・ディレクトリ: `docs\`、`scripts\`、`schemas\`、`dataset\`、`assets\`、`renders\`、`ae\`。
主な実装入口: `scripts\ae2026_import_render_spec.jsx`、`scripts\prepare_svg_layer_assets.js`。

## 次にやるべきこと・人間判断待ち

- product条件でpanel 5.0、microNormal、toneRescueを測定し、差分根拠を残す。
- 測定後に初めて、どの表現を採用するか決める。
- 実ロゴの採用候補、ブランドリスク、ライセンス許可、AEでの最終出力仕様は人間判断待ち。

## 新しいClaudeが誤解しやすい点

- Codex作業フォルダと、実際のSDK／AEソースリポジトリは別の場合がある。`PROJECT_MAP.md`を先に読む。
- 「レンダーできた」と「見た目が正しい」は別。差分測定なしに完了扱いしない。
- アルファ出力はMOV固定ではなく、確認済みの実機経路ではAVI。
