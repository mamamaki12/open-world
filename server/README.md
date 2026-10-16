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

## 公開に必要な設定

- WebSocketの常時接続に対応するNodeホスティングかDocker環境が必要。GitHub Pagesには中継サーバーを置けない。
- `PORT`: ホスティング先が渡すポート（既定8787）。
- `ALLOWED_ORIGINS`: 許可するブラウザのoriginをカンマ区切りで指定。公開サイトでは`https://mamamaki12.github.io`（`/open-world/`のパスは含めない）。本番では必須。
- HTTPSのサイトから接続するため、ホスティング側でTLSとWebSocket upgradeを有効にし、`wss://...`で公開する。
- `/health`が200を返す。1プロセスでルームを保持するため、初期は1インスタンス。再起動するとルームは終了する。
- Web本体をビルドする環境で`VITE_WORLD_RELAY=wss://...`を設定するか、開始画面の「接続・バックアップ」で接続先を指定する。招待リンクにも接続先が入る。
- 最初は4人まで。ホスト切断後30秒は編集を停止して再接続を待つ。参加者の再接続用トークンは接続ごとの一時情報で、ログイン認証ではない。

## 引き継ぎ時の注意

### 現在の公開環境（2026-10-17）

- EC2 t3.micro / ap-southeast-2（シドニー）/ Amazon Linux 2023。Node 22、ws 8.22.0。
- 公開接続先: `wss://shingo-open-world.duckdns.org`。本番の既定値はリポジトリの`.env.production`に設定。
- 中継配置: `/home/ec2-user/open-world-relay/relay.mjs`。systemdの`open-world-relay`が`/usr/bin/node-22`で起動する。
- Caddy: `/etc/caddy/Caddyfile`で`reverse_proxy 127.0.0.1:8787`。systemdの`caddy`がHTTPS証明書を管理する。
- セキュリティグループはHTTP/HTTPSを許可し、8787は外部開放しない。`ALLOWED_ORIGINS=https://mamamaki12.github.io`。
- EC2の停止/起動でパブリックIPv4が変わった場合はDuckDNSを更新する。サービスの再起動で既存ルームは終了する。

```sh
curl -fsS https://shingo-open-world.duckdns.org/health
sudo systemctl status open-world-relay caddy --no-pager
sudo journalctl -u open-world-relay -n 40 --no-pager
sudo journalctl -u caddy -n 40 --no-pager
```

公開接続の検査はリポジトリから`node scripts/check-public-relay.mjs`を実行する。短命な検査用ルームを作り、HTTPS/WSS、参加、建築許可、送信者固定、世界配信、退出を確認する。

`docs/plans/guest-world-multiplayer.md`を先に読む。公開用接続先の配置・ブラウザによる公開サイト接続を終えるまではオンライン公開完了にしない。ログイン導入時はguest IDに直接信用を置かず、本人認証とプロフィール引き継ぎを追加する。
