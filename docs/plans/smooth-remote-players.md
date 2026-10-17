# ほかのプレイヤーの動きを滑らかに（実装方針と進捗）

- ブランチ: `claude/smooth-remote-players-a3v3ef`（mamamaki12/open-world）
- 依頼: しんご「ほかのプレイヤーの動きがかくつく。受信した座標の間をアニメーションでつなぐなど」
- PR: （出したら書く）

## 方針（クライアントだけ、中継サーバーは変えない）
- 位置は 100ms ごと（10回/秒）に届く。今は最新値へ指数で追いかけるだけなので、届いた瞬間に速く動き、次が来るまで止まる → かくつく。
- `src/session/poseBuffer.ts` を新設: 受信ごとに受信時刻つきで記録し、描画は「今 − 遅延（届く間隔に合わせて自動、約120〜300ms）」の時刻で前後2つの受信座標の間を補間する（スナップショット補間）。次が遅れたら最後の速度で短時間だけ先読み。
- 人（`RemotePlayer`）・車（`RemoteCar`）・助手席に乗っている車（`ridingCar`）が同じ補間値を使う。歩きアニメの速さも補間後の位置から出す。

## 進捗
- 済: `src/session/poseBuffer.ts`（recordPose / samplePose / sampleCar）、session.ts の受信で記録・退出で破棄、RemotePlayers と ridingCar が補間値を使う。単体テスト poseBuffer.test.ts。
- 済: 送信側の時刻 `pose.ts`（performance.now）を pose に追加。受信側はこれを自分の時計に直して並べるので、届く間隔の揺れで速さが変わらない（中継はそのまま転送するので EC2 更新不要。ts の無い古いクライアントは受信時刻で補間）。遅延量は少しずつ変える（急変すると速さが揺れる）。
- 確認: 単体テスト（揺れる到着でも60fpsの速さ 3.5〜4.5m/s、補正前は1.5〜8）、scripts/check-drive-ride.mjs 合格。
- 次: PR → CI → マージ
