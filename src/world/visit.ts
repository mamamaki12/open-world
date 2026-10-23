// ほかの家を訪ねる：歩いてその家の区画に入ったら、その家の床・階段・ドアで歩けるようにする。
// 町に最初から建っている家と、いま開いていない土地（ほかのプレイヤーの家・自分のほかの土地）の家が対象
import { create } from 'zustand';
import { GRID, LOT_D, LOT_W } from '../building/dimensions';
import { TOWN_HOUSE_PLOTS, townHouseAt } from '../building/townHouses';
import type { House } from '../building/types';
import { lotCells, lotHouse, plotOffset, plotOffsetZ, useEconomy } from '../state/economy';

/** いま訪ねている区画（家を細かく描き、ドアを開けられるようにする） */
export const useVisit = create<{ plot: number | null }>(() => ({ plot: null }));

export interface Visit {
  plot: number;
  house: House;
  ox: number;
  oz: number;
  /** いまの土地の座標にずらした家（床・階段・ドア・椅子・窓の判定はこれで、プレイヤーの座標のまま行う） */
  world: House;
}

const shifted = new WeakMap<House, Map<string, House>>();
function shiftedHouse(house: House, ox: number, oz: number): House {
  let byOffset = shifted.get(house);
  if (!byOffset) shifted.set(house, byOffset = new Map());
  const key = `${ox}:${oz}`;
  let world = byOffset.get(key);
  if (!world) byOffset.set(key, world = shiftHouse(house, ox, oz));
  return world;
}
/** 家を ox, oz（m）だけ動かした写し */
function shiftHouse(h: House, ox: number, oz: number): House {
  const dx = ox / GRID, dz = oz / GRID;
  return {
    ...h,
    floors: h.floors.map((f) => ({ ...f, x0: f.x0 + dx, x1: f.x1 + dx, z0: f.z0 + dz, z1: f.z1 + dz })),
    walls: h.walls.map((w) => ({ ...w, x0: w.x0 + dx, x1: w.x1 + dx, z0: w.z0 + dz, z1: w.z1 + dz })),
    roofs: h.roofs.map((r) => ({ ...r, x0: r.x0 + dx, x1: r.x1 + dx, z0: r.z0 + dz, z1: r.z1 + dz })),
    stairs: h.stairs.map((st) => ({ ...st, x: st.x + dx, z: st.z + dz })),
    furniture: h.furniture.map((f) => ({ ...f, x: f.x + ox, z: f.z + oz })),
  };
}

/** 自分の土地・売り土地になっていて、町の家が建っていない区画 */
export function takenPlots(s = useEconomy.getState()): Set<number> {
  return new Set([...s.lots.flatMap((l) => [l.plot, l.joined]), ...s.offers.map((o) => o.plot)].filter((p): p is number => typeof p === 'number'));
}

/** その位置（いまの土地の座標、m）にある、いまの土地以外の家。区画の外なら null */
export function visitAt(x: number, z: number): Visit | null {
  const s = useEconomy.getState();
  const inside = (ox: number, oz: number, w: number) => x >= ox - 0.5 && x <= ox + w * GRID + 0.5 && z >= oz - 0.5 && z <= oz + LOT_D * GRID + 0.5;
  for (const l of s.lots) {
    if (l.id === s.currentLotId || typeof l.plot !== 'number') continue;
    const ox = plotOffset(l.plot, s), oz = plotOffsetZ(l.plot, s);
    if (!inside(ox, oz, lotCells(l).w)) continue;
    const house = lotHouse(l);
    return house ? { plot: l.plot, house, ox, oz, world: shiftedHouse(house, ox, oz) } : null;
  }
  let taken: Set<number> | null = null;
  for (const key of Object.keys(TOWN_HOUSE_PLOTS)) {
    const plot = Number(key);
    const ox = plotOffset(plot, s), oz = plotOffsetZ(plot, s);
    if (!inside(ox, oz, LOT_W)) continue;
    taken ??= takenPlots(s);
    if (taken.has(plot)) continue;
    const house = townHouseAt(plot);
    if (!house) continue;
    return { plot, house, ox, oz, world: shiftedHouse(house, ox, oz) };
  }
  return null;
}

/** 訪ねた家では何も変えられないことを知らせる */
export const VISIT_READ_ONLY = 'ほかの人の家なので、変えたり消したりはできません';
