# 共有ワールドへの接続確認（2026-10-17）

- ブランチ: `fix/shared-world-connection`
- 確認元: main `0385fae15167049a81e4d3ccf4bb4884fbacb8d9`（#74）
- 依頼: 共有ワールドに接続できない。画像は開始画面の「接続できません。接続先と通信状態を確認してください」。通信サーバーのルートURLではnot found。

## 確認結果
- 済: 最新の共有実装と`docs/plans/shared-public-world.md`、`server/README.md`を確認。公開用`.env.production`は`wss://shingo-open-world.duckdns.org`。
- 済: 公開EC2のHTTPS `/health`は200 ok。公開サイトと同じoriginのChromeから`type:shared`で接続し、`welcome/shared:true/code:SHARED`を確認。公開サーバーは新共有方式に対応している。
- 済: 実際の公開URL `https://mamamaki12.github.io/open-world/` を新規ブラウザーで開き、「みんなのワールドで遊ぶ」から参加成功。画面に「みんなのワールド · 1人」を確認。「保存して開始画面へ」から退出も成功し、ブラウザー例外なし。
- 注意: `https://shingo-open-world.duckdns.org/`はゲーム配信先ではなく通信専用。`server/relay.mjs`はHTTPの`/health`以外に404/not foundを返す設計なので、ルートURLの404は接続障害の根拠にならない。
- 現時点では公開版で接続障害を再現できず、原因を断定しない。端末に保存された接続先や、画像撮影時の一時的な通信障害などを切り分ける。個人セーブを削除する案内はしない。

## 次の確認
- 正しい接続先をクエリで指定するリンクから再参加: `https://mamamaki12.github.io/open-world/?relay=wss%3A%2F%2Fshingo-open-world.duckdns.org`。`SessionRoot.tsx`のinitialRelayはURLクエリを保存値より優先し、開始ボタン実行時にその接続先を保存する。
- それでも失敗する場合は「接続・バックアップ」のオンライン接続先、実際に開いているページのURLとブラウザーの通信エラーを確認する。EC2側のファイル更新やデータ初期化は、現状の動作を確認せずに行わない。
- アプリのコード変更は行っていない。調査は独立worktreeで行い、他のエージェントの新機能や市場データの自動更新を変更しない。
