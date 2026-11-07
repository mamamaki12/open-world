# 車の値段を10分の1にする

- 状態: 完了（PR待ち）
- ブランチ: claude/project-thread-ly4yey
- 目的: しんごの依頼（2026-11-07）「車の値段を10分の1にして」
- 方法: `src/catalog/cars.ts` の各車の `price` を 1/10 にする。カスタムショップの部品代（`src/catalog/carMods.ts`）は車の値段ではないので変えない。
- 確認根拠: `npm test`、型チェック
