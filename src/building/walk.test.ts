import { describe, expect, it } from 'vitest';
import { GRID, STORY_HEIGHT, floorY } from './dimensions';
import { sampleHouse } from './sample';
import { LEAP_DROP, climbDuration, climbFrame, planClimb } from './climb';
import { PLAYER, ceilingHeight, nearestDoor, nearestOpening, resolveCollisions, roofBlocks, surfaceHeight, windowPassage } from './walk';

const house = sampleHouse();

describe('足もとの高さ', () => {
  it('家の外は地面、1階の床の上は床の高さ', () => {
    expect(surfaceHeight(house, 2, 2, 0)).toBe(0);
    expect(surfaceHeight(house, 9 * GRID, 9 * GRID, floorY(0))).toBeCloseTo(floorY(0));
  });

  it('地面から基礎の高さまでは段差として上がれる', () => {
    expect(surfaceHeight(house, 9 * GRID, 9 * GRID, 0)).toBeCloseTo(floorY(0));
  });

  it('1階にいるときは頭上の2階の床に吸い上げられない', () => {
    expect(surfaceHeight(house, 8 * GRID, 8 * GRID, floorY(0))).toBeCloseTo(floorY(0));
    expect(surfaceHeight(house, 8 * GRID, 8 * GRID, floorY(1))).toBeCloseTo(floorY(1));
  });

  it('階段は上るほど高くなり、上りきると2階の床の高さ', () => {
    // サンプルの階段：x=14, z=7 から +z へ4マス
    const x = 14.5 * GRID;
    const mid = surfaceHeight(house, x, 9 * GRID, floorY(0) + 1.4);
    expect(mid).toBeCloseTo(floorY(0) + STORY_HEIGHT / 2, 1);
    expect(surfaceHeight(house, x, 11 * GRID - 0.01, floorY(1) - 0.05)).toBeCloseTo(floorY(1), 1);
  });
});

describe('壁と家具の当たり判定', () => {
  it('外壁は通り抜けられない', () => {
    // 正面の壁（z=14）に外から突っ込む
    const p = resolveCollisions(house, { x: 9 * GRID, z: 14 * GRID + 0.1 }, 0, PLAYER.height);
    expect(p.z).toBeGreaterThanOrEqual(14 * GRID + 0.075 + PLAYER.radius - 1e-6);
  });

  it('玄関ドアのところは通れる', () => {
    // 玄関：正面の壁の始点 (6,14) から 7.735m
    const doorX = 6 * GRID + 7.735;
    const p = resolveCollisions(house, { x: doorX, z: 14 * GRID }, floorY(0), PLAYER.height);
    expect(p.x).toBeCloseTo(doorX);
    expect(p.z).toBeCloseTo(14 * GRID);
  });

  it('閉じた玄関ドアは通れない', () => {
    const doorX = 6 * GRID + 7.735;
    const p = resolveCollisions(house, { x: doorX, z: 14 * GRID }, floorY(0), PLAYER.height, () => false);
    expect(Math.abs(p.z - 14 * GRID)).toBeGreaterThan(0.3);
  });

  it('近くのドアと、プレイヤーが壁のどちら側にいるかがわかる', () => {
    const doorX = 6 * GRID + 7.735;
    const outside = nearestDoor(house, doorX, 14 * GRID + 0.8, 0);
    const inside = nearestDoor(house, doorX, 14 * GRID - 0.8, floorY(0));
    expect(outside?.id).toBe(inside?.id);
    expect(outside?.side).toBe(-inside!.side);
    expect(nearestDoor(house, doorX, 14 * GRID + 3, 0)).toBeNull();
  });

  it('2階にいるときは1階の壁に当たらない', () => {
    const p = resolveCollisions(house, { x: 12 * GRID, z: 10 * GRID }, floorY(1), PLAYER.height);
    expect(p.x).toBeCloseTo(12 * GRID);
  });

  it('家具（ソファ）にめり込まない', () => {
    const sofa = house.furniture.find((f) => f.type === 'sofa')!;
    const p = resolveCollisions(house, { x: sofa.x, z: sofa.z }, floorY(0), PLAYER.height);
    expect(Math.hypot(p.x - sofa.x, p.z - sofa.z)).toBeGreaterThan(0.3);
  });
});

