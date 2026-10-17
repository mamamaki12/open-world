// 土地代の「にぎわい」係数：区画のまわりに建物が多いほど土地は高い。お店や大きな建物ほど重く数える。
import { GRID, LOT_D, LOT_W } from '../building/dimensions';
import { VENUES, VENUE_KINDS } from '../building/venues';
import type { Venue } from '../building/venues';
import { TOWN_HOUSE_PLOTS, plotX, plotZ } from './town';

/** 何m先の建物まで数えるか */
export const NEIGHBOR_RADIUS = 80;

/** 町の家のデザインごとの重さ（戸建て 1） */
const TOWN_HOUSE_WEIGHT: Record<string, number> = {
  'wood-apartment': 1.5, 'steel-apartment': 1.5, narrow: 1.2,
  mansion: 2.5, residence: 2.5, designers: 2, tower: 3.5,
};
/** お店・施設の重さ */
const VENUE_WEIGHT = (v: Venue) => (v === 'casino' ? 6 : 4);

export interface Building { x: number; z: number; weight: number }

export function plotCenter(plot: number) {
  return { x: plotX(plot) + (LOT_W * GRID) / 2, z: plotZ(plot) + (LOT_D * GRID) / 2 };
}

/** 町に最初からある建物（ほかの住人の家とお店）。 */
export const FIXED_BUILDINGS: Building[] = [
  ...Object.entries(TOWN_HOUSE_PLOTS).map(([p, id]) => ({ ...plotCenter(Number(p)), weight: TOWN_HOUSE_WEIGHT[id] ?? 1 })),
  ...VENUE_KINDS.map((v) => {
    const b = VENUES[v];
    return { x: (b.x0 + b.x1) / 2, z: (b.z0 + b.z1) / 2, weight: VENUE_WEIGHT(v) };
  }),
];

/** プレイヤーの家の重さ。2階以上あれば少し重い */
export function playerHouseWeight(levels: number): number {
  return levels > 1 ? 1.5 : 1;
}

/** まわりの建物の重さの合計（近いほど大きく数える）。自分の区画の建物は数えない */
export function neighborScore(plot: number, buildings: Building[]): number {
  const c = plotCenter(plot);
  const own = TOWN_HOUSE_PLOTS[plot] ? plotCenter(plot) : null;
  let score = 0;
  for (const b of buildings) {
    if (own && b.x === own.x && b.z === own.z) continue;
    const d = Math.hypot(b.x - c.x, b.z - c.z);
    if (d < 1 || d >= NEIGHBOR_RADIUS) continue;
    score += b.weight * (1 - d / NEIGHBOR_RADIUS);
  }
  return score;
}

/** 土地代にかける係数（0.8〜1.6）。何もない所は安く、にぎやかな所は高い */
export function densityFactor(score: number): number {
  return Math.round(Math.min(1.6, Math.max(0.8, 0.8 + score * 0.033)) * 100) / 100;
}

/** 区画のまわりのにぎわい（固定の建物＋建っている家）。ひとりモードとみんなのワールドのサーバーで共通 */
export function lotsDensity(plot: number, lots: { built: { floors: { level: number }[] } | null; plot?: number }[]): number {
  const houses = lots.flatMap((l) => {
    if (!l.built || typeof l.plot !== 'number' || l.plot === plot) return [];
    const levels = new Set(l.built.floors.map((f) => f.level)).size;
    return [{ ...plotCenter(l.plot), weight: playerHouseWeight(levels) }];
  });
  return densityFactor(neighborScore(plot, [...FIXED_BUILDINGS, ...houses]));
}
