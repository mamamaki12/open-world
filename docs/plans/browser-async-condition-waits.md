# 非同期条件を待たないブラウザーテストの修正

- ブランチ: `codex/fix-verified-gameplay-bugs`
- PR: #87（draft）
## 方針
- PlaywrightのwaitForFunctionにasync関数を渡した箇所を、await page.evaluateで結果がtrueになるまで待つ実装に置き換える。製品の再現済み不具合数とは分ける。
- 今回追加した検証と、CIで実行する共有セッション/照準/ダブルタップ検証を対象にし、falseのPromiseで待機を抜けないことをテストする。
## 進捗
- 2026-10-20: 最新mainのonboarding検証にもasync waitForFunctionがあるためhelperへ統一。照明のphone検査でpointerup後clickなしを記録。実際の入力イベントと有効previewを確認し、描画完了とクリック到達を待って検証する。
- 済: Playwright同梱のframes.jsで、Promiseをawaitせずtruthy判定していることを確認。追加テストが早く進み、初期受信前に地図を開く原因にもなっていた。
- 済: 追加のgameplay/recovery検証を明示的awaitループに変更。
- 次: この計画をpush後、既存CIのasync待機も修正する。
