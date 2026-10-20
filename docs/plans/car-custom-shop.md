# 車のカスタムショップ（STANCE GARAGE）

## 現在の状態

- 状態: 完了
- PR: [#48](https://github.com/mamamaki12/open-world/pull/48)（マージ済み）
- 公開: [Pages成功・公開版確認](extended-gameplay-audit.md#公開完了2026-10-20)（2026-10-20、`7f68760`）。
- 残作業: なし（このplanの依頼範囲）。
- 将来の拡張・追加確認: 実際に運転し、エンジン音の聞こえ方を確認。
- 確認根拠: #48: 33a1619。
- 最終更新: 2026-10-20

## 経過記録（過去の方針・進捗）

> 現在の判断には上の「現在の状態」を使用する。以下の「次」「未完」「課題」は当時の記録であり、現在の残作業一覧ではない。

- リモートブランチ: `claude/project-thread-xlscth`
- 依頼: 車屋の横にカスタムショップ。塗装デザイン・エンジン変更・ホイール・キャンバー角・リアウィング・車高など。

### 方針
- 店は AVENUE MOTORS の西隣（`src/building/tuner.ts`、venue kind `tuner`）。自動ドアで歩いて入る。外観 `src/world/TunerBuilding.tsx`、店内 `VenueInteriors.tsx` の `TunerInterior`。
- カスタム内容と価格・性能は `src/catalog/carMods.ts`（`CarMods`, `quote`, `tunedCar`, `cleanMods`）。所有車 `OwnedCar.mods` に保存（`src/state/vehicles.ts` の `customizeCar`、変えた部品の代金だけ所持金から払う）。
- 見た目は `src/world/CarModel.tsx`（塗装の質感・ストライプ・ツートーン・ゼッケン・ホイール6種/インチ/色・キャンバー・車高・ウィング・スモーク・エアスクープ・マフラー）。
- 走りは `tunedCar` で加速/最高速/grip（`maxSteer` の高速時の切れ角）に反映。エンジン音は `src/world/engineSound.ts`（運転中と店での試聴）。
- 画面は `src/ui/TunerPanel.tsx`（タブ：塗装/エンジン/ホイール/足回り/エアロ、3Dプレビュー、見積もり）。

### 進捗
- 済: 上記すべて実装、typecheck と vitest 全件成功、Playwright で店の外観・店内・施工・購入後の実車を確認（`scripts/check-tuner.mjs`）。
- PR #48。CI の操作チェック（scripts/check-aim-controls.mjs）は mods の無い車を直接作るため落ちた → mods 未設定でも純正扱いにする修正を push。
- 最新 main（服屋さん #49 など）をマージしてコンフリクト解消済み。服屋は車屋の20m以上西なのでショップ(車屋の西2m、幅16m)と重ならない。
- 注意: main 自体で src/building/townHouses.test.ts が1件失敗している（このPRとは無関係）。
- 次: CI が通ればマージ。
- 未確認: 実際に運転してのエンジン音の聞こえ方（自動テストなし）。
