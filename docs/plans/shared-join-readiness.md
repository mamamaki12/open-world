# 共有ワールド初期受信前の操作開始

- ブランチ: `codex/fix-verified-gameplay-bugs`
- PR: #87（draft）
## 方針
- welcomeだけでは共有ゲームを操作可能にせず、最初のworldとaccountを受信してからconnected/gameへ移る。
- 再接続も初期snapshotの反映後に送信を再開する。旧招待方式は既存のwelcome動作を保持する。
- welcome→world/accountを個別に待機させ、途中の操作不可・初期受信後の地図が維持されることを検証する。
## 進捗
- 済: CIとローカルの追加検証で、共有参加直後に開いた地図が初回worldのカジノspawn処理で閉じられることを確認。statusはwelcomeで先にconnectedになっていた。
- 次: 計画をpush後、受信完了までの状態を修正する。
