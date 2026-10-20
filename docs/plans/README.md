# plansの現在地と書き方

最終確認: **2026-10-20**。まずこの一覧と、各planの先頭の「現在の状態」を読む。下の経過記録に残る「次」「未完」は当時の記録であり、現在の残作業には数えない。

## 未完了の作業

このブランチの56planは、完了53件・移行済み1件・未着手2件。加えて、別ブランチのPR #98に作業中のplanが2件ある。以下にすべて掲載する。

| plan | 状態 | 次に行うこと |
| --- | --- | --- |
| [複数選択・一括移動](https://github.com/mamamaki12/open-world/blob/codex/fix-bulk-selection/docs/plans/bulk-selection.md) | 作業中 | [PR #98](https://github.com/mamamaki12/open-world/pull/98)の未push差分を回収し、操作終了時の状態クリア、PC/スマホ検証、CI・公開。 |
| [現在地から建築カメラへ切替](https://github.com/mamamaki12/open-world/blob/codex/fix-bulk-selection/docs/plans/build-camera-entry.md) | 作業中 | PR #98のローカル実装を回収し、実ブラウザ検証、push・公開。 |
| [ユーザーが自分で考えたお店を開く（第1段階・実装方針と進捗）](player-shops.md) | 未着手 | コイン式の乗り物を、ゲーム機と同じ料金精算の仕組みで追加する（未着手）。第1〜5段階と第6段階のゲーム機は公開済み。 |
| [公開版のUI総点検と修正（実装方針と進捗）](ui-qa.md) | 未着手 | モーダル見出しの絵文字など細かな表示統一（未着手）。列挙した不具合修正と人数表示は公開済み。 |

PR #98の2件はこのmain由来のブランチには存在しない。リンク先のブランチが正本。未pushの実装は引き継ぎ記録上の情報であり、コード回収・動作確認が済んだとは扱わない。PR本文とplanの記録は2026-10-20に確認。

## 将来の拡張・追加確認（上の必須残作業とは別）

完了済みでも、実機での追加確認や将来案を消さない。既知の検証の限界もここに記す。必要になった時に依頼範囲を決め、別planとして着手する。

| plan | 将来案・追加確認・検証の限界 |
| --- | --- |
| [新規開始時の見た目作成画面を維持する](appearance-onboarding.md) | 公開版で初回の見た目作成を再確認する場合は経過記録の補助スクリプトを参照。公開成功と初回画面の実機確認は区別する。 |
| [服屋UIと滑らかな人物・立体的な服](boutique-fashion-and-avatar.md) | 実機iOSでの表示・タッチ操作確認（画面幅を模したブラウザ検証は済み）。 |
| [車のカスタムショップ（STANCE GARAGE）](car-custom-shop.md) | 実際に運転し、エンジン音の聞こえ方を確認。 |
| [PCの建物LODと室内・家具の距離制御](desktop-building-detail.md) | 実機で描画品質・性能を追加確認する場合は、CIの描画比較を基準にする。 |
| [取引・画面終了・通信断・復元の追加検証](extended-gameplay-audit.md) | 共有の精算記録（receipts）増加時のサイズ・性能と、店舗の非同期決済中の画面遷移を追加調査。未再現の懸念。 |
| [家具を自分でデザインする](furniture-designer.md) | 自作家具の販売連携、部品の回転、取っ手の種類、引き出しへの収納。元の制作・配置機能の完了とは別の拡張案。 |
| [ゲスト参加・オフライン・共同建築（実装方針と引き継ぎ）](guest-world-multiplayer.md) | ログインとアカウント移行・不正対策。通常の共同プレイは[共有ワールド](shared-public-world.md)へ移行済み。 |
| [オフラインキャッシュ更新で旧版HTMLを残さない](offline-update-cache.md) | 既存ブラウザプロファイルを使った公開版の更新再確認（生成SWによるCI検証は済み）。 |
| [リアルなバイトのミニゲーム（実装方針と進捗）](part-time-jobs.md) | 実際のプレイに応じた給料額のバランス調整。 |
| [ユーザーが自分で考えたお店を開く（第1段階・実装方針と進捗）](player-shops.md) | 自作家具の販売、月額課金・権限貸し・レビュー。仕事の依頼と単発の報酬支払いは実装済み。 |
| [全員で一つの共有ワールド（方針・引き継ぎ）](shared-public-world.md) | アカウント・不正対策、カジノやバイト報酬のサーバー計算。所持金の後続仕様は[共有口座](shared-wallet-casino-spawn.md)、建築許可は[共同建築](lot-builders.md)を優先。 |
| [お店の内装を作り込む（実装方針と進捗）](shop-interiors.md) | 店員・お客の人形、BGM（追加要望があれば別作業）。 |
| [証券取引所（実装方針と進捗）](stock-exchange.md) | 株価提供元がアクセスを拒否した場合の代替取得先。共有口座への株の保存は[共有ワールド](shared-public-world.md)で実装済み。 |
| [デフォルト店舗の入口を道路側へ向ける](storefront-road-facing.md) | 公開版の店舗入口を実ブラウザで再確認（当時の検証ホスト切断により未実施）。 |
| [デフォルト住宅の通行・転落防止改修](town-house-safety.md) | 実画面で住宅の見え方・生活動線を追加確認（当時は衝突判定の自動テストとCIで検証）。 |
| [公開版のUI総点検と修正（実装方針と進捗）](ui-qa.md) | 新たな画面改善は別planで管理。共有画面の修正は[共有UI点検](shared-ui-qa.md)を参照。 |
| [季節・天気・昼夜（実装方針と進捗）](weather-seasons-daynight.md) | 街灯で地面を照らす描画は負荷のため見送り。スマホ歩行画面の時計も追加案。 |

## 完了したplan

機能の51planは各PRのマージと、同変更を含むPages公開成功（[実行39414666612](https://github.com/mamamaki12/open-world/actions/runs/39414666612)、コミット7f68760）を照合。文書整理の1planはPR #100のmain反映で完了。公開版での個別機能の再操作まですべて実施したという意味ではない。追加確認の限界は上の一覧と各planへ残す。EC2の更新待ちは2026-10-20の更新・health確認で解消済み（[公開記録](extended-gameplay-audit.md#公開完了2026-10-20)）。

| plan | 状態 | PR |
| --- | --- | --- |
| [plansの状態表示と一覧](plan-status-index.md) | 完了 | [#100](https://github.com/mamamaki12/open-world/pull/100)（文書のみ） |
| [ゲーム内時間の流れを遅くする](slower-climate.md) | 完了 | [#103](https://github.com/mamamaki12/open-world/pull/103)（マージ済み） |
| [描画更新直後の照準が別建物を誤検出する不具合](aim-world-matrix-refresh.md) | 完了 | [#87](https://github.com/mamamaki12/open-world/pull/87)（マージ済み） |
| [Web版のバージョン表示と最新版確認](app-version-status.md) | 完了 | [#97](https://github.com/mamamaki12/open-world/pull/97)（マージ済み） |
| [新規開始時の見た目作成画面を維持する](appearance-onboarding.md) | 完了 | [#96](https://github.com/mamamaki12/open-world/pull/96)（マージ済み） |
| [アバターの見た目作成 + 美容室](avatar-looks-and-salon.md) | 完了 | [#75](https://github.com/mamamaki12/open-world/pull/75)（マージ済み） |
| [服屋UIと滑らかな人物・立体的な服](boutique-fashion-and-avatar.md) | 完了 | [#59](https://github.com/mamamaki12/open-world/pull/59)（マージ済み） |
| [服屋さん4店舗 + アバターを滑らかに](boutiques.md) | 完了 | [#49](https://github.com/mamamaki12/open-world/pull/49)（マージ済み） |
| [ブレーキ長押しでバック](brake-to-reverse.md) | 完了 | [#62](https://github.com/mamamaki12/open-world/pull/62)（マージ済み） |
| [非同期条件を待たないブラウザーテストの修正](browser-async-condition-waits.md) | 完了 | [#87](https://github.com/mamamaki12/open-world/pull/87)（マージ済み） |
| [車のカスタムショップ（STANCE GARAGE）](car-custom-shop.md) | 完了 | [#48](https://github.com/mamamaki12/open-world/pull/48)（マージ済み） |
| [PCの建物LODと室内・家具の距離制御](desktop-building-detail.md) | 完了 | [#61](https://github.com/mamamaki12/open-world/pull/61)（マージ済み） |
| [運転中に視点を回せるようにする](drive-camera-look.md) | 完了 | [#52](https://github.com/mamamaki12/open-world/pull/52)（マージ済み） |
| [運転中の操作ボタンと一人称の車内を整える](drive-pedals-cockpit.md) | 完了 | [#55](https://github.com/mamamaki12/open-world/pull/55)（マージ済み） |
| [取引・画面終了・通信断・復元の追加検証](extended-gameplay-audit.md) | 完了 | [#87](https://github.com/mamamaki12/open-world/pull/87)（マージ済み） |
| [着工無料・土地代に周辺の建物の多さ・所持金100万円スタート](free-build-land-density.md) | 完了 | [#67](https://github.com/mamamaki12/open-world/pull/67)（マージ済み） |
| [家具デザイン中の背後への操作漏れ](furniture-designer-input-isolation.md) | 完了 | [#87](https://github.com/mamamaki12/open-world/pull/87)（マージ済み） |
| [家具を自分でデザインする](furniture-designer.md) | 完了 | [#73](https://github.com/mamamaki12/open-world/pull/73)（マージ済み） |
| [Furniture lighting](furniture-lighting.md) | 完了 | [#86](https://github.com/mamamaki12/open-world/pull/86)（マージ済み） |
| [ゲスト参加・オフライン・共同建築（実装方針と引き継ぎ）](guest-world-multiplayer.md) | 完了 | [#64](https://github.com/mamamaki12/open-world/pull/64)（マージ済み） |
| [通常ブレーキの緩和とサイドブレーキ・ドリフト](handbrake-drift.md) | 完了 | [#62](https://github.com/mamamaki12/open-world/pull/62)（マージ済み） |
| [隣の土地をつなげる・町並み（歩道・街灯・信号）](join-lots-and-streetscape.md) | 完了 | [#50](https://github.com/mamamaki12/open-world/pull/50)、[#54](https://github.com/mamamaki12/open-world/pull/54)（マージ済み） |
| [友達に自分の土地で建ててもらう（実装方針と進捗）](lot-builders.md) | 完了 | [#95](https://github.com/mamamaki12/open-world/pull/95)（マージ済み） |
| [スマホの運転画面と相乗り](mobile-driving-ui.md) | 完了 | [#88](https://github.com/mamamaki12/open-world/pull/88)、[#89](https://github.com/mamamaki12/open-world/pull/89)（マージ済み） |
| [移動中の画面ダブルタップでジャンプ](moving-double-tap-jump.md) | 完了 | [#62](https://github.com/mamamaki12/open-world/pull/62)（マージ済み） |
| [オフラインキャッシュ更新で旧版HTMLを残さない](offline-update-cache.md) | 完了 | [#94](https://github.com/mamamaki12/open-world/pull/94)（マージ済み） |
| [リアルなバイトのミニゲーム（実装方針と進捗）](part-time-jobs.md) | 完了 | [#69](https://github.com/mamamaki12/open-world/pull/69)（マージ済み） |
| [バックアップの個人データ欠落](profile-backup-completeness.md) | 完了 | [#87](https://github.com/mamamaki12/open-world/pull/87)（マージ済み） |
| [車を実車っぽく（外装・内装）＋カタログUIの見直し](realistic-cars.md) | 完了 | [#77](https://github.com/mamamaki12/open-world/pull/77)（マージ済み） |
| [バックアップ復元と自動保存の競合](save-import-serialization.md) | 完了 | [#87](https://github.com/mamamaki12/open-world/pull/87)（マージ済み） |
| [共有ワールドの車位置同期（実装方針と進捗）](shared-car-position-sync.md) | 完了 | [#87](https://github.com/mamamaki12/open-world/pull/87)（マージ済み） |
| [共有ワールド初期受信前の操作開始](shared-join-readiness.md) | 完了 | [#87](https://github.com/mamamaki12/open-world/pull/87)（マージ済み） |
| [共有地図の土地所有者表示（実装方針と進捗）](shared-map-ownership.md) | 完了 | [#93](https://github.com/mamamaki12/open-world/pull/93)（マージ済み） |
| [全員で一つの共有ワールド（方針・引き継ぎ）](shared-public-world.md) | 完了 | [#74](https://github.com/mamamaki12/open-world/pull/74)（マージ済み） |
| [共有ワールドの新しい入室で古い接続を終了する](shared-session-takeover.md) | 完了 | [#93](https://github.com/mamamaki12/open-world/pull/93)（マージ済み） |
| [共有ワールドを2ブラウザで点検（実装方針と進捗）](shared-ui-qa.md) | 完了 | [#93](https://github.com/mamamaki12/open-world/pull/93)、[#94](https://github.com/mamamaki12/open-world/pull/94)（マージ済み） |
| [Shared wallet and casino spawn](shared-wallet-casino-spawn.md) | 完了 | [#85](https://github.com/mamamaki12/open-world/pull/85)（マージ済み） |
| [共有ワールドのお店の自動ドア（修正と引き継ぎ）](shared-world-auto-doors.md) | 完了 | [#85](https://github.com/mamamaki12/open-world/pull/85)（マージ済み） |
| [共有ワールド更新の直列化（実装方針と進捗）](shared-world-mutation-queue.md) | 完了 | [#87](https://github.com/mamamaki12/open-world/pull/87)（マージ済み） |
| [お店の内装を作り込む（実装方針と進捗）](shop-interiors.md) | 完了 | [#68](https://github.com/mamamaki12/open-world/pull/68)（マージ済み） |
| [ほかのプレイヤーの動きを滑らかに（実装方針と進捗）](smooth-remote-players.md) | 完了 | [#91](https://github.com/mamamaki12/open-world/pull/91)、[#92](https://github.com/mamamaki12/open-world/pull/92)（マージ済み） |
| [証券取引所（実装方針と進捗）](stock-exchange.md) | 完了 | [#71](https://github.com/mamamaki12/open-world/pull/71)（マージ済み） |
| [株の極小口数売却（実装方針と進捗）](stock-sale-precision.md) | 完了 | [#87](https://github.com/mamamaki12/open-world/pull/87)（マージ済み） |
| [株の分割売却による円丸め利益](stock-split-sale-rounding.md) | 完了 | [#87](https://github.com/mamamaki12/open-world/pull/87)（マージ済み） |
| [デフォルト店舗の入口を道路側へ向ける](storefront-road-facing.md) | 完了 | [#96](https://github.com/mamamaki12/open-world/pull/96)（マージ済み） |
| [左右ボタンの旋回を強める](stronger-button-steering.md) | 完了 | [#62](https://github.com/mamamaki12/open-world/pull/62)（マージ済み） |
| [3階以上の建物を建てられるようにする](tall-buildings.md) | 完了 | [#53](https://github.com/mamamaki12/open-world/pull/53)（マージ済み） |
| [建てた建築材料：タップで1ブロック選択・長押しで1ブロック削除](tap-select-longpress-delete.md) | 完了 | [#82](https://github.com/mamamaki12/open-world/pull/82)（マージ済み） |
| [デフォルト住宅の通行・転落防止改修](town-house-safety.md) | 完了 | [#60](https://github.com/mamamaki12/open-world/pull/60)（マージ済み） |
| [町に最初から建っている家を増やす（実装方針と進捗）](town-houses.md) | 完了 | [#51](https://github.com/mamamaki12/open-world/pull/51)、[#57](https://github.com/mamamaki12/open-world/pull/57)（マージ済み） |
| [Town shop distribution](town-shop-distribution.md) | 完了 | [#85](https://github.com/mamamaki12/open-world/pull/85)（マージ済み） |
| [車の壁の辺・角の当たり判定](vehicle-wall-edges.md) | 完了 | [#63](https://github.com/mamamaki12/open-world/pull/63)（マージ済み） |
| [季節・天気・昼夜（実装方針と進捗）](weather-seasons-daynight.md) | 完了 | [#70](https://github.com/mamamaki12/open-world/pull/70)、[#90](https://github.com/mamamaki12/open-world/pull/90)（マージ済み） |

## 移行済みのplan

旧方式を再開するための残作業として扱わず、移行先の仕様を使用する。

| plan | 状態 | 移行先 |
| --- | --- | --- |
| [プレイヤー同士の家（土地）の売買（実装方針と進捗）](player-house-trade.md) | 移行済み | [共有ワールド](shared-public-world.md)・PR #74。旧招待方式の自宅売買案を置き換えた。 |

## 状態の意味

| 状態 | 判断基準 |
| --- | --- |
| 未着手 | 残作業はあるが、まだ実装していない。 |
| 作業中 | 実装・修正を進めている。未pushの差分も明記する。 |
| 検証待ち | 対象の実装は終わり、必要なテスト・動作確認が残っている。 |
| 公開待ち | 必要な検証は済み、マージ・配信・必要なサーバー更新や公開確認が残っている。 |
| 完了 | このplanの依頼範囲について必要な検証、マージ、公開確認が済み、残作業がない。文書のみの変更はmainへの反映まで。追加案や任意の実機確認は別欄に残す。 |
| 保留 | 理由や再開条件を明記して作業を止めている。完了ではない。 |
| 移行済み | 方針変更により別planへ置き換えた。移行先を明記する。 |

一部だけ完了しているplanは、残った範囲の状態を付ける。たとえば店舗はゲーム機まで公開済みでも、依頼済みの乗り物が未実装なら「未着手」として残す。

## 更新ルール

1. 実装の前に1機能1ファイルのplanを作り、作業ブランチへcommit・pushする。ファイル名は英小文字とハイフン。
2. 着手前に作業差分を保護し、最新main、マージ済みPR、作業中ブランチのplansを確認する。
3. 小さくcommit・pushするたび、先頭の状態・残作業・最終更新日を上書きし、下の経過記録へ実施内容を追記する。先頭に古い「次」を積み重ねない。
4. READMEの該当行も同じcommitで更新し、状態が変わったplanは一覧の区分を移す。別ブランチのplanもリンクと所在を載せる。
5. PRのマージだけで公開完了としない。公開先・CI/配信の結果、必要ならサーバー更新を確認根拠に残す。まだ確認できなければ「公開待ち」とする。
6. 完了時は「残作業: なし」とする。将来案や任意の追加確認は別欄へ移し、必須の未検証事項は残作業に残す。完了planは削除しない。
7. 過去の方針や検証記録は「経過記録」に保持する。現在の仕様と異なる場合は先頭で訂正・移行先を示す。
8. 短く書き、コードの説明はファイルパス・関数名で示す。トークンや秘密情報は書かない。

## 新規planのテンプレート

```markdown
# 機能名

## 現在の状態

- 状態: 未着手
- PR: 未作成
- 公開: 未公開
- 残作業: 次の担当が最初に行う具体的な作業（1〜3項目）。
- 将来の拡張・追加確認: なし。
- 確認根拠: 確認したmain・PR・テスト・配信結果（未確認なら未確認と書く）。
- 最終更新: YYYY-MM-DD

- ブランチ: codex/機能名
- 依頼: 利用者が依頼した範囲。

## 方針

- 対象ファイルと実装方法、守る仕様、必要な検証。

## 経過記録

- YYYY-MM-DD: 実施した作業・検証結果・中断時の未push差分と保存場所。
```
