import { describe, it, expect } from 'vitest';
import { emptyHouse } from '../building/types';
import { applyChanges, changes } from './edits';
import { sampleHouse } from '../building/sample';
describe('collaborative building', () => {
  it('merges changes to independent furniture without losing another builder', () => {
    const h = sampleHouse(), a = structuredClone(h), b = structuredClone(h);
    a.furniture[0].x += .1; b.furniture[1].x += .1;
    const next = applyChanges(applyChanges(h, changes(h, a)), changes(h, b));
    expect(next.furniture[0].x).toBe(a.furniture[0].x); expect(next.furniture[1].x).toBe(b.furniture[1].x);
  });
  it('rejects conflicting edits and replays of the same operation', () => {
    const h = sampleHouse(), a = structuredClone(h); a.furniture[0].x += .1;
    const d = changes(h, a), next = applyChanges(h, d);
    expect(() => applyChanges(next, d)).toThrow('同じ部品');
  });
  it('rejects duplicate changes and invalid values', () => {
    const h = sampleHouse(), a = structuredClone(h); a.furniture[0].x = Infinity;
    expect(() => applyChanges(h, changes(h, a))).toThrow();
    const d = changes(emptyHouse(), h); expect(() => applyChanges(emptyHouse(), [...d, d[0]])).toThrow();
  });
  it('revalidates placement after another builder adds a floor at the same position', () => {
    const h = sampleHouse(), a = structuredClone(h), b = structuredClone(h);
    a.floors = [{ ...h.floors[0], id: 'new-floor-a' }];
    b.floors = [{ ...h.floors[0], id: 'new-floor-b' }];
    const first = applyChanges(emptyHouse(), changes(emptyHouse(), { ...emptyHouse(), floors: a.floors }));
    expect(() => applyChanges(first, changes(emptyHouse(), { ...emptyHouse(), floors: b.floors }))).toThrow();
  });
});
