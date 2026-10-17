import { describe, expect, it } from 'vitest';
import { soldCost, unitYen, unitsFor, valuation } from './stocks';
import type { Quotes } from './stocks';
const q = (price: number, currency: string) => ({ price, prevClose: price, currency, time: 0, intraday: [], daily: [] });
const data: Quotes = { updated: 0, quotes: { '^N225': q(40000, 'JPY'), '^GSPC': q(6000, 'USD'), 'JPY=X': q(150, 'JPY') } };
describe('証券の計算', () => {
  it('円建てはそのまま、ドル建ては為替で円換算する', () => {
    expect(unitYen('^N225', data)).toBe(40000);
    expect(unitYen('^GSPC', data)).toBe(900000);
    expect(unitYen('AAPL', data)).toBeNull();
  });
  it('金額から口数、評価損益と売却原価', () => {
    expect(unitsFor(100000, 40000)).toBe(2.5);
    const h = { units: 2.5, cost: 100000 };
    expect(valuation(h, 44000)).toEqual({ value: 110000, gain: 10000, pct: expect.closeTo(10, 6) });
    expect(soldCost(h, 1)).toBe(40000);
  });
});
