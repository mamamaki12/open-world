import { describe, expect, it } from 'vitest';
import { emptyHouse } from '../building/types';
import type { Lot } from '../state/economy';
import type { WorldSave } from './saves';
import { lotForTrade, validTradeLot, withLot, withoutLot } from './tradeLots';

const lot = (id: string, plot?: number, extra: Partial<Lot> = {}): Lot => ({ id, name: id, location: 'rural', variance: 1, built: emptyHouse(), design: null, construction: null, rented: false, invested: 1, plot, ...extra });
const world = (lots: Lot[], current: string | null): WorldSave => ({ worldId: 'w', doors: {}, receipts: {}, house: emptyHouse(),
  economy: { day: 1, clock: 0, market: 1, marketHistory: [], offers: [], lots, currentLotId: current } }) as WorldSave;

describe('player house trade', () => {
  it('sends the shown blueprint and switches to another lot after selling', () => {
    const w = world([lot('a', 0), lot('b', 1)], 'a');
    const t = lotForTrade(w, 'a')!;
    expect(validTradeLot(t)).toBe(true);
    expect(t.design).toEqual(w.house);
    const after = withoutLot(w, 'a');
    expect(after.economy.lots.map(l => l.id)).toEqual(['b']);
    expect(after.economy.currentLotId).toBe('b');
  });
  it('refuses lots under construction', () => {
    expect(lotForTrade(world([lot('a', 0, { construction: { target: emptyHouse(), cost: 1, total: 1, remaining: 1 } })], null), 'a')).toBeNull();
  });
  it('keeps the plot when free and moves to a free plot otherwise', () => {
    const r1 = withLot(world([], null), lot('x', 1), 500, 'n') as WorldSave;
    expect(r1.economy.lots[0]).toMatchObject({ id: 'n', plot: 1, invested: 500 });
    expect(r1.economy.currentLotId).toBe('n');
    const r2 = withLot(world([lot('a', 1)], 'a'), lot('x', 1), 500, 'n') as WorldSave;
    const placed = r2.economy.lots.find(l => l.id === 'n')!;
    expect(placed.plot).not.toBe(1);
    expect(typeof placed.plot).toBe('number');
  });
  it('rejects joined lots whose plots are taken', () => {
    expect(typeof withLot(world([lot('a', 1)], 'a'), lot('x', 0, { joined: 1 }), 5, 'n')).toBe('string');
  });
});
