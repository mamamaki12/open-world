# open-world

自分だけのワールドで、稼いで、建てて、売って、また建てる「住宅づくり×経済」クリエイティブゲーム（Webブラウザ）。

- 設計書：[docs/game-design.md](docs/game-design.md)
- 技術構成：[docs/tech-stack.md](docs/tech-stack.md)
- 家づくりプロトタイプの遊び方：[docs/prototype.md](docs/prototype.md)
- お金の仕組み（建築費・売買・カジノ・競馬など）：[docs/economy.md](docs/economy.md)

## 動かし方

Node.js 20 以上が必要です。

```bash
npm install
npm run dev      # http://localhost:5173 で起動
npm test         # ルール（配置判定・屋根の形・お金の計算）のテスト
npm run build    # dist/ に公開用ファイルを作る
```

## 公開（本番）

`main` に変更が入ると、GitHub Actions がテストとビルドをして GitHub Pages に公開します（`.github/workflows/deploy.yml`）。プルリクエストでは型チェック・テスト・ビルドだけを行います（`.github/workflows/ci.yml`）。

公開するときは最初の一回だけ、リポジトリの **Settings → Pages → Build and deployment → Source** を **GitHub Actions** にしてください。公開先は `https://mamamaki12.github.io/open-world/` です。Pages を有効にするまでは、デプロイのジョブはスキップされます（非公開リポジトリで Pages を使うには GitHub Pro が必要です）。

- セーブは遊ぶ人のブラウザ内（localStorage）だけに残り、サーバーには送られません。
- 3D表示（WebGL）が使えないブラウザでは案内を出し、予期しないエラーで止まったときは「再読み込み」か「自動セーブを消して始め直す」を選べます。
