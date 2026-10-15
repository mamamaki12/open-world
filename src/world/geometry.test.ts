import { describe, expect, it } from 'vitest';
import { floorStrips } from './geometry';

describe('床の帯分け', () => {
  const rect = { x0: 0, z0: 0, x1: 4, z1: 2 };
  const cells = (rs: { x0: number; z0: number; x1: number; z1: number }[]) =>
    rs.reduce((n, r) => n + (r.x1 - r.x0) * (r.z1 - r.z0), 0);

  it('穴のマスを除く', () => {
    expect(cells(floorStrips(rect, [{ x0: 1, z0: 0, x1: 2, z1: 2 }]))).toBe(6);
  });

  it('within を渡すと、その範囲（屋根の下）のマスだけ残す', () => {
    expect(floorStrips(rect, [], [])).toEqual([]);
    expect(cells(floorStrips(rect, [], [{ x0: 2, z0: 0, x1: 10, z1: 10 }]))).toBe(4);
    expect(cells(floorStrips(rect, [{ x0: 3, z0: 0, x1: 4, z1: 1 }], [{ x0: 2, z0: 0, x1: 10, z1: 10 }]))).toBe(3);
  });
});
