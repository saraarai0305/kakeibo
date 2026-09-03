# 引き継ぎ — Text Engine UI

更新日: 2026-08-30  
部署: `開発｜Text engine UI`  
UI作業フォルダ: `D:\仕事用\会社｜codex\開発｜Text engine UI`  
実装対象: `D:\仕事用\20260625\AfterEffectsSDK_25.6_61_win\ae25.6_61.64bit.AfterEffectsSDK\Examples\Template\Skeleton_TextEngine_UI`  
製品・プラグイン側: `D:\仕事用\20260625\AfterEffectsSDK_25.6_61_win\ae25.6_61.64bit.AfterEffectsSDK\Examples\Template\Skeleton_TextEngine_v1_fixed`

## プロジェクトの目的

After EffectsのText Engine UIと、金属文字シェーディングの実験を、UI・製品実装・測定環境を混同せずに進める。
現在の中心課題は、環境反射とGGX prefilter、DFG LUT、multiscatter、bevelが金属文字の見え方へ与える影響を分離すること。

## 現在の仕様・実装状況

- UIリポジトリ、製品プラグインリポジトリ、`experiments\GGX_prefilter`を分離して扱う。
- GGX prefilter、DFG LUT、multiscatterは接続済み。
- broad surfaceは環境反射の影響が大きく、直接ハイライトは主にbevel edgeへ現れる。
- `environmentStrength` panel 5.0条件の測定、`microNormal`比較、`toneRescue`比較を次に行う。
- 通常の最終レンダーはbaselineと一致。現行AEX SHA-256は
  `666FE13D28C33D339BB65822A7BD6A65AFC3FC0284B5FB027933780F6871DFB7`。
- 実験コピー以外の元SDKを変更しない。

## 測定結果（現時点）

- `envStrength` forced 1.0: 差分218,613px、10.5427%、max50。
- highlight floor: 89,280px、4.3056%、max30。
- bevel form shading: 87,664px、4.2276%、max29。
- tone rescue: 85,850px、4.1401%、max61。
- bevel floor差分は0。

これらは測定結果であって、原因や採用実装の確定ではない。環境反射を直接ハイライトの改善と誤解しない。

## 完了済み・未完了・現在進行中

完了済み:

- 現行のUI／製品／実験コピーの配置と役割を文書化。
- GGX系の接続と通常レンダーのbaseline一致を確認。
- AEX生成物のハッシュを記録。

現在進行中:

- product条件でpanel 5.0の比較測定。
- `microNormal`、`toneRescue`の比較測定。

未完了:

- 金属感の最終表現の採用。
- 実機条件での全パラメータの再現可能な測定手順の固定。
- UI変更を製品プラグインへ反映する場合の人間確認。

## 重要な設計判断・不採用案

- 製品の`.cpp`／`.inl`／`.h`、パラメータ、ID、`DISK_ID`を測定目的で勝手に変更しない。UI実験と製品の安定状態を分けるため。
- panel値と内部強制値の差を、見た目の改善とみなさない。再現条件が崩れるため。
- 測定前にtone rescue等を実装しない。環境反射・bevel・toneの寄与を分離できなくなるため。
- AE起動・ビルド・インストールを、他席が同じSDKやロックを使っている間に実行しない。

## 既知の問題・注意事項

- 実験コピーの結果を製品リポジトリの完成結果と混同しやすい。
- broad surfaceの差分が大きくても、直接ハイライトの問題を解決したとは限らない。
- UI側の入力値、panel表示値、内部シェーダー値は別物になり得る。
- build／AE実機の最終確認は、該当席のロックと承認を確認してから行う。

## 作業手順・重要ファイル

1. `CODEX_CONTEXT.md`→`AGENTS.md`→`docs\HANDOFF_TO_CLAUDE.md`→`docs\CURRENT_STATE.md`→`docs\PROJECT_MAP.md`を読む。
2. 実験コピーと製品コピーのパスを確認する。
3. 変更前のbaseline、panel値、出力画像、ログ、ハッシュを保存する。
4. 一度に一要因だけ変更し、差分px・割合・最大値を測る。
5. 通常レンダーが一致すること、差分の意味、製品へ戻す必要性を分けて記録する。
6. AE／ビルドが必要なら、即時報告網で対象と目的を伝えてから実行する。

重要資料: `D:\仕事用\会社｜codex\開発｜Text engine UI\docs\HANDOFF_TO_CLAUDE.md`、
`CURRENT_STATE.md`、`PROJECT_MAP.md`。製品のビルド成果物は、記録したハッシュと対応付ける。

## 次にやるべきこと

- panel 5.0条件、`microNormal`、`toneRescue`の順に比較測定する。
- 各測定で、変更パラメータ、入力画像、出力画像、差分、解釈を1セットで保存する。
- 測定結果をもとに、製品へ反映するか、実験のまま維持するかを判断する。

## 人間判断待ち

- 金属感の最終見た目と許容差。
- 実験結果を製品プラグインへ反映する承認。
- AE／SDKの占有時間、ビルド・インストール・公開のタイミング。

## 新しいClaudeが誤解しやすい点

- 部署名「Text engine UI」と実装対象の製品プラグインは同じフォルダではない。
- `environmentStrength`の差分が大きいことは、金属文字の直接ハイライトが正しくなった証拠ではない。
- 次にやるべきことは実装ではなく測定。測定前にコードを直さない。
