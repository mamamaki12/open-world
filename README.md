# open-world

自分だけのワールドで、稼いで、建てて、売って、また建てる「住宅づくり×経済」クリエイティブゲーム（Webブラウザ）。

- 設計書：[docs/game-design.md](docs/game-design.md)
- 技術構成：[docs/tech-stack.md](docs/tech-stack.md)
- 家づくりプロトタイプの遊び方：[docs/prototype.md](docs/prototype.md)

## 動かし方

Node.js 20 以上が必要です。

```bash
npm install
npm run dev      # http://localhost:5173 で起動
npm test         # ルール（配置判定・屋根の形）のテスト
npm run build    # dist/ に公開用ファイルを作る
```
