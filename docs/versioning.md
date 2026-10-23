# バージョン番号のルール

ゲーム内（開始画面・セーブ画面）に「Web版 1.12.5」のように表示する番号の決め方。Claude・Codex・人のどのPRもこのルールに従う。

## 形式

`MAJOR.MINOR.PATCH`（例: 1.12.5）

| 桁 | いつ上がるか | 誰が上げるか |
| --- | --- | --- |
| MAJOR | セーブの互換がなくなる・ゲームの作り直しなど、ごく大きな区切り | しんごと相談して、PRで package.json を手で変える |
| MINOR | 新しい機能・新しい場所・遊び方が増える大きめの変更 | そのPRで package.json の `version` を手で上げ、PATCH を 0 にする（例: 1.12.5 → 1.13.0） |
| PATCH | 不具合の修正・調整・小さな改善 | **自動**。何もしない |

## PATCH の自動計算

ビルド時に `scripts/app-version.mjs` が計算する。

- package.json の `version`（例: `1.13.0`）を起点にする。
- その `"version":` 行を最後に変えたコミットから、main の first-parent 上のコミット数を PATCH に足す。PRは squash マージなので、マージ1回で PATCH が1上がる。
- `[skip ci]` を含むコミット（docs だけの記録など、公開されないもの）は数えない。
- 履歴が取れないとき（浅いクローン・ソースアーカイブ）は package.json の値をそのまま出す。公開ビルドは deploy.yml で `fetch-depth: 0` にしてある。
- 手元で確認: `node scripts/app-version.mjs`

## PRを出すときの確認

1. 新機能のPRなら package.json と package-lock.json（先頭2か所）の `version` の MINOR を1上げ、PATCH を 0 にする。修正だけなら触らない。
2. 同時に別のPRも MINOR を上げていてコンフリクトしたら、main の値からさらに1上げる。
3. 番号を下げない・飛ばさない。

## 更新チェックとの関係

最新版かどうかの判定は `version.json` の `id`（コミット+ビルド日時）と `builtAt` で行う（src/ui/version.ts）。表示用の `version` は判定に使わないので、番号の付け方を変えても更新チェックは壊れない。
