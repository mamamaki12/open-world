# 車のカスタムショップ（STANCE GARAGE）

- リモートブランチ: `claude/project-thread-xlscth`
- 依頼: 車屋の横にカスタムショップ。塗装デザイン・エンジン変更・ホイール・キャンバー角・リアウィング・車高など。

## 方針
- 店は AVENUE MOTORS の西隣（`src/building/tuner.ts`、venue kind `tuner`）。自動ドアで歩いて入る。外観 `src/world/TunerBuilding.tsx`、店内 `VenueInteriors.tsx` の `TunerInterior`。
- カスタム内容と価格・性能は `src/catalog/carMods.ts`（`CarMods`, `quote`, `tunedCar`, `cleanMods`）。所有車 `OwnedCar.mods` に保存（`src/state/vehicles.ts` の `customizeCar`、変えた部品の代金だけ所持金から払う）。
- 見た目は `src/world/CarModel.tsx`（塗装の質感・ストライプ・ツートーン・ゼッケン・ホイール6種/インチ/色・キャンバー・車高・ウィング・スモーク・エアスクープ・マフラー）。
- 走りは `tunedCar` で加速/最高速/grip（`maxSteer` の高速時の切れ角）に反映。エンジン音は `src/world/engineSound.ts`（運転中と店での試聴）。
- 画面は `src/ui/TunerPanel.tsx`（タブ：塗装/エンジン/ホイール/足回り/エアロ、3Dプレビュー、見積もり）。

## 進捗
- 済: 上記すべて実装、typecheck と vitest 全件成功、Playwright で店の外観・店内・施工・購入後の実車を確認（`scripts/check-tuner.mjs`）。
- 次: PR を作成し CI が通ればマージ。
- 未確認: 実際に運転してのエンジン音の聞こえ方（自動テストなし）。
