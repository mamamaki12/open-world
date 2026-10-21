# 土地の値段を20分の1に

## 現在の状態

- 状態: PR作成済み（CI待ち）
- ブランチ: `claude/project-thread-otcilu`
- 残作業: CI通過後マージ、EC2 relay を更新（server/README.md の手順）
- 確認根拠: vitest 701件通過、tsc通過、relay再バンドル済み
- 最終更新: 2026-10-21

## 目的

しんご（2026-10-21）「土地の値段を20分の1へ」。自分のワールド・共有ワールド両方。

## 方針

- `src/economy/market.ts` の `LOCATIONS[].land`（基準地価）を 1/20 にする。周辺建物の重み（density）・ばらつき・相場はそのまま。
  - 郊外 500万→25万、住宅街 1,200万→60万、駅近 2,500万→125万、都心 6,000万→300万。
- 売却額・固定資産税・家賃のうち土地の分も同じく 1/20 になる。
- 共有ワールドはリレー（`src/server/sharedWorld.ts` → `server/dist/relay.mjs`）も `landPrice` を使うため、`npm run build:server` で再バンドルし EC2 の relay 更新が必要。
