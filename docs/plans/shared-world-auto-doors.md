# 共有ワールドのお店の自動ドア（修正と引き継ぎ）

- ブランチ: `fix/shared-world-auto-doors`
- ベース: main `af2d0c8f303af9261d59f594cae134fcaa684411`。#84（人数HUD）、#82（選択操作）、#75（見た目）の作業を変更しない。
- 依頼: 共有ワールドで遊ぶとお店の自動ドアが開かない。

## 原因と方針
- `src/state/venue.ts: autoVenueDoors`はguestを無条件に除外し、`src/session/session.ts: startSessionTimers`もhostだけ呼んでいた。共有は全員guestなので判定する端末が存在しなかった。
- 共有モードでは自分と他の歩行者の位置から各端末で同じ開閉状態を計算する。自動判定による開閉は通信へ送り返さず、複数端末の判定の往復や競合を避ける。旧招待ルームのguestは従来どおりhostの開閉に従う。
- 車や建築モードの遠隔プレイヤーを歩行者として扱わないよう、姿の通信にwalkingフラグを追加（旧サーバーはposeを中継するだけなのでEC2更新不要）。人が戸口にいる間は閉めない。
- 検証: shared guestの接近/退避、遠隔歩行者、戸口、旧guest、車、複数店舗。型/ビルドと、複数ブラウザーで共有参加者のドア状態を確認。

## 進捗
- 済: 最新mainとplansを確認、専用worktree作成。実装前に本計画を保存。
- 済: shared guestも開閉を判定し、歩行中/運転中フラグを遠隔位置へ引き継ぐ。共有の自動開閉はネットワークへ送り返さない。回帰単体13件（自動ドア6件＋既存店舗7件）通過。
- 検証補修: 既存`climate.ts`と`Climate.tsx`を拡張子なしで参照するとWindowsでは前者へ誤解決し、型/実行時エラーになった。SceneとMoneyBarのコンポーネントimportだけ`.tsx`を明示する。天候の動作は変更しない。
- 次: 自動ドアの条件と歩行者位置の扱いを修正し、回帰検証。
- 未完: 公開反映と検証結果の追記。EC2や保存データの更新は不要。

- Browser verification passed with two isolated Chrome contexts: remote pedestrian, snapshot recovery, remaining visitor, build-mode exclusion and zero automatic-door relay messages.

## Release checkpoint (2026-10-17 JST)
- Done: PR #85 merged as a71e38d270cd36e366e96da2d22201ef4cb5cd90 after CI run 39005423585 succeeded in all three jobs.
- User confirmed the EC2 update completed. Independent Chrome verification returned health=ok and a successful WSS connection.
- The EC2 executable was pinned to a17fbd935fc59fb7571adfdcaec1681c2508a81c (same runtime code as the merged release). Earlier draft/deployment hold notes above are resolved.
- GitHub Pages publication is being verified; no additional server changes are required for this release.

- Done: GitHub Pages deployment run 39021467469 succeeded. A fresh Chrome context with service workers blocked fetched the public site (HTTP 200), loaded assets/index-DvovbPU4.js and verified both new wallet and dispersed-shop code. Release is public at https://mamamaki12.github.io/open-world/ . All requested work in PR #85 is complete.
