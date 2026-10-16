# 着工無料・土地代に周辺の建物の多さ・所持金100万円スタート

Branch: `claude/project-thread-05s2pt`（しんご 2026-10-16）

## Goal
- 着工・改築は無料（工事時間はそのまま）。売るときは今まで通り 建物の査定（建築費×品質×立地）＋土地 × 相場 でお金が入る
- 土地代に周辺の建物の多さを加味。お店や大きな建物（カジノ・マンション・タワー）ほど重い
- 所持金 100万円スタート（新しいセーブだけ）

## Approach
- `src/economy/neighborhood.ts`（新規・純関数）: 区画の中心から半径内の建物を距離で重みづけして合計 → 土地代の係数（0.8〜1.6）
  - 町の家: 戸建て1 / アパート1.5 / マンション2 / タワー3、プレイヤーの建てた家1（2階以上+0.5）、お店4、カジノ6
- `landPrice`/`salePrice` に係数を渡す（state/economy.ts で区画ごとに計算）。UIの土地代表示も同じ値
- `startConstruction` と共同建築（session.ts）は費用0。UIの「工事費」表示を「無料」に
- `START_MONEY = 1_000_000`

## Progress
- [x] plan
- [x] neighborhood + tests（係数は町の区画で 0.9〜1.6）
- [x] free construction + UI（共同建築も無料）
- [x] start money, docs/economy.md
- next: CI → merge
