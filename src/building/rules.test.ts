import { describe, expect, it } from 'vitest';
import { roofShape } from './roof';
import {
  axisAlignedSegment,
  canPlaceFloor,
  canPlaceOpening,
  canPlaceStair,
  canChangeWallHeight,
  canPlaceWall,
  furnitureBaseY,
  partsInRect,
  removeParts,
  removePart,
  snapOpeningOffset,
  stairFootprint,
  wallOutsideSide,
} from './rules';
import { sampleHouse } from './sample';
import { emptyHouse } from './types';
import type { House, RoofPart, WallPart } from './types';
import { GRID, MAX_LEVEL, wallTopY } from './dimensions';

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

  it('壁で囲まれた部屋は、床が壁の外まではみ出していても外壁を外に向ける', () => {
    const walls = [wall('n', 2, 2, 6, 2), wall('e', 6, 2, 6, 6), wall('s', 6, 6, 2, 6), wall('w', 2, 6, 2, 2), wall('p', 4, 2, 4, 6)];
    const h: House = { ...emptyHouse(), walls, floors: [{ id: 'f', level: 0, x0: 0, z0: 0, x1: 10, z1: 10, finish }] };
    // (2,2)→(6,2) の左側（+z）が部屋
    expect(wallOutsideSide(h, walls[0])).toBe(-1);
    expect(wallOutsideSide(h, walls[1])).not.toBe(0);
    expect(wallOutsideSide(h, walls[2])).not.toBe(0);
    expect(wallOutsideSide(h, walls[3])).not.toBe(0);
    // 部屋の中の仕切りは両側とも室内
    expect(wallOutsideSide(h, walls[4])).toBe(0);
  });

  it('床がなくても、壁で囲まれていれば内側を室内とする', () => {
    const walls = [wall('n', 0, 0, 4, 0), wall('e', 4, 0, 4, 4), wall('s', 4, 4, 0, 4), wall('w', 0, 4, 0, 0)];
    const h: House = { ...emptyHouse(), walls };
    expect(wallOutsideSide(h, walls[0])).toBe(-1);
    expect(wallOutsideSide({ ...emptyHouse(), walls: walls.slice(0, 3) }, walls[0])).toBe(2);
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
    // 別の階なら重なってもよい（2階は下に壁があれば張れる）
    const withWall: House = { ...h, walls: [wall('w', 0, 0, 4, 0)] };
    expect(canPlaceFloor(withWall, 1, { x0: 0, z0: 0, x1: 4, z1: 4 })).toBeNull();
  });

  it('階段は向きに応じて1×4マスを占め、最上階には置けない', () => {
    expect(stairFootprint({ x: 5, z: 5, rot: 0 })).toEqual({ x0: 5, z0: 5, x1: 6, z1: 9 });
    expect(stairFootprint({ x: 5, z: 5, rot: 3 })).toEqual({ x0: 2, z0: 5, x1: 6, z1: 6 });
    expect(canPlaceStair(emptyHouse(), { level: MAX_LEVEL, x: 5, z: 5, rot: 0 })).not.toBeNull();
    expect(canPlaceStair(emptyHouse(), { level: 0, x: 5, z: 5, rot: 0 })).toBeNull();
    // 2階から3階へも架けられる
    expect(canPlaceStair(emptyHouse(), { level: 1, x: 5, z: 5, rot: 0 })).toBeNull();
  });

  it('U字階段は上下の階の同じ位置に積み重ねられるが、まっすぐの階段は重ねられない', () => {
    const u = { id: 'u0', level: 0, x: 5, z: 5, rot: 0 as const, shape: 'u' as const, finish };
    const h: House = { ...emptyHouse(), stairs: [u] };
    expect(canPlaceStair(h, { level: 1, x: 5, z: 5, rot: 0, shape: 'u' })).toBeNull();
    expect(canPlaceStair(h, { level: 1, x: 5, z: 6, rot: 0, shape: 'u' })).not.toBeNull();
    const straight: House = { ...emptyHouse(), stairs: [{ ...u, shape: undefined }] };
    expect(canPlaceStair(straight, { level: 1, x: 5, z: 5, rot: 0 })).not.toBeNull();
  });

  it('3階以上も、下の階の壁の上なら床を張れる', () => {
    expect(MAX_LEVEL).toBeGreaterThanOrEqual(2);
    const ring = (l: number) => [wall(`n${l}`, 0, 0, 4, 0, l), wall(`e${l}`, 4, 0, 4, 4, l), wall(`s${l}`, 4, 4, 0, 4, l), wall(`w${l}`, 0, 4, 0, 0, l)];
    const h: House = { ...emptyHouse(), walls: [...ring(0), ...ring(1), ...ring(2)] };
    const r = { x0: 0, z0: 0, x1: 4, z1: 4 };
    expect(canPlaceFloor(h, 2, r)).toBeNull();
    expect(canPlaceFloor(h, 3, r)).toBeNull();
    expect(canPlaceFloor(h, 4, r)).not.toBeNull();
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

describe('床を張れる場所', () => {
  const walled: House = { ...emptyHouse(), walls: [wall('a', 0, 0, 4, 0), wall('b', 4, 0, 4, 4)] };

  it('1階の床は地面の上ならどこでも張れる', () => {
    expect(canPlaceFloor(emptyHouse(), 0, { x0: 2, z0: 2, x1: 5, z1: 5 })).toBeNull();
  });

  it('2階の床は、下に1階の壁がかかっていれば張れる', () => {
    expect(canPlaceFloor(walled, 1, { x0: 0, z0: 0, x1: 4, z1: 4 })).toBeNull();
    expect(canPlaceFloor(walled, 1, { x0: 1, z0: -0, x1: 2, z1: 1 })).toBeNull();
  });

  it('下に壁のない空中には2階の床を張れない。角で点だけ接していてもだめ', () => {
    expect(canPlaceFloor(emptyHouse(), 1, { x0: 0, z0: 0, x1: 4, z1: 4 })).not.toBeNull();
    expect(canPlaceFloor(walled, 1, { x0: 6, z0: 6, x1: 8, z1: 8 })).not.toBeNull();
    expect(canPlaceFloor(walled, 1, { x0: 4, z0: 4, x1: 6, z1: 6 })).not.toBeNull();
  });
});

describe('半分の高さの壁', () => {
  const half = (id: string, x0: number, z0: number, x1: number, z1: number): WallPart => ({ ...wall(id, x0, z0, x1, z1), height: 'half' });

  it('半分の壁の上には2階の床を張れない', () => {
    const h: House = { ...emptyHouse(), walls: [half('a', 0, 0, 4, 0), half('b', 4, 0, 4, 4)] };
    expect(canPlaceFloor(h, 1, { x0: 0, z0: 0, x1: 4, z1: 4 })).not.toBeNull();
  });

  it('背の高い窓・ドアは付けられないが、地窓は付けられる', () => {
    const h: House = { ...emptyHouse(), walls: [half('a', 0, 0, 4, 0)] };
    expect(canPlaceOpening(h, 'a', 'door', 1.82)).not.toBeNull();
    expect(canPlaceOpening(h, 'a', 'sliding', 1.82)).not.toBeNull();
    expect(canPlaceOpening(h, 'a', 'jimado', 1.82)).toBeNull();
  });

  it('窓が収まらなくなる高さには変えられない', () => {
    const h: House = {
      ...emptyHouse(),
      walls: [wall('a', 0, 0, 4, 0)],
      openings: [{ id: 'o', wallId: 'a', kind: 'window', type: 'sliding', offset: 1.82, sashColor: '', panelColor: '' }],
    };
    expect(canChangeWallHeight(h, 'a', 'half')).not.toBeNull();
    expect(canChangeWallHeight({ ...h, openings: [] }, 'a', 'half')).toBeNull();
  });
});

describe('テラスと庭', () => {
  it('テラスに面した側は外壁として扱う', () => {
    const room = { id: 'r', level: 0, x0: 0, z0: 0, x1: 4, z1: 4, finish };
    const terrace = { id: 't', level: 0, x0: 0, z0: -2, x1: 4, z1: 0, finish, kind: 'terrace' as const };
    const w = wall('a', 0, 0, 4, 0);
    expect(wallOutsideSide({ ...emptyHouse(), floors: [room, { ...terrace, kind: undefined }], walls: [w] }, w)).toBe(0);
    expect(wallOutsideSide({ ...emptyHouse(), floors: [room, terrace], walls: [w] }, w)).not.toBe(0);
  });

  it('家具は床の上なら床の高さ、庭なら地面に置く', () => {
    const h: House = { ...emptyHouse(), floors: [{ id: 'f', level: 0, x0: 0, z0: 0, x1: 4, z1: 4, finish }] };
    expect(furnitureBaseY(h, { level: 0, x: 2 * GRID, z: 2 * GRID })).toBeCloseTo(0.5);
    expect(furnitureBaseY(h, { level: 0, x: 8 * GRID, z: 8 * GRID })).toBe(0);
  });
});

describe('まとめて消す', () => {
  it('範囲にかかるパーツを集め、まとめて消せる', () => {
    const h = sampleHouse();
    const all = partsInRect(h, { x0: 0, z0: 0, x1: 24, z1: 20 });
    expect(all.length).toBe(h.floors.length + h.walls.length + h.openings.length + h.stairs.length + h.roofs.length + h.furniture.length);
    const empty = removeParts(h, all);
    expect(empty.floors.length + empty.walls.length + empty.openings.length + empty.stairs.length + empty.roofs.length + empty.furniture.length).toBe(0);
  });

  it('範囲の外のパーツは選ばない', () => {
    const h = sampleHouse();
    expect(partsInRect(h, { x0: 0, z0: 0, x1: 2, z1: 2 })).toEqual([]);
    const some = partsInRect(h, { x0: 14, z0: 7, x1: 15, z1: 8 });
    expect(some.some((r) => r.kind === 'stair')).toBe(true);
    expect(some.length).toBeLessThan(partsInRect(h, { x0: 0, z0: 0, x1: 24, z1: 20 }).length);
  });
});
