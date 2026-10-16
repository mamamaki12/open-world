import { describe, expect, it } from 'vitest';
import {
  JOBS, fewestPieces, makeCheckout, makeOrder, makeParcel, makeTraffic, regionOf, sameStack, scoreCount, shiftPay, sumPieces, tally,
} from './jobs';
import { seeded } from './rng';

describe('jobs', () => {
  it('pay never drops below the minimum', () => {
    for (const j of JOBS) {
      expect(shiftPay(j, 0, 0)).toBe(j.base);
      expect(shiftPay(j, 0, 99)).toBe(j.minPay);
      expect(shiftPay(j, 3, 1)).toBe(j.base + 3 * j.perTask - j.penalty);
    }
  });

  it('checkout change is non-negative and payable with fewest pieces', () => {
    const rng = seeded(1);
    for (let i = 0; i < 200; i++) {
      const c = makeCheckout(rng);
      expect(c.paid).toBeGreaterThanOrEqual(c.total);
      expect(c.change).toBe(c.paid - c.total);
      expect(sumPieces(fewestPieces(c.change))).toBe(c.change);
    }
    expect(fewestPieces(3766)).toEqual({ 1000: 3, 500: 1, 100: 2, 50: 1, 10: 1, 5: 1, 1: 1 });
  });

  it('parcels always belong to their region', () => {
    const rng = seeded(2);
    for (let i = 0; i < 200; i++) {
      const p = makeParcel(rng);
      expect(regionOf(p.pref)).toBe(p.region);
      expect(p.address.startsWith(p.pref)).toBe(true);
    }
  });

  it('orders keep the patty and drop at most one topping', () => {
    const rng = seeded(3);
    for (let i = 0; i < 100; i++) {
      const o = makeOrder(rng);
      expect(o.layers.length).toBeGreaterThan(0);
      if (o.note) expect(o.layers.join()).not.toContain(o.note.replace('抜き', ''));
    }
    expect(sameStack(['パティ', 'チーズ'], ['パティ', 'チーズ'])).toBe(true);
    expect(sameStack(['チーズ', 'パティ'], ['パティ', 'チーズ'])).toBe(false);
  });

  it('traffic counting scores exact counts as all correct', () => {
    const passes = makeTraffic(seeded(4), 30);
    expect(passes.length).toBeGreaterThan(10);
    const actual = tally(passes);
    expect(scoreCount(actual, actual)).toEqual({ ok: passes.length, miss: 0 });
    expect(scoreCount(actual, { ...actual, 乗用車: actual['乗用車'] + 2 }).miss).toBe(2);
  });
});
