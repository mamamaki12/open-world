import { describe, expect, it } from 'vitest';
import { GRID, STORY_HEIGHT, floorY } from './dimensions';
import { sampleHouse } from './sample';
import { PLAYER, resolveCollisions, surfaceHeight } from './walk';

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
