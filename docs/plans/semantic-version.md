# Web版のバージョン番号を「1.12.5」形式にする

## 現在の状態

- 状態: 完了
- PR: [#128](https://github.com/mamamaki12/open-world/pull/128)（マージ済み）
- 公開: Pages 成功（2026-10-24、12aecfc、Web版 1.0.0）
- 残作業: なし。
- 将来の拡張・追加確認: なし。
- 確認根拠: vitest 725件成功、npm run build で version.json が 1.0.0、scripts/check-app-version.mjs（PC/スマホ・更新あり/オフライン）成功。
- 最終更新: 2026-10-24

- ブランチ: claude/project-thread-oa34x3
- 依頼: しんご「バージョンは英数字の混合文字列ではなく 1.12.5 のような表示にしてほしい。番号の管理は任せる」。

## 方針

- 表示用 `version` だけを変える。更新チェックは `id`（コミット+ビルド日時）と `builtAt` で比較しているので触らない（src/ui/version.ts）。
- package.json の `version` を MAJOR.MINOR の正とし、PATCH はビルド時に自動計算する: package.json の version 行を最後に変えたコミットから、main の first-parent 上のコミット数（`[skip ci]` を除く）を足す。
- 大きな機能を入れるPRは package.json の MINOR を上げて PATCH を 0 にする。修正だけのPRは何もしない（マージで自動的に PATCH が1増える）。
- deploy.yml は fetch-depth: 0 で履歴を取る。履歴が取れないとき（浅いクローン・アーカイブ）は package.json の version をそのまま表示。
- ルールは docs/versioning.md、CLAUDE.md、AGENTS.md（Codex 用）に書く。

## 経過記録

- 2026-10-23: 計画を作成。
- 2026-10-23: scripts/app-version.mjs を追加し vite.config.ts の version を置き換え。package.json を 1.0.0 に。deploy.yml に fetch-depth: 0。docs/versioning.md・CLAUDE.md・AGENTS.md にルール。
- 2026-10-24: CI の runner を ubuntu-24.04 に固定（ubuntu-latest=26.04 で Playwright 非対応）。#128 マージ、Deploy run 40049065494 成功。
