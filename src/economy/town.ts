// 町の区画：大通りに沿って土地（区画）が並ぶ。区画の番号 0 がはじめの土地で、道路の向かいにカジノがある。
// 西から 静かな住宅街 → 郊外の住宅地（はじめの土地とカジノ） → 駅近 → 都心 の順に並ぶ。
// 3D の世界では、いま建てている土地をいつも原点に置き、ほかの区画やカジノはこの番号の差だけ横にずらして描く
import { GRID, LOT_W } from '../building/dimensions';
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
  { location: 'city', from: 9, to: 14, color: '#ecdcea' },
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
  return plot * PLOT_PITCH;
}

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

