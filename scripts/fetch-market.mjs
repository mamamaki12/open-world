// 実際の相場を Yahoo Finance の chart API から取って quotes.json に書く（GitHub Actions で定期実行）。
// 使い方: node scripts/fetch-market.mjs out.json
import { writeFileSync } from 'node:fs';

const SYMBOLS = ['^N225', '1306.T', '^GSPC', '^DJI', '^IXIC', 'JPY=X', '7203.T', '6758.T', 'AAPL', 'NVDA'];
const UA = { 'User-Agent': 'Mozilla/5.0 (open-world market fetch)' };

async function chart(symbol, range, interval) {
  for (const host of ['query1', 'query2']) {
    const r = await fetch(`https://${host}.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`, { headers: UA });
    if (r.ok) return (await r.json()).chart.result[0];
  }
  throw new Error(`${symbol} ${range} の取得に失敗`);
}
const pairs = (res, digits) => res.timestamp.map((t, i) => [t, res.indicators.quote[0].close[i]])
  .filter(([, c]) => typeof c === 'number').map(([t, c]) => [t, +c.toFixed(digits)]);

const out = { updated: Math.floor(Date.now() / 1000), quotes: {} };
for (const s of SYMBOLS) {
  try {
    const day = await chart(s, '1d', '5m'), year = await chart(s, '1y', '1d'), m = day.meta;
    const digits = m.currency === 'JPY' && s !== 'JPY=X' ? 1 : 3;
    out.quotes[s] = {
      price: m.regularMarketPrice, prevClose: m.chartPreviousClose ?? m.previousClose, currency: m.currency,
      time: m.regularMarketTime, intraday: pairs(day, digits), daily: pairs(year, digits),
    };
  } catch (e) { console.error(String(e)); }
}
if (!Object.keys(out.quotes).length) { console.error('1件も取れませんでした'); process.exit(1); }
writeFileSync(process.argv[2] ?? 'quotes.json', JSON.stringify(out));
console.log('ok', Object.keys(out.quotes).join(' '));
