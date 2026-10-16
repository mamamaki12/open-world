import { describe, expect, it } from 'vitest';
import { mergeHouses } from './join';
import { sampleHouse } from './sample';

describe('つなげた土地の家', () => {
  it('東の家をずらして足し、id が重ならない', () => {
    const a = sampleHouse();
    const m = mergeHouses(a, sampleHouse(), 28)!;
    expect(m.walls.length).toBe(a.walls.length * 2);
    const ids = [...m.walls, ...m.floors, ...m.openings].map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    const wallIds = new Set(m.walls.map((w) => w.id));
    expect(m.openings.every((o) => wallIds.has(o.wallId))).toBe(true);
    expect(m.walls[a.walls.length].x0).toBe(a.walls[0].x0 + 28);
  });
  it('片方だけでも合わせられる', () => {
    expect(mergeHouses(null, null, 28)).toBeNull();
    expect(mergeHouses(sampleHouse(), null, 28)!.walls.length).toBe(sampleHouse().walls.length);
  });
});
