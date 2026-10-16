import { describe, expect, it } from 'vitest';
import { CASINO_PLOT, DISTRICTS, START_PLOT, assignPlots, districtOf, freePlot, plotsOf } from './town';
import { seeded } from './rng';
import { LOCATIONS } from './market';

describe('町の区画', () => {
  it('どの立地にも区画があり、区画は重ならない', () => {
    const all = LOCATIONS.flatMap((l) => plotsOf(l.id));
    expect(LOCATIONS.every((l) => plotsOf(l.id).length > 0)).toBe(true);
    expect(new Set(all).size).toBe(all.length);
    expect(DISTRICTS.length).toBe(LOCATIONS.length);
  });

  it('はじめの土地は郊外で、道路の向かいがカジノ', () => {
    expect(districtOf(START_PLOT)?.location).toBe('rural');
    expect(CASINO_PLOT).toBe(START_PLOT);
  });

  it('空いている区画だけを選ぶ。満杯なら null', () => {
    const rural = plotsOf('rural');
    const rng = seeded(3);
    for (let i = 0; i < 20; i++) {
      const p = freePlot('rural', [START_PLOT], rng);
      expect(p).not.toBe(START_PLOT);
      expect(rural).toContain(p);
    }
    expect(freePlot('rural', rural)).toBeNull();
  });

  it('区画のない古いセーブの土地に区画を割り当てる（はじめの土地は 0 番）', () => {
    const lots = assignPlots([
      { location: 'rural' },
      { location: 'city' },
      { location: 'rural' },
      { location: 'town', plot: -5 },
    ]);
    expect(lots[0].plot).toBe(START_PLOT);
    expect(districtOf(lots[1].plot!)?.location).toBe('city');
    expect(districtOf(lots[2].plot!)?.location).toBe('rural');
    expect(lots[2].plot).not.toBe(START_PLOT);
    expect(lots[3].plot).toBe(-5);
  });
});

import { JOINED_W, JOIN_SHIFT, joinNeighbor, joinPair, plotX as px, plotZ as pz, FIRST_PLOT as F, LAST_PLOT as L } from './town';
import { GRID, LOT_W } from '../building/dimensions';

describe('土地をつなげる', () => {
  it('隣の区画は同じ列で道路をはさまずに並び、地区も同じ', () => {
    for (let p = F; p <= L; p++) {
      const pair = joinPair(p);
      expect(pair).not.toBeNull();
      const { west, east } = pair!;
      expect(pz(west)).toBe(pz(east));
      expect(px(east) - px(west)).toBeCloseTo(LOT_W * GRID + 4, 5);
      expect(districtOf(west)?.location).toBe(districtOf(east)?.location);
      expect(joinNeighbor(joinNeighbor(p)!)).toBe(p);
    }
  });
  it('東の家は区画の間の通路を含めてずらす', () => {
    expect(JOIN_SHIFT).toBe(28);
    expect(JOINED_W).toBe(52);
  });
});
