# 携帯ゲーム機風のUI

## 現在の状態

- 状態: 検証待ち
- PR: [#121](https://github.com/mamamaki12/open-world/pull/121)
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
- 2026-10-22: 利用者の再開依頼を受け、保存commit 675162e・差分なし・最新main 11e15af・未完PR #110を確認。専用ブランチで型検査とPC／スマホの実画面検証から再開。3D描画は変更しない。
- 2026-10-22: 実画面で旧タイトルの文字グラデーション・白い入力文字・バージョン表示の低コントラストを検出し、明示的なLCD配色へ修正。証券・見た目の選択肢、道具バーの下段、乗車等の操作ボタンもテーマに統一。
- 2026-10-22: PCの乗車ボタンが道具バーに重なることを実クリックで検出。QuickBarのResizeObserverで高さを測り、操作プロンプトをバーの上へ配置。空のスマホ道具バーを非表示にした。PCの開始・建築・各ダイアログ・乗車・座席視点の11画面検査が成功、スマホ各サイズを検証中。3D関連ファイルの差分はない。
- 2026-10-22: 既存large-textスクリプトでWindowsのChromeパス指定を可能にし、CIのlarge-textジョブに携帯機UIの画面検査・証跡を追加。型検査・ビルド、PC/スマホ・文字拡大、全CIと公開の確認が残る。
- 2026-10-22: 初回の4サイズ44画面・乗車／座席視点検査、型検査・ビルドは成功。画像確認でスマホの全画面HUD背景が3Dを覆う問題を検出し、HUDの外枠は透明、メーターのみLCD背景へ修正。画面検査に透明性の回帰条件を追加。ボタンの80ms色遷移も廃止し、選択直後の低コントラストを防いだ。
- 2026-10-22: PR #121を作成。CI起動前のYAMLインデント不備を検出して修正。PC200%・スマホ縦横150%の文字重なり検査と修正後の画面確認を継続する。
- 2026-10-23: CI 39798507909ではcheck／building-detail／vehicle-occupants／shared-ui／furniture-lightingが成功。残る3項目は準備・検証の合計時間で中断。large-textログは6サイズとも `all screens ok`、その直後に追加UI検査が時間切れ。constructionはブラウザ準備約13分の後、起動と各画面の建築メニューまで成功。world-sessionは準備約7分、複数の店舗入店まで成功して時間切れ。検証は省略せず、handheld-uiを独立ジョブへ分割、construction40分／large-text35分／world-session30分に実行枠を調整して再実行。
- 2026-10-23: ローカルではPC200%・スマホ縦横150%の全対象画面が成功。既存スクリプトのボタン名差分で取りこぼしていたスマホ建築メニューも、別の一時検証で実際に開き、縦横150%とも重なり0件を確認。証跡 `browser-checks/large-text-build-menu/`（ignored）。スマホHUD透明化後の再検証も成功。

## 再開用の環境

- Node: `C:/Users/munku/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe`
- Chrome: `C:/Program Files/Google/Chrome/Application/chrome.exe`
- 作業ディレクトリ: `C:/Users/munku/OneDrive - Kagoshima University/ドキュメント/ChatGPT/open-world`
- ブランチ: `codex/handheld-game-ui`
- Vite: Nodeで `node_modules/vite/bin/vite.js --host 127.0.0.1` を起動。ChromeとViteの実行にはsandbox昇格が必要な環境。
- ソース変更後はViteを再起動してからQAする（HMR付きモジュールとテストの動的importで状態ストアが二重化するのを避ける）。
- UIはまだ公開していない。照明 #117 は公開・実画面確認まで完了し、記録を `interior-ceiling-lighting.md` に残した。
