// 町の区画：大通りに沿って土地（区画）が並ぶ。区画の番号 0 がはじめの土地で、道路の向かいにカジノがある。
// 西から 静かな住宅街 → 郊外の住宅地（はじめの土地とカジノ） → 駅近 → 都心 の順に並ぶ。
// 3D の世界では、いま建てている土地をいつも原点に置き、ほかの区画やカジノはこの番号の差だけ横にずらして描く
import { GRID, LOT_D, LOT_W } from '../building/dimensions';
import type { Rng } from './rng';
import { randInt } from './rng';

/** 区画と区画の間の距離（m）。土地の幅 + 隣との間の道 */
export const PLOT_PITCH = LOT_W * GRID + 4;

export interface District {
  location: string;
  /** 最初と最後の区画の番号（両端を含む） */
  from: number;
  to: number;
  color: string;
}

export const DISTRICTS: District[] = [
  { location: 'town', from: -9, to: -4, color: '#cfe3c0' },
  { location: 'rural', from: -3, to: 2, color: '#e6ecd2' },
  { location: 'station', from: 3, to: 8, color: '#d8e2f0' },
  { location: 'city', from: 9, to: 22, color: '#ecdcea' },
];

/** はじめの土地の区画（道路の向かいがカジノ） */
export const START_PLOT = 0;
/** カジノの正面にある区画 */
export const CASINO_PLOT = 0;
/** 不動産屋はカジノの東隣 */
export const ESTATE_PLOT = 1;

export const FIRST_PLOT = Math.min(...DISTRICTS.map((d) => d.from));
export const LAST_PLOT = Math.max(...DISTRICTS.map((d) => d.to));

/** 区画の左端（西端）の x（はじめの土地の左端が 0） */
export function plotX(plot: number): number {
  return rawPlot(plot).x - rawPlot(START_PLOT).x;
}

export const BLOCK_COLUMNS = 4;
export const BLOCK_ROWS = 2;
export const LOTS_PER_BLOCK = 4;
const LOT_WIDTH = LOT_W * GRID, LOT_DEPTH = LOT_D * GRID;
const BLOCK_W = LOT_WIDTH * 2 + 4, BLOCK_D = LOT_DEPTH * 2 + 6;
const ROAD_WIDTH = 10;
function rawPlot(plot: number) {
  const index = plot - FIRST_PLOT, block = Math.floor(index / LOTS_PER_BLOCK), local = index % LOTS_PER_BLOCK;
  return { x: (block % BLOCK_COLUMNS) * (BLOCK_W + ROAD_WIDTH) + (local % 2) * (LOT_WIDTH + 4),
    z: Math.floor(block / BLOCK_COLUMNS) * (BLOCK_D + ROAD_WIDTH) + Math.floor(local / 2) * (LOT_DEPTH + 6) };
}
export function plotZ(plot: number): number { return rawPlot(plot).z - rawPlot(START_PLOT).z; }
export function blockOf(plot: number): number { return Math.floor((plot - FIRST_PLOT) / LOTS_PER_BLOCK); }
export const TOWN_BOUNDS = {
  x0: -rawPlot(START_PLOT).x, z0: -rawPlot(START_PLOT).z,
  x1: BLOCK_COLUMNS * BLOCK_W + (BLOCK_COLUMNS - 1) * ROAD_WIDTH - rawPlot(START_PLOT).x,
  z1: BLOCK_ROWS * BLOCK_D + (BLOCK_ROWS - 1) * ROAD_WIDTH - rawPlot(START_PLOT).z,
};
/** 公共施設は住宅街の南側の広場に置く。 */
export const CIVIC_SITE = { x: TOWN_BOUNDS.x1 - LOT_WIDTH - 30, z: TOWN_BOUNDS.z1 - LOT_DEPTH };
export const TOWN_ROADS = [
  ...Array.from({ length: BLOCK_COLUMNS + 1 }, (_, i) => {
    const x = i === 0 ? TOWN_BOUNDS.x0 - 5 : TOWN_BOUNDS.x0 + i * (BLOCK_W + ROAD_WIDTH) - 5;
    return { x0: x - 5, x1: x + 5, z0: TOWN_BOUNDS.z0 - 10, z1: TOWN_BOUNDS.z1 + 6.2 };
  }),
  ...Array.from({ length: BLOCK_ROWS + 1 }, (_, i) => {
    const z = i === 0 ? TOWN_BOUNDS.z0 - 5 : i === BLOCK_ROWS ? TOWN_BOUNDS.z1 + 3.2 : TOWN_BOUNDS.z0 + i * (BLOCK_D + ROAD_WIDTH) - 5;
    const half = i === BLOCK_ROWS ? 3 : 5;
    return { x0: TOWN_BOUNDS.x0 - 10, x1: TOWN_BOUNDS.x1 + 10, z0: z - half, z1: z + half };
  }),
  ...Array.from({ length: BLOCK_ROWS }, (_, i) => {
    const z = TOWN_BOUNDS.z0 + i * (BLOCK_D + ROAD_WIDTH) + LOT_DEPTH + 3;
    return { x0: TOWN_BOUNDS.x0 - 10, x1: TOWN_BOUNDS.x1 + 10, z0: z - 3, z1: z + 3 };
  }),
];

