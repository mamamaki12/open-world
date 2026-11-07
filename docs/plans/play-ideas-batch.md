# 遊びやすさ・面白さのアイデア8つ

## 現在の状態

- 状態: 検証待ち（CI）
- PR: 作成（A〜Eをまとめて1本）
- 公開: 未公開
- 残作業: CI 緑でマージ／EC2 の中継を更新（いいね・設計図の販売に必要。RELAY_VERSION '2026-11-07 家へのいいね・設計図の販売'）
- 確認根拠: tsc・vitest（739件）通過。Playwright でスマホ390x844・844x390・PC1280/1024 のガイド、依頼画面、設計図（保存・階コピー）、写真モード（夜に切替・撮影）、賃貸の住人表示を目視
- ブランチ: `claude/project-thread-1cui5c`
- 最終更新: 2026-11-07

## 目的
しんご（2026-11-07）がアイデア一覧から 1,2,3,5,6,7,8,9 を選んだ。

| 番号 | 内容 | グループ |
| --- | --- | --- |
| 7 | 最初のチュートリアル（床→壁→ドア→着工→売る） | A |
| 9 | 次にやることのヒント（画面のすみに1行） | A |
| 1 | NPCの建築依頼（クエスト）：条件を満たす家を建てて納品→報酬 | A |
| 2 | 設計図の保存・ほかの土地に建てる・共有（コード）／みんなのワールドで販売 | B |
| 8 | 階をまるごと上の階へコピー | B |
| 6 | 写真モード（HUDを消して撮影・保存） | C |
| 3 | 家の見学と★いいね・ランキング・売値に反映（みんなのワールド、中継の更新が必要） | D |
| 5 | 賃貸の家にNPCの住人、間取りの満足度で家賃が変わる | E |

## 方針
- A: `src/economy/quests.ts`（依頼の生成と判定、純粋関数）、`src/ui/GuideCard.tsx`（チュートリアルの手順→終わったら依頼のヒント1行）、`src/ui/QuestPanel.tsx`（overlay 'quests'）。進み具合は localStorage。
- B: `src/building/blueprints.ts`（保存・読み込み・コード化）、`src/building/copyLevel.ts`、建築メニューから使う。
- C: `src/ui/PhotoMode.tsx`、Canvas 内で gl.render→toDataURL。
- D: 中継の Lot に likes。RELAY_VERSION を上げ、EC2 の更新が必要。
- E: `src/economy/tenants.ts`（満足度）、賃貸中の家に住人のアバターを置く。

## 実装メモ
- 7/9: `src/ui/GuideCard.tsx`（手順は設計と土地の状態から自動判定）、`src/state/guide.ts`（localStorage `open-world:guide:v1`、前から売ったことがある人はチュートリアル完了扱い）
- 1: `src/economy/quests.ts`、`src/ui/QuestPanel.tsx`。条件は設計で表示、納品は完成した家で判定。納品＝土地ごと売却＋お礼。ひとりで遊ぶモードのみ
- 2/8: `src/building/blueprints.ts`（コードは `OW1.`＋deflate-raw の base64）、`src/ui/BlueprintPanel.tsx`。お店の商品に `blueprint` を付けて販売（1店3つまで、`src/economy/shop.ts`）
- 6: `src/ui/PhotoMode.tsx`、`src/state/photo.ts`（時間・天気は自分の画面だけ。`useClimate` が上書き）
- 3: `src/economy/likes.ts`、中継のアクション `like`、`src/ui/RankingPanel.tsx`。いいね1つで建物査定+1%（最大+50%）
- 5: `src/economy/tenants.ts`（満足度→家賃×0.6〜1.4）、`src/world/Tenants.tsx`（賃貸中の家に住人1〜4人、家具のそばで過ごす）、不動産屋の「貸す」に満足度

## 経過記録
- 2026-11-07: A〜E を実装して push。
- 2026-11-07: plan 作成。
