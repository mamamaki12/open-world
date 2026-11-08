import { describe, expect, it } from 'vitest';
import { GRID } from './dimensions';
import { blockCell, blockWallSegment } from './singleBlock';

describe('1ブロック', () => {
  it('床は狙った1マス', () => {
    expect(blockCell(2.5 * GRID, 3.2 * GRID)).toEqual({ x: 2, z: 3 });
  });
  it('壁はいちばん近い辺の1マス分', () => {
    expect(blockWallSegment(2.1 * GRID, 3.5 * GRID)).toEqual({ x0: 2, z0: 3, x1: 2, z1: 4 });
    expect(blockWallSegment(2.9 * GRID, 3.5 * GRID)).toEqual({ x0: 3, z0: 3, x1: 3, z1: 4 });
    expect(blockWallSegment(2.5 * GRID, 3.1 * GRID)).toEqual({ x0: 2, z0: 3, x1: 3, z1: 3 });
    expect(blockWallSegment(2.5 * GRID, 3.8 * GRID)).toEqual({ x0: 2, z0: 4, x1: 3, z1: 4 });
  });
});
