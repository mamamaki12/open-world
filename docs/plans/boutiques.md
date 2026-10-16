# 服屋さん4店舗 + アバターを滑らかに

- ブランチ: `claude/project-thread-9s1z2n`（mamamaki12/open-world）
- 依頼: 服屋さんを4店舗（ハイブラ〜ファスト）開き、服を買って着替えられるように。アバターのブロック感をなくし人間らしい体に。

## 方針
- 店は既存の歩いて入る店（VenueShell / venues.ts）と同じ仕組み。Venue に `maison|atelier|urban|daily` を追加。
- 位置: 町の南の道路沿い、車屋より西（町座標 x -90〜-46）。車屋の西隣はカスタムショップ用に空ける。
- ブランドは架空: MAISON VÉRANE（ハイブランド）/ ATELIER KOU（デザイナーズ）/ URBAN THREAD（カジュアル）/ DAILY WEAR（ファスト）。
- 服データ: `src/catalog/clothes.ts`（購入・着替え・セーブ修復の純関数、テストあり）。状態: `src/state/wardrobe.ts`（localStorage `open-world:wardrobe:v1`、お金は economy.pay）。
- アバター: `src/world/Avatar.tsx` を回転体（Lathe）の胴・骨盤・先細りの手足・手・あごのある頭に作り直し、服（トップス/ボトムス/靴/帽子）の形と色を反映。マネキンにも流用。
- UI: `src/ui/BoutiquePanel.tsx`（売り場＋試着室/クローゼット、3D試着プレビュー）。歩きメニューに「クローゼット/服」。地図に4店。

## 進捗
- 済: 店の配置・当たり判定・店内・外観（BoutiqueBuildings.tsx）、服カタログとテスト、着替え状態、アバター作り直し、パネル、地図、メニュー。typecheck・vitest 全て通過。
- 次: PR #49 のCI確認→マージ。ブラウザでの見た目確認は未実施（しんごさんがトークン節約のため停止）。
- 課題: なし（見た目は未確認）。
