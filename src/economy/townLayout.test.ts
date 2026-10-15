import { describe, expect, it } from 'vitest';
import { BLOCK_COLUMNS, BLOCK_ROWS, FIRST_PLOT, LAST_PLOT, TOWN_ROADS, TOWN_BOUNDS, CIVIC_SITE, blockOf, plotX, plotZ } from './town';
import { GRID, LOT_W, LOT_D } from '../building/dimensions';
import { CASINO } from '../building/landmarks';

const plots = Array.from({ length: LAST_PLOT - FIRST_PLOT + 1 }, (_, i) => FIRST_PLOT + i);
const overlap = (a: { x0: number; x1: number; z0: number; z1: number }, b: typeof a) => a.x0 < b.x1 - 1e-8 && a.x1 > b.x0 + 1e-8 && a.z0 < b.z1 - 1e-8 && a.z1 > b.z0 + 1e-8;
describe('two dimensional town layout', () => {
  it('has eight blocks of four homes on multiple rows and columns', () => {
    expect(BLOCK_COLUMNS * BLOCK_ROWS).toBe(8);
    expect(plots).toHaveLength(32);
    for (let i = 0; i < 8; i++) expect(plots.filter(p => blockOf(p) === i)).toHaveLength(4);
    expect(new Set(plots.map(plotZ)).size).toBe(4);
    expect(new Set(plots.map(plotX)).size).toBe(8);
    expect(plotX(0)).toBe(0); expect(plotZ(0)).toBe(0);
  });
  it('keeps all lots separate from each other and the road network', () => {
    const lots = plots.map(p => ({ x0: plotX(p), x1: plotX(p) + LOT_W * GRID, z0: plotZ(p), z1: plotZ(p) + LOT_D * GRID }));
    lots.forEach((lot, i) => {
      expect(lots.some((other, j) => i !== j && overlap(lot, other))).toBe(false);
      expect(TOWN_ROADS.some(road => overlap(lot, road))).toBe(false);
    });
  });
  it('provides roads in both directions and keeps the casino outside residential blocks', () => {
    expect(TOWN_ROADS.some(r => r.x1 - r.x0 > 50)).toBe(true);
    expect(TOWN_ROADS.some(r => r.z1 - r.z0 > 50)).toBe(true);
    expect(CIVIC_SITE.z + CASINO.z0).toBeGreaterThan(TOWN_BOUNDS.z1);
  });
});