export function districtOf(plot: number): District | null {
  return DISTRICTS.find((d) => plot >= d.from && plot <= d.to) ?? null;
}

/** その立地の区画の番号の一覧 */
export function plotsOf(location: string): number[] {
  const d = DISTRICTS.find((x) => x.location === location);
  if (!d) return [];
  const out: number[] = [];
  for (let i = d.from; i <= d.to; i++) out.push(i);
  return out;
}

/** その立地で空いている区画。rng があればランダムに、なければカジノに近い順でいちばん近いもの */
export function freePlot(location: string, taken: Iterable<number>, rng?: Rng): number | null {
  const used = new Set(taken);
  const free = plotsOf(location).filter((p) => !used.has(p));
  if (free.length === 0) return null;
  if (rng) return free[randInt(rng, free.length)];
  return free.reduce((a, b) => (Math.abs(b - CASINO_PLOT) < Math.abs(a - CASINO_PLOT) ? b : a));
}

/**
 * 区画が決まっていないもの（古いセーブの土地など）に区画を割り当てる。
 * すでに決まっている区画はそのまま。はじめの土地は START_PLOT を優先する
 */
export function assignPlots<T extends { location: string; plot?: number | null }>(items: T[], taken: Iterable<number> = []): T[] {
  const used = new Set(taken);
  for (const it of items) if (typeof it.plot === 'number') used.add(it.plot);
  return items.map((it) => {
    if (typeof it.plot === 'number') return it;
    const preferStart = it.location === districtOf(START_PLOT)?.location && !used.has(START_PLOT);
    const plot = preferStart ? START_PLOT : freePlot(it.location, used);
    if (plot === null) return it;
    used.add(plot);
    return { ...it, plot };
  });
}


/** つなげた土地で、東側の区画の家をずらすマス数（区画の間の通路ぶんも土地になる） */
export const JOIN_SHIFT = Math.round((LOT_WIDTH + 4) / GRID);
/** つなげた土地の幅（マス） */
export const JOINED_W = JOIN_SHIFT + LOT_W;

/**
 * 道路をはさまずに横に並んでいる隣の区画（同じブロックの同じ列の、もう1つの区画）。
 * 区画は2つずつ組になっていて、組は地区をまたがない。west が西側の区画
 */
export function joinPair(plot: number): { west: number; east: number } | null {
  if (plot < FIRST_PLOT || plot > LAST_PLOT) return null;
  const local = (plot - FIRST_PLOT) % LOTS_PER_BLOCK;
  const west = local % 2 === 0 ? plot : plot - 1;
  const east = west + 1;
  if (east > LAST_PLOT || districtOf(west)?.location !== districtOf(east)?.location) return null;
  return { west, east };
}

/** 隣の区画（つなげられる相手） */
export function joinNeighbor(plot: number): number | null {
  const p = joinPair(plot);
  return p ? (p.west === plot ? p.east : p.west) : null;
}
