import { describe, expect, it } from 'vitest';
import { roofShape } from './roof';
import {
  axisAlignedSegment,
  canPlaceFloor,
  canPlaceOpening,
  canPlaceStair,
  canPlaceWall,
  removePart,
  snapOpeningOffset,
  stairFootprint,
  wallOutsideSide,
} from './rules';
import { sampleHouse } from './sample';
import { emptyHouse } from './types';
import type { House, RoofPart, WallPart } from './types';
import { GRID, wallTopY } from './dimensions';

const finish = { material: 'siding', color: '#ffffff' };
const wall = (id: string, x0: number, z0: number, x1: number, z1: number, level = 0): WallPart => ({
  id, level, x0, z0, x1, z1, exterior: finish, interior: finish,
});

describe('壁', () => {
  it('ドラッグを縦か横の線にそろえる', () => {
    expect(axisAlignedSegment({ x: 1, z: 1 }, { x: 5, z: 2 })).toEqual({ x0: 1, z0: 1, x1: 5, z1: 1 });
    expect(axisAlignedSegment({ x: 1, z: 1 }, { x: 2, z: 6 })).toEqual({ x0: 1, z0: 1, x1: 1, z1: 6 });
  });

  it('同じ線上で重なる壁は置けないが、別の階なら置ける', () => {
    const h: House = { ...emptyHouse(), walls: [wall('a', 0, 0, 4, 0)] };
    expect(canPlaceWall(h, { level: 0, x0: 2, z0: 0, x1: 6, z1: 0 })).not.toBeNull();
    expect(canPlaceWall(h, { level: 0, x0: 4, z0: 0, x1: 6, z1: 0 })).toBeNull();
    expect(canPlaceWall(h, { level: 1, x0: 0, z0: 0, x1: 4, z1: 0 })).toBeNull();
  });

  it('床のない側を外壁として扱う', () => {
    const h: House = {
      ...emptyHouse(),
      floors: [{ id: 'f', level: 0, x0: 0, z0: 0, x1: 4, z1: 4, finish }],
    };
    // (0,0)→(4,0) の左側（+z）が室内なので、右側（-z）が外
    expect(wallOutsideSide(h, wall('w', 0, 0, 4, 0))).toBe(-1);
    // (0,4)→(4,4) の左側（+z）は床なし
    expect(wallOutsideSide(h, wall('w', 0, 4, 4, 4))).toBe(1);
    expect(wallOutsideSide(h, wall('w', 2, 0, 2, 4))).toBe(0);
  });
});

describe('窓・ドア', () => {
  const h: House = { ...emptyHouse(), walls: [wall('a', 0, 0, 4, 0)] }; // 3.64m

  it('壁に収まらない位置や、重なる位置には付けられない', () => {
    expect(canPlaceOpening(h, 'a', 'sliding', 1.82)).toBeNull();
    expect(canPlaceOpening(h, 'a', 'sliding', 0.5)).not.toBeNull();
    const withOne: House = {
      ...h,
      openings: [{ id: 'o', wallId: 'a', kind: 'window', type: 'sliding', offset: 1.0, sashColor: '', panelColor: '' }],
    };
    expect(canPlaceOpening(withOne, 'a', 'casement', 1.3)).not.toBeNull();
    expect(canPlaceOpening(withOne, 'a', 'casement', 3.0)).toBeNull();
  });

  it('位置は半マス単位に吸着し、壁の端からはみ出さない', () => {
    expect(snapOpeningOffset(3.64, 1.7, 0.78)).toBeCloseTo(1.82);
    expect(snapOpeningOffset(3.64, 0.1, 1.69)).toBeCloseTo(1.69 / 2 + 0.05);
  });

  it('壁を消すと、その壁の窓・ドアも消える', () => {
    const withOne: House = {
      ...h,
      openings: [{ id: 'o', wallId: 'a', kind: 'window', type: 'sliding', offset: 1.82, sashColor: '', panelColor: '' }],
    };
    const next = removePart(withOne, { kind: 'wall', id: 'a' });
    expect(next.walls).toHaveLength(0);
    expect(next.openings).toHaveLength(0);
  });
});

describe('床・階段', () => {
  it('同じ階で重なる床は置けない', () => {
    const h: House = { ...emptyHouse(), floors: [{ id: 'f', level: 0, x0: 0, z0: 0, x1: 4, z1: 4, finish }] };
    expect(canPlaceFloor(h, 0, { x0: 3, z0: 3, x1: 6, z1: 6 })).not.toBeNull();
    expect(canPlaceFloor(h, 0, { x0: 4, z0: 0, x1: 6, z1: 4 })).toBeNull();
    expect(canPlaceFloor(h, 1, { x0: 0, z0: 0, x1: 4, z1: 4 })).toBeNull();
  });

  it('階段は向きに応じて1×4マスを占め、最上階には置けない', () => {
    expect(stairFootprint({ x: 5, z: 5, rot: 0 })).toEqual({ x0: 5, z0: 5, x1: 6, z1: 9 });
    expect(stairFootprint({ x: 5, z: 5, rot: 3 })).toEqual({ x0: 2, z0: 5, x1: 6, z1: 6 });
    expect(canPlaceStair(emptyHouse(), { level: 1, x: 5, z: 5, rot: 0 })).not.toBeNull();
    expect(canPlaceStair(emptyHouse(), { level: 0, x: 5, z: 5, rot: 0 })).toBeNull();
  });
});

describe('屋根', () => {
  const base: RoofPart = {
    id: 'r', level: 1, x0: 0, z0: 0, x1: 10, z1: 8, type: 'gable', axis: 'x', flip: false,
    pitch: 4, overhang: 0.6, finish, gableFinish: finish,
  };

  it('切妻：2面と妻壁2枚。棟の高さは勾配どおり', () => {
    const s = roofShape(base);
    expect(s.planes).toHaveLength(2);
    expect(s.gables).toHaveLength(2);
    // 壁の線の上で屋根の下面が壁の上端に一致する
    const halfDepth = (8 * GRID) / 2;
    expect(s.ridgeY - 0.12).toBeCloseTo(wallTopY(1) + halfDepth * 0.4, 5);
  });

  it('寄棟：4面で妻壁なし。棟は長い辺の向き', () => {
    const s = roofShape({ ...base, type: 'hip', axis: 'z' });
    expect(s.planes).toHaveLength(4);
    expect(s.gables).toHaveLength(0);
    expect(s.planes[2].points).toHaveLength(3);
  });

  it('片流れ：1面と、両側の三角＋高い側の壁', () => {
    const s = roofShape({ ...base, type: 'shed' });
    expect(s.planes).toHaveLength(1);
    expect(s.gables).toHaveLength(3);
  });

  it('陸屋根：平らな屋根とパラペット4面', () => {
    const s = roofShape({ ...base, type: 'flat', overhang: 0 });
    expect(s.planes).toHaveLength(1);
    expect(s.gables).toHaveLength(4);
    expect(new Set(s.planes[0].points.map((p) => p[1])).size).toBe(1);
  });
});

describe('サンプルの家', () => {
  it('すべての窓・ドアがルールどおりに置かれている', () => {
    const h = sampleHouse();
    for (const o of h.openings) expect(canPlaceOpening(h, o.wallId, o.type, o.offset, o.id)).toBeNull();
    for (const s of h.stairs) expect(canPlaceStair(h, s, s.id)).toBeNull();
  });
});