describe('窓の出入り', () => {
  const find = (wallMatch: (w: (typeof house.walls)[number]) => boolean, type: string) => {
    const wallIds = house.walls.filter(wallMatch).map((w) => w.id);
    return house.openings.find((o) => o.type === type && wallIds.includes(o.wallId))!;
  };
  const open = (id: string) => (oid: string) => oid === id;
  const front2f = find((w) => w.level === 1 && w.z0 === 14 && w.z1 === 14, 'sliding');
  const left1f = find((w) => w.level === 0 && w.x0 === 6 && w.x1 === 6, 'sliding');

  it('掃き出し窓は開ければ歩いて通れ、閉じていれば通れない', () => {
    const patio = find((w) => w.level === 0 && w.z0 === 14 && w.z1 === 14, 'patio');
    // 引き違いの左半分が空く
    const x = 6 * GRID + patio.offset - 0.4;
    const through = resolveCollisions(house, { x, z: 14 * GRID }, floorY(0), PLAYER.height, open(patio.id));
    expect(through.z).toBeCloseTo(14 * GRID);
    const blocked = resolveCollisions(house, { x, z: 14 * GRID }, floorY(0), PLAYER.height, () => false);
    expect(Math.abs(blocked.z - 14 * GRID)).toBeGreaterThan(0.3);
  });

  it('腰高の窓は開けても歩いては通れない（よじ登る）', () => {
    const z = 6 * GRID + left1f.offset - 0.4;
    const p = resolveCollisions(house, { x: 6 * GRID, z }, floorY(0), PLAYER.height, open(left1f.id));
    expect(Math.abs(p.x - 6 * GRID)).toBeGreaterThan(0.3);
  });

  it('近くの窓も操作の対象になる。FIX窓はならない', () => {
    const z = 6 * GRID + left1f.offset;
    expect(nearestOpening(house, 6 * GRID + 0.6, z, floorY(0))?.id).toBe(left1f.id);
    const fix = find((w) => w.level === 1 && w.x0 === 6 && w.x1 === 6, 'fix');
    expect(nearestOpening(house, 6 * GRID + 0.6, 6 * GRID + fix.offset, floorY(1))?.id).not.toBe(fix.id);
  });

  it('1階の窓からは外へ足から降りる', () => {
    const z = 6 * GRID + left1f.offset;
    const pass = windowPassage(house, left1f, 6 * GRID + 0.7, z, floorY(0))!;
    expect(pass.ok).toBe(true);
    expect(pass.nx).toBeCloseTo(-1); // 室内から外（-x）へ
    const plan = planClimb(house, pass, { x: 6 * GRID + 0.7, y: floorY(0), z });
    expect(plan.leap).toBe(false);
    expect(plan.dest.y).toBe(0);
    expect(plan.dest.x).toBeLessThan(6 * GRID - 0.3);
    const end = climbFrame(plan, climbDuration(plan));
    expect(end.pos.x).toBeCloseTo(plan.dest.x);
    expect(end.pos.y).toBeCloseTo(0);
  });

  it('外から1階の窓へよじ登って入れる', () => {
    const z = 6 * GRID + left1f.offset;
    const pass = windowPassage(house, left1f, 6 * GRID - 0.7, z, 0)!;
    expect(pass.ok).toBe(true);
    const plan = planClimb(house, pass, { x: 6 * GRID - 0.7, y: 0, z });
    expect(plan.dest.y).toBeCloseTo(floorY(0));
    expect(plan.leap).toBe(false);
  });

  it('2階の窓からは枠によじ登ってから外へ飛び降りる', () => {
    const x = 6 * GRID + front2f.offset;
    const pass = windowPassage(house, front2f, x, 14 * GRID - 0.7, floorY(1))!;
    expect(pass.ok).toBe(true);
    const plan = planClimb(house, pass, { x, y: floorY(1), z: 14 * GRID - 0.7 });
    expect(plan.leap).toBe(true);
    expect(plan.drop).toBeGreaterThan(LEAP_DROP);
    expect(plan.dest.z).toBeGreaterThan(14 * GRID);
    // 途中で窓枠の上（窓台の高さ）にしゃがむ
    const phases = new Set<string>();
    let maxY = 0;
    for (let t = 0; t <= climbDuration(plan) + 0.01; t += 0.05) {
      const f = climbFrame(plan, t);
      phases.add(f.phase);
      maxY = Math.max(maxY, f.pos.y);
    }
    expect([...phases]).toEqual(['approach', 'climb', 'perch', 'leap']);
    expect(maxY).toBeGreaterThanOrEqual(pass.sillY - 1e-6);
  });

  it('外から2階の窓には届かない。小さい窓・すべり出し窓は狭くて通れない', () => {
    const x = 6 * GRID + front2f.offset;
    expect(windowPassage(house, front2f, x, 14 * GRID + 0.7, 0)!.reason).toBe('high');
    const small = find((w) => w.level === 0 && w.z0 === 6 && w.z1 === 6, 'sliding-small');
    expect(windowPassage(house, small, 6 * GRID + small.offset, 6 * GRID + 0.7, floorY(0))!.reason).toBe('narrow');
    const casement = find((w) => w.level === 0 && w.x0 === 16 && w.x1 === 16, 'casement');
    expect(windowPassage(house, casement, 16 * GRID - 0.7, 6 * GRID + casement.offset, floorY(0))!.reason).toBe('narrow');
  });
});

