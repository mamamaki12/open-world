import { describe, expect, it } from 'vitest';
import { likeFactor, likeRanking, toggleLike } from './likes';

describe('likes', () => {
  it('toggles and refuses own house', () => {
    const lot = { owner: 'a', built: {}, likes: [] as string[] };
    expect(toggleLike(lot, 'a')).toContain('自分');
    const on = toggleLike(lot, 'b');
    expect(on).toEqual(['b']);
    expect(toggleLike({ ...lot, likes: on as string[] }, 'b')).toEqual([]);
    expect(toggleLike({ ...lot, built: null }, 'b')).toContain('建って');
  });
  it('factor is capped and ranking sorts', () => {
    expect(likeFactor(['x', 'y'])).toBeCloseTo(1.02);
    expect(likeFactor(Array.from({ length: 200 }, (_, i) => `p${i}`))).toBeCloseTo(1.5);
    const r = likeRanking([{ id: 1, built: {}, likes: ['a'] }, { id: 2, built: {}, likes: ['a', 'b'] }, { id: 3, built: null, likes: ['a', 'b', 'c'] }]);
    expect(r.map((l) => l.id)).toEqual([2, 1]);
  });
});
