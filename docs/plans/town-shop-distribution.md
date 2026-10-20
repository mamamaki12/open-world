# Town shop distribution

## 現在の状態

- 状態: 完了
- PR: [#85](https://github.com/mamamaki12/open-world/pull/85)（マージ済み）
- 公開: [Pages成功・公開版確認](extended-gameplay-audit.md#公開完了2026-10-20)（2026-10-20、`7f68760`）。
- 残作業: なし（このplanの依頼範囲）。
- 将来の拡張・追加確認: なし。
- 確認根拠: #85: a71e38d。
- 最終更新: 2026-10-20

## 経過記録（過去の方針・進捗）

> 現在の判断には上の「現在の状態」を使用する。以下の「次」「未完」「課題」は当時の記録であり、現在の残作業一覧ではない。

- Branch: fix/shared-world-auto-doors
- Request: distribute stores across town; preserve a mixed shopping district and stop placing four clothing stores in one row.

### Approach
- Define shared civic-space coordinates for several shopping areas outside player-owned residential plots. Mix clothing and other services in one district; distribute remaining clothing and automotive stores elsewhere.
- Keep venue IDs and saved player buildings unchanged. Rendering, entrances, collisions and navigation must use the same venue rectangles.
- Check building/road overlaps, approach paths and interactions. Record exact layout and browser results.

### Progress
- Planned; inspect all civic drawing and collision consumers before moving coordinates.

- Implemented south-west mixed shopping district (daily clothes, estate, atelier, exchange), north and north-east boutiques, pedestrian approach paths and map labels. Existing residential plots and venue IDs are unchanged.
- Road/residential/building overlap and pedestrian connectivity checks pass. Relocation exposed a fixture collision escape at a room corner; resolveVenue now chooses only displacement candidates inside room bounds.
- Next: integrate latest main (including newly merged salon), place salon in the mixed district, run full build/unit/browser checks.

- Integrated main 94d6221 (avatar/salon, mobile HUD and selection changes), preserving looks+walking in pose messages. Salon moved beside the exchange in the west district; map text follows the new locations.
- Full unit suite passed (632 tests before one added debt regression); production build passed. Relay persistence/restart integration passed all 4 tests with a workspace TEMP directory (default Windows sandbox temp denied rename).

- Final Chrome traversal passed all 10 venues (including salon and both north stores): automatic doors opened and W-key walking entered each interior. Map selection and new location descriptions passed; screenshot: world-session-checks/distributed-shop-map.png (ignored test output).
- Browser traversal holds W until entry rather than assuming 1.3 seconds, because software-rendered CI can advance fewer physics frames.

### Release checkpoint (2026-10-17 JST)
- Done: PR #85 merged as a71e38d270cd36e366e96da2d22201ef4cb5cd90 after CI run 39005423585 succeeded in all three jobs.
- User confirmed the EC2 update completed. Independent Chrome verification returned health=ok and a successful WSS connection.
- The EC2 executable was pinned to a17fbd935fc59fb7571adfdcaec1681c2508a81c (same runtime code as the merged release). Earlier draft/deployment hold notes above are resolved.
- GitHub Pages publication is being verified; no additional server changes are required for this release.

- Done: GitHub Pages deployment run 39021467469 succeeded. A fresh Chrome context with service workers blocked fetched the public site (HTTP 200), loaded assets/index-DvovbPU4.js and verified both new wallet and dispersed-shop code. Release is public at https://mamamaki12.github.io/open-world/ . All requested work in PR #85 is complete.
