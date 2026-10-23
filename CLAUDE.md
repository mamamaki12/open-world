# CLAUDE.md

## My海馬（作業の記録）

このアプリの記録は、GitHub の `mamamaki12/my-kaiba-ai`（Obsidian の保管庫）の `20_開発/進行中/open-world/` にある（アーカイブに移したら `20_開発/アーカイブ/open-world/`）。

- 作業を始める前に、そのフォルダーの `概要.md` を読む。
- 作業が一区切りしたら（push した・プルリクエストを作った）、記録を更新して my-kaiba-ai の main に push する。ユーザーに毎回頼まれなくてよい。
- 細かい手順は my-kaiba-ai の `AGENTS.md` の「アプリのリポジトリから使うとき」に従う。

## バージョン番号

ゲーム内のバージョン（1.12.5 形式）のルールは `docs/versioning.md`。新機能のPRは package.json の MINOR を上げる。修正だけのPRは何もしない（PATCH はマージで自動的に上がる）。
