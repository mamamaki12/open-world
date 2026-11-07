import { describe, expect, it } from 'vitest';
import { copyLevelOnTop, decodeBlueprint, encodeBlueprint, fitError, looksLikeCode } from './blueprints';
import { sampleHouse } from './sample';

describe('blueprints', () => {
  it('round-trips through a share code', async () => {
    const h = sampleHouse();
    const code = await encodeBlueprint('テストの家', h);
    expect(looksLikeCode(code)).toBe(true);
    const back = await decodeBlueprint(code);
    expect(back?.name).toBe('テストの家');
    expect(back?.house).toEqual(h);
    expect(await decodeBlueprint('OW1.xxxx')).toBeNull();
  });
  it('checks the lot fits', () => {
    const h = sampleHouse();
    expect(fitError(h, { w: 24, d: 20 })).toBeNull();
    expect(fitError(h, { w: 2, d: 2 })).toContain('収まりません');
  });
  it('copies a level on top and lifts the roof', () => {
    const h = sampleHouse();
    const top = Math.max(...h.floors.map((f) => f.level));
    const next = copyLevelOnTop(h, 0);
    if (typeof next === 'string') throw new Error(next);
    expect(next.floors.filter((f) => f.level === top + 1).length).toBe(h.floors.filter((f) => f.level === 0).length);
    expect(next.walls.filter((w) => w.level === top + 1).length).toBe(h.walls.filter((w) => w.level === 0).length);
    const newWalls = new Set(next.walls.filter((w) => w.level === top + 1).map((w) => w.id));
    expect(next.openings.filter((o) => newWalls.has(o.wallId)).length).toBeGreaterThan(0);
    expect(next.roofs.every((r) => r.level !== top || h.roofs.every((o) => o.level !== top))).toBe(true);
  });
});
