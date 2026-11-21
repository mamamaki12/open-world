# 一休建築士（open-world）

自分だけのワールドで、稼いで、建てて、売って、また建てる「住宅づくり×経済」クリエイティブゲーム（Webブラウザ）。

- 設計書：[docs/game-design.md](docs/game-design.md)
- 技術構成：[docs/tech-stack.md](docs/tech-stack.md)
- 家づくりプロトタイプの遊び方：[docs/prototype.md](docs/prototype.md)
- お金の仕組み（建築費・売買・カジノ・競馬など）：[docs/economy.md](docs/economy.md)

## 動かし方

Node.js 20 以上が必要です。

```bash
npm ci           # 初回と、package-lock.json が変わったとき
npm run dev      # http://localhost:5173 で起動
npm test         # ルール（配置判定・屋根の形・お金の計算）のテスト
npm run build    # dist/ に公開用ファイルを作る
```

ひとりで遊ぶだけなら、これだけで動きます。

### みんなで遊ぶとき（中継サーバー）

ワールドに人を招くときは、中継サーバーも別のターミナルで起動します。

```bash
node server/dist/relay.mjs   # http://127.0.0.1:8787 で起動（/health が ok を返す）
```

Windows では、保存先を指定してから起動します（指定しないと保存先のパスが壊れて起動に失敗します）。

```powershell
$env:WORLD_FILE = "$PWD\server\shared-world.json"; node server/dist/relay.mjs
```

開発中の画面は、最初から `ws://127.0.0.1:8787` につなぎます。確かめ方と公開の設定は [server/README.md](server/README.md) にあります。

## 公開（本番）

`main` に変更が入ると、GitHub Actions がテストとビルドをして GitHub Pages に公開します（`.github/workflows/deploy.yml`）。プルリクエストでは型チェック・テスト・ビルドだけを行います（`.github/workflows/ci.yml`）。

公開するときは最初の一回だけ、リポジトリの **Settings → Pages → Build and deployment → Source** を **GitHub Actions** にしてください。公開先は `https://mamamaki12.github.io/open-world/` です。Pages を有効にするまでは、デプロイのジョブはスキップされます（非公開リポジトリで Pages を使うには GitHub Pro が必要です）。

- セーブは遊ぶ人のブラウザ内（localStorage）だけに残り、サーバーには送られません。
- 3D表示（WebGL）が使えないブラウザでは案内を出し、予期しないエラーで止まったときは「再読み込み」か「自動セーブを消して始め直す」を選べます。
