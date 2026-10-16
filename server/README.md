# ワールド中継サーバー

ブラウザのホストがゲーム状態を確定し、このNodeサーバーが接続を中継する。ホスト不在の常設ワールドやアカウントDBは持たない。ゲストの資産は端末保存を信頼する方式。

## ローカル確認

Node 20以降で`npm ci`。別々のターミナルで以下を実行する。

```sh
node server/relay.mjs
npm run dev -- --host 127.0.0.1
```

`http://127.0.0.1:5173/`の開始画面からホストを作り、別ブラウザでコードを入力する。ホストの右下メニューで共同建築を許可する。接続先の既定値は開発時だけ`ws://127.0.0.1:8787`。

```sh
node --test server/relay.test.mjs
node scripts/check-world-session.mjs
npm run build
npm run preview -- --host 127.0.0.1 --port 4173
node scripts/check-world-offline.mjs
```

PlaywrightのChromiumを入れるか`PLAYWRIGHT_CHROMIUM_EXECUTABLE`で実行ファイルを指定する。既存のゲーム操作検証は開発時限定の`?play=1`で開始画面を省略する。

## 公開に必要な設定（未配置）

- WebSocketの常時接続に対応するNodeホスティングかDocker環境が必要。GitHub Pagesには中継サーバーを置けない。
- `PORT`: ホスティング先が渡すポート（既定8787）。
- `ALLOWED_ORIGINS`: 許可するブラウザのoriginをカンマ区切りで指定。公開サイトでは`https://mamamaki12.github.io`（`/open-world/`のパスは含めない）。本番では必須。
- HTTPSのサイトから接続するため、ホスティング側でTLSとWebSocket upgradeを有効にし、`wss://...`で公開する。
- `/health`が200を返す。1プロセスでルームを保持するため、初期は1インスタンス。再起動するとルームは終了する。
- Web本体をビルドする環境で`VITE_WORLD_RELAY=wss://...`を設定するか、開始画面の「接続・バックアップ」で接続先を指定する。招待リンクにも接続先が入る。
- 最初は4人まで。ホスト切断後30秒は編集を停止して再接続を待つ。参加者の再接続用トークンは接続ごとの一時情報で、ログイン認証ではない。

## 引き継ぎ時の注意

`docs/plans/guest-world-multiplayer.md`を先に読む。公開用接続先の配置・ブラウザによる公開サイト接続を終えるまではオンライン公開完了にしない。ログイン導入時はguest IDに直接信用を置かず、本人認証とプロフィール引き継ぎを追加する。
