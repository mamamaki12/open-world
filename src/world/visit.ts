// ほかの住人の家を訪ねる：歩いてその家の区画に入ったら、その家の床・階段・ドアで歩けるようにする。
// 家を変えたり消したりはできない（建築はいつも自分の土地だけ）
import { create } from 'zustand';
import { GRID, LOT_D, LOT_W } from '../building/dimensions';
import { TOWN_HOUSE_PLOTS, townHouseAt } from '../building/townHouses';
import type { House } from '../building/types';
import { plotOffset, plotOffsetZ, useEconomy } from '../state/economy';

/** いま訪ねている区画（家を細かく描き、ドアを開けられるようにする） */
export const useVisit = create<{ plot: number | null }>(() => ({ plot: null }));

export interface Visit { plot: number; house: House; ox: number; oz: number }

/** 自分の土地・売り土地になっていて、町の家が建っていない区画 */
export function takenPlots(s = useEconomy.getState()): Set<number> {
  return new Set([...s.lots.flatMap((l) => [l.plot, l.joined]), ...s.offers.map((o) => o.plot)].filter((p): p is number => typeof p === 'number'));
}

/** その位置（いまの土地の座標、m）にある町の家。区画の外なら null */
export function visitAt(x: number, z: number): Visit | null {
  const s = useEconomy.getState();
  let taken: Set<number> | null = null;
  for (const key of Object.keys(TOWN_HOUSE_PLOTS)) {
    const plot = Number(key);
    const ox = plotOffset(plot, s), oz = plotOffsetZ(plot, s);
    if (x < ox - 0.5 || x > ox + LOT_W * GRID + 0.5 || z < oz - 0.5 || z > oz + LOT_D * GRID + 0.5) continue;
    taken ??= takenPlots(s);
    if (taken.has(plot)) continue;
    const house = townHouseAt(plot);
    if (house) return { plot, house, ox, oz };
  }
  return null;
}

/** 訪ねた家では何も変えられないことを知らせる */
export const VISIT_READ_ONLY = 'ほかの人の家なので、変えたり消したりはできません';
