# スマホで階段・家具を置くとき、指でずらしても画面を回さない

- 状態：公開待ち
- 残作業：PRのCIとマージ
- 確認根拠：`scripts/check-touch-place-no-rotate.mjs` に階段・ソファを追加（ずらしてもカメラが動かず、離した場所に置ける）。修正前のコードでは階段で失敗を確認。check-build-controls / check-aim-controls / check-phone-build-ux、vitest も通過
- ブランチ：`claude/project-thread-hu5kh0`
- 依頼：しんご 2026-11-08「階段とかその他のもの配置するときも置く場所を移動させたいのに視点が移動する」
- 前の作業：[touch-place-no-rotate.md](touch-place-no-rotate.md)（床・壁・屋根、PR #144）

## 方針
- 階段・家具（床に置くもの）も、土地の中で触れた1本指は「置く」に予約する（`reservesTouch`）。
- 指を動かすとプレビューが指についていき、離した場所に置く（今は12px以上動かすと置かずに回転していた）。
- 土地の外から触れた指・2本指は今までどおりカメラ。壁に付ける家具（表札など）とドア・窓は別の仕組みなので今回は対象外。

## 進捗
- 済：`reservesTouch` に階段・家具を追加、指で触れたまま動かしたら離した場所に置く（`PlacementController` の touch の tap 処理）、確認スクリプト追加
- 次：PRのマージ
