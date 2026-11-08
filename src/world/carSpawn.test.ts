import { describe, expect, it } from 'vitest';
import { dealerSpots, frontRoad, lotFrontSpots, spawnCars } from './carSpawn';
import { FIRST_PLOT, LAST_PLOT, plotX } from '../economy/town';
import { GRID, LOT_W } from '../building/dimensions';

const car = (id: string) => ({ id, x: 0, z: 0, yaw: 0 });

describe('入場時の車の置き場所', () => {
  it('どの区画にも正面の道路がある', () => {
    for (let p = FIRST_PLOT; p <= LAST_PLOT; p++) expect(frontRoad(p), `区画 ${p}`).not.toBeNull();
  });
  it('土地の前の道路に、土地の幅の中で並べる', () => {
    const spots = lotFrontSpots({ plot: 0 });
    expect(spots.length).toBeGreaterThanOrEqual(3);
    const road = frontRoad(0)!;
    for (const s of spots) {
      expect(s.x).toBeGreaterThan(plotX(0)); expect(s.x).toBeLessThan(plotX(0) + LOT_W * GRID);
      expect(s.z).toBeGreaterThan(road.z0 + 1); expect(s.z).toBeLessThan(road.z1);
    }
  });
  it('土地がなければ車屋の駐車場', () => {
    const [a, b] = spawnCars([car('a'), car('b')], []);
    expect([a, b].map(({ x, z }) => ({ x, z }))).toEqual(dealerSpots().slice(0, 2).map(({ x, z }) => ({ x, z })));
  });
  it('土地の前を先に埋め、あふれた分は駐車場へ', () => {
    const n = lotFrontSpots({ plot: 0 }).length;
    const out = spawnCars(Array.from({ length: n + 1 }, (_, i) => car('c' + i)), [{ plot: 0 }]);
    expect(out[0]).toMatchObject(lotFrontSpots({ plot: 0 })[0]);
    expect(out[n]).toMatchObject(dealerSpots()[0]);
  });
  it('ほかの人の車がいる場所は避ける', () => {
    const first = lotFrontSpots({ plot: 0 })[0];
    const [a] = spawnCars([car('a')], [{ plot: 0 }], [first]);
    expect(a).toMatchObject(lotFrontSpots({ plot: 0 })[1]);
  });
});
