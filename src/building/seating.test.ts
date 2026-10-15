import { describe, expect, it } from 'vitest';
import { nearestSeat } from './seating';
import { emptyHouse } from './types';
import { GRID } from './dimensions';

const chair = { id: 'chair', type: 'chair', level: 0, x: 4, z: 4, rotation: 0, color: '#ffffff' };
describe('seating', () => {
  it('finds nearby chairs and faces away from the backrest', () => {
    const seat = nearestSeat({ ...emptyHouse(), furniture: [chair] }, 4, 0, 5);
    expect(seat?.id).toBe('chair');
    expect(seat?.yaw).toBe(Math.PI);
    expect(seat?.height).toBe(0.45);
  });
  it('ignores distant seats, other furniture and other floors', () => {
    const house = { ...emptyHouse(), furniture: [chair, { ...chair, id: 'table', type: 'dining', z: 8 }] };
    expect(nearestSeat(house, 4, 0, 8)).toBeNull();
    expect(nearestSeat(house, 4, 3, 4)).toBeNull();
  });
  it('does not sit through a wall', () => {
    const house = { ...emptyHouse(), furniture: [chair], walls: [{ id: 'wall', level: 0, x0: 0, x1: 8, z0: 4.5 / GRID, z1: 4.5 / GRID,
      exterior: { material: 'siding', color: '#fff' }, interior: { material: 'wallpaper', color: '#fff' } }] };
    expect(nearestSeat(house, 4, 0, 5)).toBeNull();
  });
  it('uses the nearest place on a rotated sofa', () => {
    const seat = nearestSeat({ ...emptyHouse(), furniture: [{ ...chair, type: 'sofa', rotation: 90 }] }, 5, 0, 3.4);
    expect(seat?.z).toBeCloseTo(3.4);
    expect(seat?.x).toBeCloseTo(4.08);
  });
});
