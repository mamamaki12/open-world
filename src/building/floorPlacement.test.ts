import { describe, expect, it } from 'vitest';
import { floorExtensionLevel, floorPlacementPlan } from './floorPlacement';
import { canPlaceFloor } from './rules';
import { emptyHouse } from './types';
import type { House } from './types';
import { applyChanges, changes } from '../session/edits';
import { aimPlan } from './aimBuild';
import { useGame } from '../state/store';

const finish = { material: 'flooring', color: '#c8a57a' };
const base: House = { ...emptyHouse(), walls: [{ id: 'wall', level: 0, x0: 2, x1: 2, z0: 2, z1: 4, exterior: finish, interior: finish }],
  floors: [{ id: 'original', level: 1, x0: 2, x1: 4, z0: 2, z1: 4, finish }] };
const rect = { x0: 3, x1: 6, z0: 2, z1: 4 };
const area = (rs: typeof rect[]) => rs.reduce((n, r) => n + (r.x1-r.x0)*(r.z1-r.z0), 0);
describe('drawing an extension from an existing floor', () => {
  it('keeps the hit floor level even when the starting cell is occupied', () => {
    expect(floorExtensionLevel(base, 1, () => ({ x0: 3, x1: 4, z0: 2, z1: 3 }))).toBe(1);
    const house = { ...base, floors: [...base.floors, { ...base.floors[0], id: 'upper', level: 2 }] };
    expect(floorExtensionLevel(house, 1, () => ({ x0: 3, x1: 4, z0: 2, z1: 3 }))).toBe(1);
  });
  it('adds only the uncovered strip and preserves the original finish', () => {
    const plan = floorPlacementPlan(base, 1, rect);
    expect(plan.error).toBeNull();
    expect(plan.rects).toEqual([{ x0: 4, x1: 6, z0: 2, z1: 4 }]);
    expect(base.floors[0].finish).toBe(finish);
  });
  it('splits around the existing floor without overlap or lost area', () => {
    const plan = floorPlacementPlan(base, 1, { x0: 1, x1: 6, z0: 1, z1: 6 });
    expect(plan.error).toBeNull(); expect(area(plan.rects)).toBe(21);
    expect(plan.rects).toHaveLength(4);
    for (const r of plan.rects) expect(canPlaceFloor(base, 1, r)).toBeNull();
  });
  it('makes a fully covered gesture a no-op instead of adding an upper floor', () => {
    expect(floorPlacementPlan(base, 1, base.floors[0]).rects).toEqual([]);
  });
  it('supports starting on a ground floor without any wall', () => {
    const house = { ...base, walls: [], floors: [{ ...base.floors[0], level: 0 }] };
    expect(floorExtensionLevel(house, 0, () => base.floors[0])).toBe(0);
    expect(floorPlacementPlan(house, 0, rect).error).toBeNull();
  });
  it('rejects detached support and out-of-lot gestures atomically', () => {
    expect(floorPlacementPlan({ ...base, walls: [] }, 1, rect).rects).toEqual([]);
    expect(floorPlacementPlan(base, 1, { ...rect, x0: -1 }).rects).toEqual([]);
  });
  it('produces changes accepted by the existing shared-world rules', () => {
    const plan = floorPlacementPlan(base, 1, rect);
    const next = { ...base, floors: [...base.floors, ...plan.rects.map((r, i) => ({ id: 'extension-'+i, level: 1, ...r, finish }))] };
    expect(applyChanges(base, changes(base, next))).toEqual(next);
  });
  it('uses the same clipping when building with the first-person crosshair', () => {
    const result = aimPlan(base, 'floor', useGame.getState().defaults, { x: 5.5*.91, y: 3.4, z: 3.5*.91 }, { x: 1, z: 1 }, 0, { x: 3, z: 2, level: 1 });
    expect(result.error).toBeNull(); expect(result.next?.floors).toHaveLength(2);
    expect(result.next?.floors[1]).toMatchObject({ level: 1, x0: 4, x1: 6 });
  });
});
