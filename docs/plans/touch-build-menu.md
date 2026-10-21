# スマホ建築画面の情報をメニューにまとめる

## 現在の状態

- 状態: 実装済み・CI待ち
- PR: 未作成
- 残作業: CI確認・マージ。
- 確認根拠: main 5683a50。src/ui/App.tsx TouchHud が地図・バイト・BuildChip を常時表示。
- 最終更新: 2026-10-21
- ブランチ: claude/project-thread-y3u12v

## 方針

- 歩き画面の WalkMenu と同じ見た目（walk-menu-list）を建築画面でも使う。縦横どちらのスマホ建築画面にも適用。
- codex/landscape-floor-touch（BuildMenu.tsx・mobile.css の建築メニュー本体）とは触る箇所を分ける。App.tsx の TouchHud のみ変更。

## 経過記録

- 2026-10-21: plan 作成（しんご依頼「横画面の建築でも地図・バイト・共同建築着工無料はハンバーガーメニューに」）。
- 2026-10-21: TouchHud を ☰＋所持金＋↶↷ に変更。メニューに建築状況（BuildChip）・歩いてみる・地図・バイト・セーブ・最新版。844×390／390×844 で開閉・地図遷移をPlaywright確認。check-app-version のスマホ側はメニューを開いてからセーブ。
