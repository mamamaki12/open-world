import { describe, expect, it } from 'vitest';
import { PREFABS, placePrefab } from './prefabs';
import { emptyHouse } from './types';
import type { House } from './types';
import { isHouse } from '../save/storage';

const lot = { w: 24, d: 20 };
describe('instant shops', () => {
  it('places every kind with a register on an empty lot', () => {
    for (const p of PREFABS) {
      const h = placePrefab(emptyHouse(), p.id, lot, 'k') as House;
      expect(typeof h).toBe('object');
      expect(isHouse(h)).toBe(true);
      expect(h.furniture.some(f => f.type === 'register')).toBe(true);
      expect(h.roofs).toHaveLength(1);
    }
  });
  it('does not overlap earlier buildings and stops when the lot is full', () => {
    let h = emptyHouse(), n = 0;
    for (; n < 50; n++) {
      const next = placePrefab(h, 'prefab-shop', lot, 'k' + n);
      if (typeof next === 'string') { expect(next).toContain('空きがありません'); break; }
      h = next;
    }
    expect(n).toBeGreaterThan(1);
    const ids = [...h.walls, ...h.floors, ...h.furniture].map(p => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    const floors = h.floors;
    for (const a of floors) for (const b of floors) if (a !== b) expect(a.x0 < b.x1 && b.x0 < a.x1 && a.z0 < b.z1 && b.z0 < a.z1).toBe(false);
  });
});
