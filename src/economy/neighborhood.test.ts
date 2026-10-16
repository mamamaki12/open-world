import { describe, expect, it } from 'vitest';
import { FIXED_BUILDINGS, densityFactor, neighborScore, plotCenter } from './neighborhood';
import { plotsOf } from './town';

describe('土地代のにぎわい係数', () => {
  it('建物が近くに多いほど係数が高い', () => {
    const empty = neighborScore(0, []);
    expect(densityFactor(empty)).toBe(0.8);
    const near = { ...plotCenter(1), weight: 1 };
    expect(neighborScore(0, [near])).toBeGreaterThan(0);
  });
  it('お店のような重い建物は家より土地を高くする', () => {
    const at = plotCenter(1);
    const house = neighborScore(0, [{ ...at, weight: 1 }]);
    const shop = neighborScore(0, [{ ...at, weight: 4 }]);
    expect(shop).toBeGreaterThan(house * 3);
  });
  it('町の区画ごとに係数が 0.8〜1.6 に収まり、ばらつく', () => {
    const fs = [...plotsOf('rural'), ...plotsOf('city')].map((p) => densityFactor(neighborScore(p, FIXED_BUILDINGS)));
    expect(Math.min(...fs)).toBeGreaterThanOrEqual(0.8);
    expect(Math.max(...fs)).toBeLessThanOrEqual(1.6);
    expect(new Set(fs).size).toBeGreaterThan(1);
  });
});
