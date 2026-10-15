import { expect, it } from 'vitest';
import { floorCovers, wallOutsideSide } from './rules';
import { emptyHouse } from './types';
import { GRID } from './dimensions';

it('keeps adjoining floor seams indoors for exterior finish detection', () => {
  const finish = { material: 'flooring', color: '#fff' };
  const house = { ...emptyHouse(), floors: [
    { id: 'a', level: 0, x0: 0, z0: 0, x1: 2, z1: 4, finish },
    { id: 'b', level: 0, x0: 2, z0: 0, x1: 4, z1: 4, finish },
  ] };
  expect(floorCovers(house, 0, 2 * GRID, GRID / 2, true)).toBe(true);
  const wall = { id: 'wall', level: 0, x0: 0, z0: 0, x1: 4, z1: 0, exterior: finish, interior: finish };
  expect(wallOutsideSide(house, wall)).toBe(-1);
});
