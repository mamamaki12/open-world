# 新規開始時の見た目作成画面を維持する

- ブランチ: `codex/appearance-onboarding`（mamamaki12/open-world）
- PR: #96
- 依頼: 新しくゲームを始めると見た目設定が一瞬で閉じる不具合を修正する。

## 方針
- Appの初回作成画面表示と共有ワールドの初期位置設定の競合を解消する。
- 初期位置の設定では開いている画面を維持し、本人の確定・閉じる操作まで作成を続けられるようにする。
- 作成済みの再開、通常の見た目編集、保存データを維持する。

## 進捗
- 済: 最新main 221d21b（PR #95）とdraft #87、docs/plans/README.mdを確認し、実装前に計画をcommit/push。
- 原因: welcome後にAppがlooksを開いても、続く共有ワールド初期位置の設定がoverlayをnullへ戻していた。既存の自動テストではnavigator.webdriverにより初回作成が省略されていた。
- 済: `src/session/session.ts`の初期位置設定からoverlayリセットを除去。
- 済: `scripts/check-appearance-onboarding.mjs`をCI shared-uiへ追加。実ユーザー同様に初回作成を有効にし、最初のworld配信を遅延させて検証する。
- 済: PC/スマホ×個人/共有の4通りで、画面維持・編集中の選択・確定保存・再開・通常編集が成功。スマホの画面画像も確認。
- 済: 型チェック、全単体650件、production build成功。CI 39200723924はattempt 2で全5ジョブ成功。
- 補足: 照明UI検査が初回CIではスマホ2灯目の配置待機でタイムアウト。同じコードの当該ジョブだけ再実行して成功。ローカルの追加検査では別の建物の壁をプレビューが拾い、1灯目の配置待機が失敗した。必要なら別途`check-furniture-lighting.mjs`の対象壁・プレビュー更新待機を改善する。
- 済: マージ（PR #96、5f44c41d6e780d8d2ff038b7ec0d7c7b89913452）。Pages 39201898010でWeb公開成功。EC2更新不要。
- 確認の限界: 公開後の実ブラウザ確認は実行ホスト切断で未完了。2026-10-19の再開時にも公開用Chromeを起動したが、ホスト接続断・終了コード1073807364で結果を取得できなかった。CIと公開の成功はGitHub側で再確認済み。
- 次: 利用者は「セーブ→最新版にする」で反映。追加確認する場合は`browser-checks/check-public-appearance.cjs`（ローカルの補助スクリプト）を使用する。
- 引継ぎ: 作業worktreeは`work/open-world-appearance`。コードはb559c81までローカルと同期済み、完了記録はGitHub API経由でmainへ保存。次の作業前にfetchしてmainの記録を確認する。
