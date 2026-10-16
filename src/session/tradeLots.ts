import type { House } from '../building/types';
import type { Lot } from '../state/economy';
import { ownedPlots } from '../state/economy';
import { freePlot } from '../economy/town';
import { isHouse } from '../save/storage';
import type { WorldSave } from './saves';

/** 友達に売り渡すときの土地1つ分（いま表示中の設計図も design に入れる） */
export function lotForTrade(w: WorldSave, id: string): Lot | null {
  const l = w.economy.lots.find(x => x.id === id);
  if (!l || l.construction) return null;
  return JSON.parse(JSON.stringify({ ...l, design: id === w.economy.currentLotId ? w.house : l.design, construction: null }));
}

export function validTradeLot(v: unknown): v is Lot {
  const l = v as Lot;
  return !!l && typeof l.id === 'string' && l.id.length < 100 && typeof l.name === 'string' && l.name.length <= 80 &&
    typeof l.location === 'string' && Number.isFinite(l.variance) && (l.built === null || isHouse(l.built)) &&
    (l.design === null || isHouse(l.design)) && !l.construction && typeof l.rented === 'boolean' &&
    (l.plot === undefined || Number.isInteger(l.plot)) && (l.joined === undefined || Number.isInteger(l.joined));
}

export const validPrice = (n: unknown): n is number => Number.isSafeInteger(n) && (n as number) >= 0 && (n as number) <= 1e13;

/** 自宅ワールドから土地を外す。表示中の土地なら別の土地へ切り替える */
export function withoutLot(w: WorldSave, id: string): WorldSave {
  const lots = w.economy.lots.filter(l => l.id !== id);
  if (id !== w.economy.currentLotId) return { ...w, economy: { ...w.economy, lots } };
  const next = lots[0];
  if (!next) return { ...w, economy: { ...w.economy, lots, currentLotId: null } };
  const house: House = next.design ?? next.built ?? w.house;
  return { ...w, house, economy: { ...w.economy, currentLotId: next.id, lots: lots.map(l => l.id === next.id ? { ...l, design: null } : l) } };
}

/** 買った土地を自宅ワールドに置く。同じ区画が空いていればそこ、なければ同じ立地の空き区画 */
export function withLot(w: WorldSave, lot: Lot, price: number, newId: string): WorldSave | string {
  if (w.economy.lots.length >= 100) return '持てる土地の数が上限です';
  const taken = ownedPlots(w.economy.lots);
  let plot: number | null | undefined = lot.plot, joined = lot.joined;
  if (typeof joined === 'number') {
    if (taken.includes(lot.plot!) || taken.includes(joined)) return 'つなげた土地を置ける区画が自分の町で空いていません';
  } else if (typeof plot !== 'number' || taken.includes(plot)) {
    plot = freePlot(lot.location, taken);
    if (plot === null) return 'この立地に空いている区画が自分の町にありません';
  }
  const placed: Lot = { ...lot, id: newId, plot: plot ?? undefined, joined, construction: null, invested: price };
  if (w.economy.currentLotId === null) {
    return { ...w, house: lot.design ?? lot.built ?? w.house, economy: { ...w.economy, currentLotId: newId, lots: [...w.economy.lots, { ...placed, design: null }] } };
  }
  return { ...w, economy: { ...w.economy, lots: [...w.economy.lots, placed] } };
}
