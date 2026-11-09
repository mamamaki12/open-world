# ドアを開けるボタンを右寄りにする

状態: 完了（プルリクエスト待ち）
ブランチ: claude/project-thread-jtvrfl

## 目的
スマホの歩く画面で、「ドアを開ける/閉める」などのアクションボタン（.door-prompts）が画面中央にあり、右手の親指で押しにくい（しんご 2026-11-09）。

## やり方
- タッチ端末では .door-prompts を画面中央でなく右寄り（右下の 削除・建てる の列のすぐ左）に置く。
- ドア・窓・座る・クローゼット・お店・車に乗る など、同じ .door-prompts を使うボタンは全部同じ位置になる。
- 複数あるときは縦に積む。削除・建てる・ジャンプと重ならないこと（scripts/check-hud-overlap.mjs）。

## 進み具合
- 済: タッチの歩く画面で .door-prompts を右寄りに（src/ui/game-ui.css の末尾）
  - 横持ち: 削除・建てる の列のすぐ左（right 104px, bottom 96px）
  - 縦持ち: 横に余裕がないので 削除 の真上（right 16px, bottom 164px）。長押しで削除ボタンがあるときはさらに上（226px）
- 済: scripts/check-door-prompt-right.mjs（縦横7サイズ × 手ぶら/壁/削除）を CI に追加。check-hud-overlap（スマホ3サイズ）も通過
- 残作業: なし
