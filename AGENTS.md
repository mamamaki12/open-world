# AGENTS.md

## バージョン番号

ゲーム内のバージョン（1.12.5 形式）のルールは `docs/versioning.md`。新機能のPRは package.json（と package-lock.json の先頭2か所）の `version` の MINOR を1上げて PATCH を 0 にする。修正だけのPRは何もしない（PATCH はマージで自動的に上がる）。
