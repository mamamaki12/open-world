# 家具を自分でデザインする

- ブランチ: `claude/project-thread-y3ftb3`
- 依頼: しんご（2026-10-16）。服・車は後の段階。

## ゴール
板・脚・引き出し・扉・クッション・背もたれなどの部品を組み合わせて家具を作り、色・素材を選び、家に置ける。
引き出し・扉は歩きモードで実際に開け閉めでき、座面のある家具には座れる。

## 方針
- デザインは既存の `FurnitureDef`（`src/catalog/furniture.json` と同じ形）で表す。部品に `move: 'drawer' | 'door-l' | 'door-r'`、家具に `seat` を追加。
- デザインは自分のライブラリ（localStorage `open-world:furniture-designs`）に独立して保存。id は `design:<ランダム>`。将来お店の商品登録でそのまま渡せる。
- 置いた家具（`FurniturePart.design`）にもデザインを埋め込むので、セーブ・共有ワールド・訪問先でもそのまま表示される。
- 家具の定義は `furnitureDef(item)`（埋め込み優先）で引く。`getFurniture(type)` は自分のライブラリも探す。
- 価格: 部品数と体積から計算（`designPrice`）。
- UI: 家具ツールに「自分でデザイン」→ デザイン画面（3Dプレビュー、部品の追加・移動・大きさ・素材、ひな形から開始）。
- 開閉: シャッターと同じ仕組み（`useDoors.open[家具id]`、Eキー/操作ボタン）。

## 進捗
- [x] 計画
- [x] データ型・ライブラリ・価格（src/catalog/designs.ts, furnitureDef）
- [x] 開閉・座る（Furniture.tsx の Piece、vehicleLogic の furn: ターゲット、seating.ts）
- [ ] デザイン画面
- [ ] テスト・PR
