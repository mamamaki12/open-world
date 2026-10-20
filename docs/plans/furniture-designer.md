# 家具を自分でデザインする

## 現在の状態

- 状態: 完了
- PR: [#73](https://github.com/mamamaki12/open-world/pull/73)（マージ済み）
- 公開: [Pages成功・公開版確認](extended-gameplay-audit.md#公開完了2026-10-20)（2026-10-20、`7f68760`）。
- 残作業: なし（このplanの依頼範囲）。
- 将来の拡張・追加確認: 自作家具の販売連携、部品の回転、取っ手の種類、引き出しへの収納。元の制作・配置機能の完了とは別の拡張案。
- 確認根拠: #73: 88fee07。
- 最終更新: 2026-10-20

## 経過記録（過去の方針・進捗）

> 現在の判断には上の「現在の状態」を使用する。以下の「次」「未完」「課題」は当時の記録であり、現在の残作業一覧ではない。

- ブランチ: `claude/project-thread-y3ftb3`
- 依頼: しんご（2026-10-16）。服・車は後の段階。

### ゴール
板・脚・引き出し・扉・クッション・背もたれなどの部品を組み合わせて家具を作り、色・素材を選び、家に置ける。
引き出し・扉は歩きモードで実際に開け閉めでき、座面のある家具には座れる。

### 方針
- デザインは既存の `FurnitureDef`（`src/catalog/furniture.json` と同じ形）で表す。部品に `move: 'drawer' | 'door-l' | 'door-r'`、家具に `seat` を追加。
- デザインは自分のライブラリ（localStorage `open-world:furniture-designs`）に独立して保存。id は `design:<ランダム>`。将来お店の商品登録でそのまま渡せる。
- 置いた家具（`FurniturePart.design`）にもデザインを埋め込むので、セーブ・共有ワールド・訪問先でもそのまま表示される。
- 家具の定義は `furnitureDef(item)`（埋め込み優先）で引く。`getFurniture(type)` は自分のライブラリも探す。
- 価格: 部品数と体積から計算（`designPrice`）。
- UI: 家具ツールに「自分でデザイン」→ デザイン画面（3Dプレビュー、部品の追加・移動・大きさ・素材、ひな形から開始）。
- 開閉: シャッターと同じ仕組み（`useDoors.open[家具id]`、Eキー/操作ボタン）。

### 進捗
- [x] 計画
- [x] データ型・ライブラリ・価格（src/catalog/designs.ts, furnitureDef）
- [x] 開閉・座る（Furniture.tsx の Piece、vehicleLogic の furn: ターゲット、seating.ts）
- [x] デザイン画面（src/ui/FurnitureDesigner.tsx、家具ツールの「＋ 家具をデザインする」、インスペクタの「このデザインを編集」）
- [x] テスト（src/catalog/designs.test.ts、scripts/check-furniture-designer.mjs）・PR
- 済: マージ（PR #73）

### 次にやれること
- お店の商品登録でライブラリのデザインを売る（`useDesigns` の FurnitureDef をそのまま渡す）
- 部品の回転、取っ手の種類、引き出しの中に物を入れる
