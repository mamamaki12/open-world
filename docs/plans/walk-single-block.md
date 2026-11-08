# 歩く画面は1ブロックずつ、建築画面はドラッグで範囲配置

- 状態：公開待ち
- 残作業：PRのCIとマージ
- 確認根拠：`scripts/check-block-vs-range.mjs`（スマホの建築画面で床・壁をドラッグ→広い範囲・長い壁、歩く画面の三人称でドラッグ→1ブロック）、`scripts/check-aim-controls.mjs`（照準のタップ・配置ボタン・PCの右クリックで1ブロック）。check-build-controls / check-phone-build-ux / check-touch-place-no-rotate / check-connected-floors / check-shared-floor-extension、vitest も通過
- ブランチ：`claude/project-thread-e1ymqt`
- 依頼：しんご 2026-11-08「歩く画面で建築するときは固定で1ブロックずつしか配置できないようにして、建築の画面ではドラッグで広い範囲をまとめて一括で配置できるようにして」

## 方針
- 歩く画面（照準・三人称とも、スマホもPCも）：床・屋根は狙った1マス、壁は狙った位置にいちばん近いマスの辺1本（1マス分の長さ）をタップ／クリック1回で置く。始点・終点はなくす（PR #147 の「始点→終点」をやめる）。
- 建築画面：今までどおり床・壁・屋根はドラッグした範囲に一括で置く（スマホは PR #144/#149 で1本指＝配置、2本指＝カメラ）。階段・家具・ドア・窓は1つずつで、指でずらして離した所に置く（#149 のまま）。
- 1ブロックの形は `src/building/singleBlock.ts`（テストあり）にまとめ、照準（AimBuilder）と三人称（PlacementController）の両方で使う。

## 進捗
- 済：計画、実装（`singleBlock.ts`、`aimBuild.ts` から始点・終点を削除、`PlacementController.tsx` の歩く画面は離した所に1ブロック）、確認スクリプトとCI
- 次：PRのマージ
