import { describe, expect, it } from 'vitest';
import { stairHeightFraction, stairPlan, stairRects, stairWorldGrid } from './stairs';
import { canPlaceStair, stairFootprint, stairHoles } from './rules';
import { surfaceHeight } from './walk';
import { emptyHouse } from './types';
import type { StairPart, StairShape } from './types';
import { GRID, STORY_HEIGHT, floorY } from './dimensions';

const stair = (shape: StairShape = 'straight', rot: StairPart['rot'] = 0): StairPart => ({ id: 'stair', x: 5, z: 5, level: 0, rot, shape, finish: { material: 'oak', color: '#fff' }, rail: 'both' });
describe('compact and turning stairs', () => {
  it('keeps the legacy straight footprint and adds a shorter 3-cell option', () => {
    expect(stairFootprint(stair())).toEqual({ x0: 5, z0: 5, x1: 6, z1: 9 });
    expect(stairFootprint(stair('compact'))).toEqual({ x0: 5, z0: 5, x1: 6, z1: 8 });
  });
  it.each(['l', 'u'] as const)('%s stairs have a flat half-height landing and finish at the next floor', (shape) => {
    const s = stair(shape), plan = stairPlan(shape), landing = plan.landings[0];
    const p = stairWorldGrid(s, (landing.x0 + landing.x1) / 2, (landing.z0 + landing.z1) / 2);
    expect(stairHeightFraction(s, p.x * GRID, p.z * GRID)).toBe(0.5);
    const flight = plan.flights[1], end = shape === 'l' ? stairWorldGrid(s, 3, 2.5) : stairWorldGrid(s, 1.5, 0);
    expect(stairHeightFraction(s, end.x * GRID, end.z * GRID)).toBeCloseTo(flight.top);
  });
  it.each([0, 1, 2, 3] as const)('uses the same walkable route after rotation %s', rot => {
    const s = stair('l', rot), house = { ...emptyHouse(), stairs: [s] };
    const points = [[0.5, 0.2], [0.5, 1], [0.5, 2.5], [1.5, 2.5], [2.8, 2.5]];
    let y = floorY(0);
    // Sample the continuous route densely enough for the player's step limit.
    for (let i = 1; i < points.length; i++) for (let j = 0; j <= 20; j++) {
      const t = j / 20, a = points[i - 1], b = points[i];
      const p = stairWorldGrid(s, a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t);
      y = surfaceHeight(house, p.x * GRID, p.z * GRID, y);
    }
    expect(y).toBeGreaterThan(floorY(0) + STORY_HEIGHT * 0.9);
  });
  it('opens only the L-shaped route in the upper floor', () => {
    const s = stair('l'), holes = stairHoles({ ...emptyHouse(), stairs: [s] }, 1);
    expect(holes).toHaveLength(3);
    expect(holes.some(r => 7 > r.x0 && 7 < r.x1 && 6 > r.z0 && 6 < r.z1)).toBe(false);
    expect(stairRects(s).reduce((area, r) => area + (r.x1 - r.x0) * (r.z1 - r.z0), 0)).toBe(5);
  });
  it('checks the whole turning footprint against the lot boundary', () => {
    expect(canPlaceStair(emptyHouse(), { ...stair('l'), x: 23 })).not.toBeNull();
    expect(canPlaceStair(emptyHouse(), stair('u'))).toBeNull();
  });
});
