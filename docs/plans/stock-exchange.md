# 証券取引所（実装方針と進捗）

## 現在の状態

- 状態: 完了
- PR: [#71](https://github.com/mamamaki12/open-world/pull/71)（マージ済み）
- 公開: [Pages成功・公開版確認](extended-gameplay-audit.md#公開完了2026-10-20)（2026-10-20、`7f68760`）。
- 残作業: なし（このplanの依頼範囲）。
- 将来の拡張・追加確認: 株価提供元がアクセスを拒否した場合の代替取得先。共有口座への株の保存は[共有ワールド](shared-public-world.md)で実装済み。
- 確認根拠: #71: 20cc558。market-dataのmain実行も2026-10-20に成功確認。
- 最終更新: 2026-10-20

## 経過記録（過去の方針・進捗）

> 現在の判断には上の「現在の状態」を使用する。以下の「次」「未完」「課題」は当時の記録であり、現在の残作業一覧ではない。

- ブランチ: `claude/project-thread-1w5crm`（mamamaki12/open-world）
- 依頼: しんご「証券取引所も追加して、実際の日経平均とかS&P500とか買えるようにして。値動きも実際の証券と同じにして」
- PR: （出したら書く）

### 方針
- 実データ: ブラウザ(GitHub Pages)から Yahoo Finance / Stooq を直接読むと CORS で拒否される。
  そこで GitHub Actions の定期実行(`.github/workflows/market-data.yml`, 約15分ごと)で Yahoo Finance の chart API から取得し、
  `market-data` ブランチの `quotes.json` に1コミットだけ上書き push。ゲームは `raw.githubusercontent.com`(CORS可)から読む。
  → 実際の値動きに 15〜30分遅れで追従（無料の株価表示と同程度）。取得失敗時は最後に読めた値で取引。
- 銘柄: 日経平均・TOPIX連動ETF・S&P500・NYダウ・NASDAQ・米ドル円 など。ドル建ては為替で円換算。円の金額で端数口数まで買える。
- 取得スクリプト: `scripts/fetch-market.mjs`（Nodeのみ、依存なし）。
- 状態: `src/state/stocks.ts`（保有口数・平均取得単価、localStorage `open-world:stocks:v1`）。お金は `useEconomy` の spend/receive。
- 建物: 既存の店と同じ歩いて入る方式（`src/world/VenueShell.tsx`）。`src/building/venues.ts` に `exchange` を追加し、外観・店内・電光掲示板を作る。入口で F → 取引パネル(overlay `exchange`)。
- テスト: 価格換算/損益の単体テスト、型チェック、ビルド、スクリーンショット。

### 進捗
- 済: 方針決定、計画をpush
- 済: 取得ワークフロー動作確認（market-data ブランチに quotes.json、raw から CORS 可で 200）
- 済: `src/economy/stocks.ts`(計算+テスト)、`src/state/stocks.ts`(口座)、`src/ui/ExchangePanel.tsx`(売買画面)、`src/building/exchange.ts`+`src/world/ExchangeBuilding.tsx`(建物・電光掲示・店内ボード)、venues/地図/当たり判定へ追加
- 済: ブラウザ確認 `node scripts/check-exchange.mjs pc`（vite dev 5173）：外観・店内ボード・売買・保有が動作、例外なし
- 次: PR → CI → マージ。マージ後 schedule が main で動き出すことを確認
- 課題: 株の保有はこの端末の localStorage（`open-world:stocks:v1`）。オンラインのプロフィール持ち込みには未対応
- 課題: ワークフローの定期実行は main にマージ後に有効。Yahoo が GitHub の IP を拒否したら Stooq に切り替え。
