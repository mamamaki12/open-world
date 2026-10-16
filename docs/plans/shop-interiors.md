# お店の内装を作り込む（実装方針と進捗）

- ブランチ: `claude/project-thread-1xviq2`（mamamaki12/open-world）
- 依頼: しんご「服屋とかカジノとかの内装ももっと作り込みたい」
- PR: （出したら書く）

## 方針
- 歩いて入るお店（`src/world/VenueShell.tsx`）はそのまま。中身だけ増やす。
- カジノ: `src/world/VenueInteriors.tsx` の `CasinoInterior` に柄カーペット、腰壁と壁の照明、両替カウンター、ブラックジャック台、バーのスツール、観葉植物、天井の照明を足す。
- 服屋4店: `src/world/BoutiqueBuildings.tsx` の `BoutiqueInterior` に壁の棚（たたんだ服）、靴の棚、小物のガラスケース、ラグ、ペンダント照明、ロゴの壁、ベンチ、植物を足す。店ごとに色と素材を変える。
- 不動産屋: 物件の掲示板、待合ソファ、模型の家。
- 通路に置く大きな家具は `venueFixtures`（`src/building/venues.ts` / `BOUTIQUE_FIXTURES`）にも足して、すり抜けないようにする。F のアクション位置は変えない。
- 車屋・チューナー（別スレッド担当）と共通UIは触らない。
- 確認: `npm run build` と `npx vitest run`、Playwright で店内のスクショ。

## 進捗
- 済: 服屋4店（壁の棚・靴・小物ケース・ラグ・ロゴ壁・店ごとの照明・植物）、カジノ（柄カーペット・腰壁・壁の照明・格天井・JACKPOT/RACE BOOK 看板・壁ぞいのスロット・ポーカー台・両替所・ラウンジ・スツール・植物）、不動産屋（物件ボード・待合ソファ・家の模型・植物）。飾りは `src/world/CasinoDecor.tsx` と `BoutiqueDecor`。当たり判定も追加。
- 済: `scripts/check-shop-interiors.mjs` で店内スクショ確認（壁の中に埋まっていた看板の位置を修正）。
- 次: しんごの感想待ち。追加するなら店員さんやお客さんの人形、BGM。
- 課題: なし
