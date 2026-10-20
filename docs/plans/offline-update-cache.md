# オフラインキャッシュ更新で旧版HTMLを残さない

- ブランチ: `codex/offline-update-cache`（mamamaki12/open-world）
- PR: #94
- 依頼: 共有ワールドのUI修正と新しい入室への切替を公開版へ確実に反映する。

## 方針
- `vite.config.ts`生成SWのプリキャッシュを`Request(..., {cache: 'reload'})`で取得し、旧HTTPキャッシュを再利用しない。
- IndexedDBのセーブとオフライン起動を保持する。
- `scripts/check-offline-update.mjs`で実際の生成SWを使い、長期HTTPキャッシュ内の旧HTMLから更新し、セーブ保持・オフライン再起動を検証する。

## 進捗
- 済: 実装前に計画をcommit/push。公開版とローカル生成SWで、更新後も旧HTMLが残ることを再現。
- 済: 修正後のHTML更新を確認。保存時刻を除くセーブ全体を比較する回帰テストをCI world-sessionへ追加。
- 済: CI 39193029572で生成SWの更新・セーブ保持・オフライン再起動が成功。共有2画面のUI・入室切替、公開中継のHTTPS/WSS、ドア、財布、店舗の検査も成功。
- 検証の限界: ローカル実行ホストが途中で切断。公開後の既存ブラウザプロファイルを使った再試験は未実施。CIで実際の生成SWと旧HTTPキャッシュの更新を確認した。
- 次: EC2中継の更新は利用者の実行待ち。`shared-session-takeover.md`参照。家・所持金・共有ワールドの保存ファイルを削除しない。
- 済: マージ（PR #94、bdec6ef5a77f9fc9785d94c8f74d66ae96587e3a）。CI全5ジョブ成功、Pages 39193837823で公開成功。
- 補足: GitHub API経由でcommit/push済み。ホスト復旧後はローカルの未同期差分を確認してから最新mainへ同期する。
