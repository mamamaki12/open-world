# スマホで音楽を流したまま遊ぶ

## 現在の状態

- 状態: 実装中
- ブランチ: `claude/project-thread-g2sjwz`
- 残作業: 実装、CI、マージ。実機（iPhone/Android）での最終確認はしんごさん
- 確認根拠: （実装後に記入）
- 最終更新: 2026-10-21

## 目的

Spotify などで音楽を流したままゲームを開いても、音楽が止まらないようにする。

## 原因

`src/ui/casino/voice.ts` が画面に触れるたびに（カジノ以外でも）
- `navigator.audioSession.type = 'playback'` にする
- 無音の `<audio>` を再生する（マナーモードでも鳴らすため）
- 無音の読み上げ（speechSynthesis）をする

これで iPhone のオーディオが「再生」扱いになり、他のアプリの音楽が止まる。

## 方針

1. 起動時に `navigator.audioSession.type = 'ambient'`（iOS Safari 17+）。効果音は音楽と混ざって鳴る
2. 無音 `<audio>` 再生と `playback` 切り替えをやめる（代わりにマナーモード中はゲーム音が鳴らない）
3. 無音の読み上げ（声の準備）はカジノを開いているあいだだけ。カジノの実況が話すときは端末の仕様で音楽が一時的に止まることがある（🔊で消せる）
4. AudioContext は今まで通り、音を鳴らすときに初めて作る
