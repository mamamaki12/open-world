# 共有ワールド初期受信前の操作開始

- ブランチ: `codex/fix-verified-gameplay-bugs`
- PR: #87（マージ済み）
## 方針
- welcomeだけでは共有ゲームを操作可能にせず、最初のworldとaccountを受信してからconnected/gameへ移る。
- 再接続も初期snapshotの反映後に送信を再開する。旧招待方式は既存のwelcome動作を保持する。
- welcome→world/accountを個別に待機させ、途中の操作不可・初期受信後の地図が維持されることを検証する。
## 進捗
- 済: CIとローカルの追加検証で、共有参加直後に開いた地図が初回worldのカジノspawn処理で閉じられることを確認。statusはwelcomeで先にconnectedになっていた。
- 済: 計画を先にpush。worldとaccountの初期受信が揃ってから1回だけconnected/gameへ切り替え送信を再開。welcomeだけで操作を開始しない。
- 済: `check-shared-readiness.mjs`で初回/再参加のwelcomeだけ・worldだけを停止し、初期受信後の地図維持を確認。

## 公開完了（2026-10-20）
- 済: マージ（PR #87、`7f6876056b678ecdbf0371b5948549619d97d458`）。最終CI `39413017035`は全5ジョブが初回成功。全667単体・型・build・PC/スマホ操作・照明・共有/復元/オフライン検査を確認。
- 済: EC2は利用者が`dba310bc8d1ada499aad8ae20d30c646439adbe5`へ更新しhealth=okを確認。更新後の公開HTTPS/WSS/独立招待ルーム検査成功。最終版の中継プログラムと差分なし。
- 済: Pages `39414666612`成功。公開version/JSと新規ChromeのPC/スマホ起動を確認（`r7f68760`、JS例外0）。利用者は「最新版にする」で反映。
- 次: なし。
