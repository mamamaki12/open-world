import { describe, expect, it } from 'vitest';
import { changes } from '../session/edits';
import { applyCommand, initialSharedWorld, publicWorld, tickWorld, withAccount, SHARED_START_MONEY } from './sharedWorld';
import type { SharedWorld } from './sharedWorld';

const floor = { id: 'f-test', level: 0, x0: 20, z0: 16, x1: 22, z1: 18, finish: { material: 'flooring', color: '#c8a27a' } };
const ok = (w: SharedWorld, who: string, c: Parameters<typeof applyCommand>[2]) => {
  const r = applyCommand(w, who, c, who); expect(r.result).toMatchObject({ ok: true }); return r.world;
};
function town() {
  let w = withAccount(withAccount(initialSharedWorld('w'), 'a', 'A'), 'b', 'B');
  w.accounts!.a.money = 1e8; // 土地は初期所持金より高いので、稼いだあとの状態にする
  w = ok(w, 'a', { id: 'buy1', lot: '', delta: [], reserved: 1e9, action: { type: 'buyLand', offer: w.economy.offers.find(o => o.location === 'rural')!.id } });
  return { w, lot: w.economy.lots[0] };
}
const addFloor = (w: SharedWorld, id: string) => changes(w.economy.lots.find(l => l.id === id)!.built ?? w.house, { ...w.house, floors: [floor as never] });

describe('shared world', () => {
  it('starts with no land and a separate starting balance', () => {
    const w = withAccount(initialSharedWorld('w'), 'a', 'A');
    expect(w.economy.lots).toEqual([]);
    expect(w.accounts!.a.money).toBe(SHARED_START_MONEY);
    expect(publicWorld(w)).not.toHaveProperty('accounts');
  });
  it('charges land and building to the buyer and only the owner can build', () => {
    const { w, lot } = town();
    expect(lot.owner).toBe('a');
    const before = w.accounts!.a.money;
    expect(before).toBeLessThan(1e8);
    expect(applyCommand(w, 'b', { id: 'c0', lot: lot.id, delta: addFloor(w, lot.id), reserved: 1e9 }).result.message).toContain('ほかの人');
    const built = ok(w, 'a', { id: 'c1', lot: lot.id, delta: addFloor(w, lot.id), reserved: 1e9 });
    expect(built.accounts!.a.money).toBe(before); // 着工は無料
    expect(applyCommand(built, 'b', { id: 'c1', lot: lot.id, delta: [], reserved: 0 }).result.ok).toBe(false);
  });
  it('moves money from the buyer to the seller when a listed lot sells', () => {
    const { w, lot } = town();
    const listed = ok(w, 'a', { id: 'l1', lot: lot.id, delta: [], reserved: 0, action: { type: 'list', price: 300000 } });
    expect(applyCommand(listed, 'b', { id: 'x', lot: lot.id, delta: [], reserved: 100, action: { type: 'buyLot' } }).result.ok).toBe(false);
    const sold = ok(listed, 'b', { id: 'b1', lot: lot.id, delta: [], reserved: 300000, action: { type: 'buyLot' } });
    expect(sold.economy.lots[0]).toMatchObject({ owner: 'b', ownerName: 'b' });
    expect(sold.economy.lots[0].listing).toBeUndefined();
    expect(sold.accounts!.b.money).toBe(SHARED_START_MONEY - 300000);
    expect(sold.accounts!.a.money).toBe(w.accounts!.a.money + 300000);
  });
  it('refuses purchases beyond the balance', () => {
    const { w, lot } = town();
    const listed = ok(w, 'a', { id: 'l1', lot: lot.id, delta: [], reserved: 0, action: { type: 'list', price: SHARED_START_MONEY * 2 } });
    expect(applyCommand(listed, 'b', { id: 'b1', lot: lot.id, delta: [], reserved: 1e9, action: { type: 'buyLot' } }).result.message).toContain('足りません');
  });
  it('never applies a command after it was settled as cancelled', () => {
    const { w, lot } = town();
    const s = applyCommand(w, 'a', { id: 'c2', lot: lot.id, delta: [], reserved: 0, settle: true });
    expect(applyCommand(s.world, 'a', { id: 'c2', lot: lot.id, delta: addFloor(w, lot.id), reserved: 1e9 }).result.ok).toBe(false);
  });
  it('advances days, the market and land offers', () => {
    const t = tickWorld(initialSharedWorld('w'), 61, Math.random);
    expect(t.newDay).toBe(true);
    expect(t.world.economy.day).toBe(2);
    expect(t.world.economy.offers.length).toBeGreaterThan(0);
  });
});
