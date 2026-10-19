# 友達に自分の土地で建ててもらう（実装方針と進捗）

- ブランチ: `claude/project-thread-my6ix7`（mamamaki12/open-world）
- 依頼: しんご「友達が自分の土地で建物を建てられるにはどうすればいい？」
- PR: （出したら書く）

## 方針
- 現状: みんなのワールドは `canBuildOn`（src/server/sharedWorld.ts）で持ち主だけ建築可。友達のワールド招待（共同建築チェック）は開始画面から外れている。
- `Lot.builders?: {id,name}[]`（src/state/economy.ts）を追加。持ち主が操作 `{type:'builders', id, name, allow}` で追加/削除（sharedWorld.ts の applyAction）。`canBuildOn` は builders も許可。売買（buyLot）で builders を消す。上限8人。
- UI: 不動産の SharedLot（src/ui/EstatePanel.tsx）に「一緒に建てる人」カード。いまワールドにいる人を追加、登録済みを外す。MapPanel の「あなたの家・土地」に建てられる土地も出してワープ可能に。
- サーバー変更なので EC2 の relay を再取得・再起動が必要（server/README.md）。
- テスト: src/server/sharedWorld.test.ts に許可/解除/持ち主以外の操作拒否/売買で解除。

## 進捗
- 次: 実装
