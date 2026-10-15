import { describe, expect, it } from 'vitest';
import { snapFurniturePlacement } from './furnitureSnap';
import { emptyHouse } from './types';

const item = { type: 'chair', rotation: 0, level: 0 };
const chair = { ...item, id: 'chair', x: 2.03, z: 2.03, color: '#fff' };
describe('furniture alignment', () => {
  it('uses a steadier 10cm grid away from furniture', () => {
    expect(snapFurniturePlacement(emptyHouse(), item, 4.14, 5.26)).toEqual({ x: 4.1, z: 5.3 });
  });
  it('aligns a row to an existing non-grid position', () => {
    const p = snapFurniturePlacement({ ...emptyHouse(), furniture: [chair] }, item, 4, 2.12);
    expect(p.z).toBe(2.03);
  });
  it('snaps adjacent edges together', () => {
    const p = snapFurniturePlacement({ ...emptyHouse(), furniture: [chair] }, item, 2.5, 2.03);
    expect(p.x).toBeCloseTo(2.47);
  });
  it('does not align to itself or furniture on another floor', () => {
    const house = { ...emptyHouse(), furniture: [chair] };
    expect(snapFurniturePlacement(house, { ...item, id: chair.id }, 2.12, 2.12)).toEqual({ x: 2.1, z: 2.1 });
    expect(snapFurniturePlacement(house, { ...item, level: 1 }, 2.12, 2.12)).toEqual({ x: 2.1, z: 2.1 });
  });
  it('allows 5cm fine movement without magnetic alignment', () => {
    expect(snapFurniturePlacement({ ...emptyHouse(), furniture: [chair] }, item, 4.14, 2.12, true)).toEqual({ x: 4.15, z: 2.1 });
  });
  it('accounts for rotated furniture when aligning edges', () => {
    const sofa = { ...chair, type: 'sofa', rotation: 90, x: 3, z: 3 };
    const p = snapFurniturePlacement({ ...emptyHouse(), furniture: [sofa] }, item, 3.7, 3);
    expect(p.x).toBeCloseTo(3.67);
  });
});
