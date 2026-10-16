// 証券取引所の銘柄と、実際の相場データ（market-data ブランチの quotes.json）から円の値段を出す計算
export interface Instrument { symbol: string; name: string; kind: '指数' | 'ETF' | '個別株'; note: string }
/** 指数は「指数の値 × 1円（ドル建ては為替で円換算）」を1口として売買する。 */
export const INSTRUMENTS: Instrument[] = [
  { symbol: '^N225', name: '日経平均', kind: '指数', note: '東証プライムの代表225銘柄' },
  { symbol: '1306.T', name: 'TOPIX連動ETF', kind: 'ETF', note: '東証株価指数に連動（1306）' },
  { symbol: '^GSPC', name: 'S&P500', kind: '指数', note: '米国の大型株500銘柄（ドル建て・円換算）' },
  { symbol: '^DJI', name: 'NYダウ', kind: '指数', note: '米国の代表30銘柄（ドル建て・円換算）' },
  { symbol: '^IXIC', name: 'NASDAQ総合', kind: '指数', note: '米ナスダック上場の全銘柄（ドル建て・円換算）' },
  { symbol: '7203.T', name: 'トヨタ自動車', kind: '個別株', note: '7203 東証プライム' },
  { symbol: '6758.T', name: 'ソニーグループ', kind: '個別株', note: '6758 東証プライム' },
  { symbol: 'AAPL', name: 'Apple', kind: '個別株', note: 'NASDAQ（ドル建て・円換算）' },
  { symbol: 'NVDA', name: 'NVIDIA', kind: '個別株', note: 'NASDAQ（ドル建て・円換算）' },
];
export const FX = 'JPY=X';
export interface Quote { price: number; prevClose: number; currency: string; time: number; intraday: [number, number][]; daily: [number, number][] }
export interface Quotes { updated: number; quotes: Record<string, Quote> }
export const QUOTES_URL = 'https://raw.githubusercontent.com/mamamaki12/open-world/market-data/quotes.json';

/** ドル建てを円にする倍率（円建てなら1、為替が無ければ null） */
export function toYen(q: Quote, data: Quotes): number | null {
  if (q.currency === 'JPY') return 1;
  const fx = data.quotes[FX]?.price;
  return q.currency === 'USD' && fx ? fx : null;
}
/** 1口の円の値段 */
export function unitYen(symbol: string, data: Quotes | null): number | null {
  const q = data?.quotes[symbol];
  if (!q || !data) return null;
  const r = toYen(q, data);
  return r === null ? null : q.price * r;
}
/** 前日比（%） */
export function changePct(q: Quote): number { return q.prevClose ? (q.price / q.prevClose - 1) * 100 : 0; }

export interface Holding { units: number; cost: number }
/** 円の金額で買ったときの口数（小数第4位まで） */
export function unitsFor(amount: number, unit: number): number { return Math.floor((amount / unit) * 1e4) / 1e4; }
/** 保有の評価額と損益 */
export function valuation(h: Holding, unit: number) { const value = h.units * unit; return { value, gain: value - h.cost, pct: h.cost ? (value / h.cost - 1) * 100 : 0 }; }
/** 売るときに減らす取得原価（平均単価×売った割合） */
export function soldCost(h: Holding, units: number): number { return h.units ? h.cost * Math.min(1, units / h.units) : 0; }
