import { describe, expect, it } from 'vitest';
import { GRID, LOT_D, LOT_W } from './dimensions';
import { CASINO, CASINO_ARRIVAL, atCasinoDoor, resolveLandmarks } from './landmarks';
import { PLAYER } from './walk';

describe('カジノの建物', () => {
  it('自分の土地と道路にかからない', () => {
    expect(CASINO.z0).toBeGreaterThan(LOT_D * GRID + 6.2);
    // 歩ける範囲（土地のまわり25m）の中にある
    expect(CASINO.x0).toBeGreaterThan(-25);
    expect(CASINO.x1).toBeLessThan(LOT_W * GRID + 25);
    expect(CASINO.z1).toBeLessThan(LOT_D * GRID + 25);
  });

  it('中には入り込めず、正面の外へ押し戻される', () => {
    const p = resolveLandmarks({ x: CASINO.door.x + 5, z: CASINO.z0 + 0.3 });
    expect(p.z).toBeCloseTo(CASINO.z0 - PLAYER.radius);
    expect(p.x).toBeCloseTo(CASINO.door.x + 5);
  });

  it('建物から離れていれば動かさない', () => {
    expect(resolveLandmarks({ x: 3, z: 3 })).toEqual({ x: 3, z: 3 });
  });

  it('入口の前でだけ「入る」ができる', () => {
    expect(atCasinoDoor(CASINO_ARRIVAL.x, CASINO_ARRIVAL.z)).toBe(true);
    expect(atCasinoDoor(CASINO.door.x, CASINO.z0 - PLAYER.radius)).toBe(true);
    expect(atCasinoDoor(CASINO.door.x + 8, CASINO.z0 - 1)).toBe(false);
    expect(atCasinoDoor(CASINO.door.x, CASINO.z0 - 6)).toBe(false);
    expect(atCasinoDoor(5, 5)).toBe(false);
  });

  it('着いた場所は何にもぶつかっていない', () => {
    expect(resolveLandmarks(CASINO_ARRIVAL)).toEqual({ x: CASINO_ARRIVAL.x, z: CASINO_ARRIVAL.z });
  });
});
