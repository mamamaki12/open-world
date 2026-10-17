// 証券口座：実際の相場（quotes.json）を読み、円の金額で買って口数で持つ。お金は経済の所持金を使う
import { create } from 'zustand';
import { QUOTES_URL, soldCost, unitYen, unitsFor } from '../economy/stocks';
import type { Holding, Quotes } from '../economy/stocks';
import { yen } from '../economy/money';
import { useEconomy } from './economy';
import { sessionGate } from '../session/gate';

const KEY = 'open-world:stocks:v1', QUOTE_KEY = 'open-world:quotes:v1';
function load<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) as T : fallback; } catch { return fallback; }
}
function save(key: string, v: unknown) { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* 保存できない環境 */ } }

interface StockState { quotes: Quotes | null; holdings: Record<string, Holding>; status: 'idle' | 'loading' | 'ok' | 'offline' }
export const useStocks = create<StockState>(() => ({ quotes: load<Quotes | null>(QUOTE_KEY, null), holdings: load(KEY, {}), status: 'idle' }));

/** 最新の相場を読む（1分ごとにキャッシュを外す）。読めなければ前回の値のまま。 */
export async function refreshQuotes(): Promise<void> {
  useStocks.setState({ status: 'loading' });
  try {
    const r = await fetch(`${QUOTES_URL}?t=${Math.floor(Date.now() / 60000)}`);
    if (!r.ok) throw new Error(String(r.status));
    const quotes = await r.json() as Quotes;
    if (!quotes?.quotes) throw new Error('bad data');
    save(QUOTE_KEY, quotes);
    useStocks.setState({ quotes, status: 'ok' });
  } catch { useStocks.setState({ status: 'offline' }); }
}
// みんなのワールドの株はサーバーの口座に入れ、自分のワールドの保存には書かない（src/session/session.ts が同期する）
function setHoldings(holdings: Record<string, Holding>) { if (!sessionGate.shared) save(KEY, holdings); useStocks.setState({ holdings }); }
/** 自分のワールドの保有株（みんなのワールドから戻るときに使う） */
export const homeHoldings = (): Record<string, Holding> => load(KEY, {});
/** 個人バックアップから復元する。共有口座の保有とは別に保存する。 */
export function restoreHomeHoldings(holdings: Record<string, Holding>) {
  save(KEY, holdings); useStocks.setState({ holdings });
}

/** 円の金額ぶん買う。エラーなら文言を返す */
export function buyStock(symbol: string, name: string, amount: number): string | null {
  const unit = unitYen(symbol, useStocks.getState().quotes);
  if (!unit) return '値段がまだ読めていません';
  if (!Number.isFinite(amount) || !(amount >= 1)) return '金額を入れてください';
  const units = unitsFor(amount, unit);
  if (units <= 0) return '金額が少なすぎます';
  const cost = Math.ceil(units * unit - 1e-8);
  if (!useEconomy.getState().pay(cost, `株の購入（${name}）`)) return `お金が足りません（${yen(cost)}）`;
  const h = useStocks.getState().holdings[symbol] ?? { units: 0, cost: 0 };
  setHoldings({ ...useStocks.getState().holdings, [symbol]: { units: +(h.units + units).toFixed(4), cost: h.cost + cost } });
  return null;
}
/** 口数ぶん売る（持っている以上は売れない） */
export function sellStock(symbol: string, name: string, units: number): string | null {
  const unit = unitYen(symbol, useStocks.getState().quotes), h = useStocks.getState().holdings[symbol];
  if (!unit) return '値段がまだ読めていません';
  if (!h || h.units <= 0) return '持っていません';
  if (!Number.isFinite(units) || !(units > 0)) return '口数を入れてください';
  // 保有と売却を同じ最小単位で精算する。支払い後の丸めで口数が戻るのを防ぐ。
  const held = Math.round(h.units * 10000);
  const requested = units * 10000;
  if (requested < 1 - 1e-8) return '0.0001口以上で入力してください';
  if (Math.abs(requested - Math.round(requested)) > 1e-8) return '0.0001口単位で入力してください';
  const sold = Math.min(Math.round(requested), held);
  if (sold <= 0) return '0.0001口以上で入力してください';
  const n = sold / 10000;
  const proceeds = Math.floor(n * unit + 1e-8);
  if (proceeds < 1) return '売却額が1円以上になる口数を入力してください';
  useEconomy.getState().receive(proceeds, `株の売却（${name}）`);
  const rest = (held - sold) / 10000, next = { ...useStocks.getState().holdings };
  if (rest <= 0) delete next[symbol]; else next[symbol] = { units: rest, cost: h.cost - soldCost(h, n) };
  setHoldings(next);
  return null;
}
