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
