# 友達に自分の土地で建ててもらう（実装方針と進捗）

## 現在の状態

- 状態: 完了
- PR: [#95](https://github.com/mamamaki12/open-world/pull/95)（マージ済み）
- 公開: [Pages成功・公開版確認](extended-gameplay-audit.md#公開完了2026-10-20)（2026-10-20、`7f68760`）。 EC2も2026-10-20に更新・health確認済み（同公開記録参照）。
- 残作業: なし（このplanの依頼範囲）。
- 将来の拡張・追加確認: なし。
- 確認根拠: #95: 221d21b。
- 最終更新: 2026-10-20

## 経過記録（過去の方針・進捗）

> 現在の判断には上の「現在の状態」を使用する。以下の「次」「未完」「課題」は当時の記録であり、現在の残作業一覧ではない。

- ブランチ: `claude/project-thread-my6ix7`（mamamaki12/open-world）
- 依頼: しんご「友達が自分の土地で建物を建てられるにはどうすればいい？」
- PR: （出したら書く）

### 方針
- 現状: みんなのワールドは `canBuildOn`（src/server/sharedWorld.ts）で持ち主だけ建築可。友達のワールド招待（共同建築チェック）は開始画面から外れている。
- `Lot.builders?: {id,name}[]`（src/state/economy.ts）を追加。持ち主が操作 `{type:'builders', id, name, allow}` で追加/削除（sharedWorld.ts の applyAction）。`canBuildOn` は builders も許可。売買（buyLot）で builders を消す。上限8人。
- UI: 不動産の SharedLot（src/ui/EstatePanel.tsx）に「一緒に建てる人」カード。いまワールドにいる人を追加、登録済みを外す。MapPanel の「あなたの家・土地」に建てられる土地も出してワープ可能に。
- サーバー変更なので EC2 の relay を再取得・再起動が必要（server/README.md）。
- テスト: src/server/sharedWorld.test.ts に許可/解除/持ち主以外の操作拒否/売買で解除。

### 進捗
- 済: サーバー（sharedWorld.ts の builders 操作・canBuildOn）、単体テスト、不動産の「一緒に建てる人」カード、マップのワープ、server/dist 再ビルド。
- 済: scripts/check-lot-builders.mjs（2ブラウザーで許可→友達がワープして建築→外す）をCIに追加、ローカル通過。
- 次: PRマージ後、EC2 の relay を再取得・再起動（server/README.md）。それまで公開版では許可操作がサーバーに拒否される。