describe('屋根の当たり判定', () => {
  // サンプルの屋根：2階の上の切妻（x 6〜16、z 6〜14、棟は x 方向で z = 10 の上、4寸、軒の出 0.6m）
  const ridgeZ = 10 * GRID;
  const x = 11 * GRID;

  it('屋根の上に立てる。棟に近いほど高い', () => {
    const eave = surfaceHeight(house, x, 6.5 * GRID, 20);
    const ridge = surfaceHeight(house, x, ridgeZ, 20);
    expect(eave).toBeGreaterThan(floorY(1) + 2.9);
    expect(ridge).toBeGreaterThan(eave);
  });

  it('2階の部屋の中では屋根に吸い上げられない', () => {
    expect(surfaceHeight(house, x, ridgeZ, floorY(1))).toBeCloseTo(floorY(1));
  });

  it('2階でジャンプすると頭が屋根の下面でつかえる', () => {
    const ceil = ceilingHeight(house, x, ridgeZ, floorY(1) + PLAYER.height);
    expect(ceil).toBeGreaterThan(floorY(1) + 2.9);
    expect(Number.isFinite(ceil)).toBe(true);
  });

  it('1階でジャンプすると2階の床の下でつかえる。吹き抜け（階段）の上はつかえない', () => {
    expect(ceilingHeight(house, 9 * GRID, 9 * GRID, floorY(0) + PLAYER.height)).toBeCloseTo(floorY(1) - 0.25);
    expect(ceilingHeight(house, 14.5 * GRID, 9 * GRID, floorY(0) + PLAYER.height)).toBeGreaterThan(floorY(1) + 2.9);
  });

  it('屋根の上で斜面を歩いて上るのは止めない。屋根の高さの空中から斜面に横から突っ込むと止まる', () => {
    const feet = surfaceHeight(house, x, 7 * GRID, 20);
    expect(roofBlocks(house, x, 7 * GRID + 0.05, feet, PLAYER.height)).toBe(false);
    // 軒先の高さで、屋根の外から棟の近くへ入ろうとする
    expect(roofBlocks(house, x, ridgeZ - 0.3, feet, PLAYER.height)).toBe(true);
    // 地面を歩いているときは軒下を通れる
    expect(roofBlocks(house, x, 5.7 * GRID, 0, PLAYER.height)).toBe(false);
  });
});
