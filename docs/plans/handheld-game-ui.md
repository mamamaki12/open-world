# 携帯ゲーム機風のUI

## 現在の状態

- 状態: 保留（利用者のPC電源OFFに伴う中断依頼）
- PR: 未作成
- 公開: 未公開
- 残作業: 1. 型検査・ビルドと実画面テストを再実行。2. 配色・選択／hover・文字切れ・320px／横画面／200%拡大を確認し調整。3. PR作成、CI、マージと公開確認。
- 将来の拡張・追加確認: なし。
- 確認根拠: 基点main 11e15af（#117照明、#119地図ワープ、#120文字拡大修正）、未完PR #110を確認。UIの初期実装は保存済み。実画面テストは中断しており成功確認は未完。PR未作成・UI未公開。
- 最終更新: 2026-10-22
- ブランチ: codex/handheld-game-ui
- 依頼: Webアプリ的な見た目を減らし、DS・ゲームボーイを参考にゲーム機らしいUIにする。

## 方針

- ゲームボーイ風のLCD色・はっきりした二重枠・角・ドット模様と、DS風のタッチしやすいボタン・タブを組み合わせる。既存の暗い半透明・発光・ぼかし中心のスタイルを置き換える。
- 開始画面、共通ダイアログ、道具・素材、セーブ、地図、歩行／運転HUD、店舗系のメニューに同じ色と押下・選択表現を使う。
- 3D描画に全画面フィルターや走査線をかけず、軽量なCSSを中心にする。日本語の読みやすさ、タップ領域、キーボードフォーカス、長い文字・200%拡大、横画面を守る。
- 利用者の追加指定: 現在の3D描画はそのままとし、シーン・モデル・材質・カメラ・描画設定を変更しない。対象はHTMLのUIのみ。
- #120の折返し・スクロール規則や既存操作・保存・同期を維持する。変更前後を実ブラウザで比較し、PC1280px／スマホ390px・320px／横画面を確認する。
- 進捗はこの個別planに記録し、plans/READMEは変更しない。

## 経過記録

- 2026-10-22: mainと既存game-ui-redesign・large-text-layoutの方針を確認。照明の公開確認と並行し、UI計画を先行登録。
- 2026-10-22: 計画を `ff825bd` で先行commit・push。`src/ui/game-ui.css` をLCD色・二重枠・角のあるボタン・共通HUD／店舗テーマに置換。開始画面に `src/ui/PocketTitle.tsx` の独自ピクセル絵を追加し、SessionRootの開始ボタンにA/B表示、main.tsxのCSS読込順を調整。3D描画・シーン・モデル・カメラには変更なし。
- 2026-10-22: `scripts/check-handheld-ui.mjs` を追加。PC1280x800／390x844／320x568／844x390で開始・建築・歩行・操作・地図・不動産・車屋・証券・クローゼット・運転HUDを撮影・検査する想定。実行途中に中断依頼があり、成功は未確認。既存 `scripts/check-large-text.mjs` も再実行が必要。証跡があれば `browser-checks/handheld-ui/`（ignored）。
- 2026-10-22: 利用者の「電源を切るので記録して中断」により停止。開発サーバーと実行中のブラウザQAを停止し、初期実装・テストスクリプト・この記録を作業ブランチにcommit・pushして保存。次回はgit status／最新main／PR #110などの競合を確認してから再開する。再開コマンド例: Node安定版でVite起動後、Chromeを `PLAYWRIGHT_CHROMIUM_EXECUTABLE` に設定し `scripts/check-handheld-ui.mjs` を実行。詳細なWindows実行パスは下記。

## 再開用の環境

- Node: `C:/Users/munku/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe`
- Chrome: `C:/Program Files/Google/Chrome/Application/chrome.exe`
- 作業ディレクトリ: `C:/Users/munku/OneDrive - Kagoshima University/ドキュメント/ChatGPT/open-world`
- ブランチ: `codex/handheld-game-ui`
- Vite: Nodeで `node_modules/vite/bin/vite.js --host 127.0.0.1` を起動。ChromeとViteの実行にはsandbox昇格が必要な環境。
- ソース変更後はViteを再起動してからQAする（HMR付きモジュールとテストの動的importで状態ストアが二重化するのを避ける）。
- UIはまだ公開していない。照明 #117 は公開・実画面確認まで完了し、記録を `interior-ceiling-lighting.md` に残した。
