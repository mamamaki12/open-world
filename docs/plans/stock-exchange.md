# 証券取引所（実装方針と進捗）

- ブランチ: `claude/project-thread-1w5crm`（mamamaki12/open-world）
- 依頼: しんご「証券取引所も追加して、実際の日経平均とかS&P500とか買えるようにして。値動きも実際の証券と同じにして」
- PR: （出したら書く）

## 方針
- 実データ: ブラウザ(GitHub Pages)から Yahoo Finance / Stooq を直接読むと CORS で拒否される。
  そこで GitHub Actions の定期実行(`.github/workflows/market-data.yml`, 約15分ごと)で Yahoo Finance の chart API から取得し、
  `market-data` ブランチの `quotes.json` に1コミットだけ上書き push。ゲームは `raw.githubusercontent.com`(CORS可)から読む。
  → 実際の値動きに 15〜30分遅れで追従（無料の株価表示と同程度）。取得失敗時は最後に読めた値で取引。
- 銘柄: 日経平均・TOPIX連動ETF・S&P500・NYダウ・NASDAQ・米ドル円 など。ドル建ては為替で円換算。円の金額で端数口数まで買える。
- 取得スクリプト: `scripts/fetch-market.mjs`（Nodeのみ、依存なし）。
- 状態: `src/state/stocks.ts`（保有口数・平均取得単価、localStorage `open-world:stocks:v1`）。お金は `useEconomy` の spend/receive。
- 建物: 既存の店と同じ歩いて入る方式（`src/world/VenueShell.tsx`）。`src/building/venues.ts` に `exchange` を追加し、外観・店内・電光掲示板を作る。入口で F → 取引パネル(overlay `exchange`)。
- テスト: 価格換算/損益の単体テスト、型チェック、ビルド、スクリーンショット。

## 進捗
- 済: 方針決定、計画をpush
- 次: 取得スクリプトとワークフロー → 状態とパネル → 建物
- 課題: ワークフローの定期実行は main にマージ後に有効。Yahoo が GitHub の IP を拒否したら Stooq に切り替え。
