# 隣の土地をつなげる・町並み（歩道・街灯・信号）

- 依頼：しんご 2026-10-16「隣り合う土地を買えばつなげられるように」「歩道や街灯、信号などで町っぽく」
- ブランチ：`claude/map-and-warp-snw7dv`（main から作り直し済み）

## 方針
- つなげられるのは、同じブロックの同じ列で道路をはさまず横に並ぶ2区画（`joinPair` in `src/economy/town.ts`）。組は地区をまたがない。
- `Lot.joined` = 東側の区画。`plot` は西側。幅は `JOINED_W`=52 マス、東の家は `JOIN_SHIFT`=28 マスずらす（`src/building/join.ts` の `mergeHouses`、id に `j-` を付ける）。
- 土地代は `variance` を足し合わせて2区画ぶん（売値・税もそのまま計算できる）。
- 建てられる範囲は `lotSize`（`src/building/dimensions.ts`、可変）。economy の subscribe でいまの土地に合わせる。範囲判定は LOT_W/LOT_D でなく lotSize を見る。
- 町並みは `TOWN_ROADS` は変えず（車の走行に使われている）、描画だけ足す：歩道帯・縁石・横断歩道・街灯・交差点の信号（色が変わる）。南の道路沿いの店（CIVIC_SITE）と重ならないこと。

## 進捗
- 済：town.ts の joinPair/JOIN_SHIFT/JOINED_W＋テスト、join.ts、economy の Lot.joined/joinLots/lotCells/ownedPlots/lotSize 同期、rules/Placement/aimBuild/furnitureSnap/BuildCamera/Scene/Player/Town を lotSize 対応
- 済：UI（購入時チェック `src/ui/JoinOption.tsx` を LandPurchasePanel・LandShop に、地図の「つなげる」ボタン・つなげた土地を1つの四角に）、join.test.ts
- 済：つなげたとき名前は家のある方を残し、原点移動でカメラと人をずらす（originShift）。画面で確認済み
- 済：町並み `src/world/Streetscape.tsx`（歩道・縁石・横断歩道・街灯・信号、インスタンス描画）＋テスト。Town の道路の薄い縁取りは歩道に置き換え
- 済：画面で確認（screenshots/map/streetscape.png）
- 次：PR → CI 緑でマージ
- 最後：Playwright で PC/スマホ確認 → PR → CI 緑でマージ
