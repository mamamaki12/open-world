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
  it('carries offline expenses below zero once while purchases still require funds', () => {
    const w = withAccount(initialSharedWorld('w'), 'a', 'A');
    const command = { id: 'offline-debt', lot: '', delta: [], reserved: 0, action: { type: 'money' as const, delta: -SHARED_START_MONEY - 100, label: '維持費' } };
    const next = ok(w, 'a', command);
    expect(next.accounts!.a.money).toBe(-100);
    expect(ok(next, 'a', command).accounts!.a.money).toBe(-100);
    expect(applyCommand(next, 'a', { id: 'buy-debt', lot: '', delta: [], reserved: 0, action: { type: 'buyLand', offer: next.economy.offers[0].id } }).result.ok).toBe(false);
  });
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
describe('shared world rentals', () => {
  it('tenant pays the owner when renting and every day, and is evicted when broke', () => {
    let w = withAccount(withAccount(initialSharedWorld('w'), 'a', 'A'), 'b', 'B');
    w.accounts!.a.money = 1e8;
    const offer = w.economy.offers[0].id;
    w = applyCommand(w, 'a', { id: 'buy', lot: '', delta: [], reserved: 1e9, action: { type: 'buyLand', offer } }, 'A').world;
    const lot = w.economy.lots[0].id;
    w = applyCommand(w, 'a', { id: 'r1', lot, delta: [], reserved: 0, action: { type: 'offerRent', rent: 400000 } }, 'A').world;
    const owner = w.accounts!.a.money;
    const rented = applyCommand(w, 'b', { id: 'r2', lot, delta: [], reserved: 0, action: { type: 'rentLot' } }, 'B');
    expect(rented.result.ok).toBe(true);
    w = rented.world;
    expect(w.economy.lots[0].tenant).toBe('b');
    expect(w.accounts!.b.money).toBe(SHARED_START_MONEY - 400000);
    w = tickWorld(w, 61, Math.random).world;
    expect(w.accounts!.a.money).toBe(owner + 800000);
    w = tickWorld(w, 61, Math.random).world; // 残り20万円では払えない
    expect(w.economy.lots[0].tenant).toBeUndefined();
    expect(w.accounts!.b.money).toBe(200000);
  });
  it('lets only the owner open a shop and moves a one-time payment from buyer to owner', () => {
    const { w, lot } = town();
    const shop = { name: '設計事務所', items: [{ id: 'i1', name: '設計代行', price: 300000, description: '' }], sales: [{ id: 'fake', day: 1, buyer: 'x', item: 'x', price: 1 }], revenue: 9e9 };
    const act = (who: string, id: string, action: never, reserved = 0) => applyCommand(w0, who, { id, lot: lot.id, delta: [], reserved, action }, who);
    let w0 = w;
    expect(act('b', 's0', { type: 'shop', shop } as never).result.ok).toBe(false);
    w0 = ok(w0, 'a', { id: 's1', lot: lot.id, delta: [], reserved: 0, action: { type: 'shop', shop } });
    expect(w0.economy.lots[0].shop).toMatchObject({ revenue: 0, sales: [] }); // 売上は持ち主でも書き換えられない
    expect(act('a', 'p0', { type: 'purchase', item: 'i1', price: 300000 } as never, 300000).result.message).toContain('自分のお店');
    expect(act('b', 'p1', { type: 'purchase', item: 'i1', price: 1 } as never, 1).result.message).toContain('値段が変わりました');
    const [a0, b0] = [w0.accounts!.a.money, w0.accounts!.b.money];
    const sold = ok(w0, 'b', { id: 'p2', lot: lot.id, delta: [], reserved: 300000, action: { type: 'purchase', item: 'i1', price: 300000 } });
    expect(sold.accounts!.a.money).toBe(a0 + 300000);
    expect(sold.accounts!.b.money).toBe(b0 - 300000);
    expect(sold.economy.lots[0].shop).toMatchObject({ revenue: 300000, sales: [{ buyer: 'b', item: '設計代行' }] });
    expect(applyCommand(sold, 'b', { id: 'p2', lot: lot.id, delta: [], reserved: 300000, action: { type: 'purchase', item: 'i1', price: 300000 } }, 'b').changed).toBe(false); // 二重払いしない
  });
  it('holds a request reward and pays it to the worker only when the poster confirms', () => {
    const { w, lot } = town();
    const a0 = w.accounts!.a.money, b0 = w.accounts!.b.money;
    const step = (wo: typeof w, who: string, id: string, op: string) => applyCommand(wo, who, { id, lot: lot.id, delta: [], reserved: 0, action: { type: 'requestStep', request: 'r1', op } as never }, who);
    expect(applyCommand(w, 'b', { id: 'r0', lot: lot.id, delta: [], reserved: 50000, action: { type: 'request', title: '庭の手入れ', description: '', reward: 50000 } }, 'b').result.ok).toBe(false);
    const posted = ok(w, 'a', { id: 'r1', lot: lot.id, delta: [], reserved: 50000, action: { type: 'request', title: '庭の手入れ', description: '芝刈り', reward: 50000 } });
    expect(posted.accounts!.a.money).toBe(a0 - 50000);
    expect(applyCommand(posted, 'a', { id: 'l1', lot: lot.id, delta: [], reserved: 0, action: { type: 'list', price: 1000 } }, 'a').result.ok).toBe(false); // 依頼が残っている土地は売れない
    expect(step(posted, 'a', 't0', 'take').result.ok).toBe(false);
    expect(step(posted, 'a', 'd0', 'done').result.ok).toBe(false);
    const taken = step(posted, 'b', 't1', 'take').world;
    expect(step(taken, 'a', 'c1', 'cancel').result.ok).toBe(false);
    expect(step(taken, 'b', 'd1', 'done').result.ok).toBe(false);
    const done = step(taken, 'a', 'd2', 'done').world;
    expect(done.accounts!.b.money).toBe(b0 + 50000);
    expect(done.economy.lots[0].requests).toBeUndefined();
    const cancelled = step(posted, 'a', 'c2', 'cancel').world;
    expect(cancelled.accounts!.a.money).toBe(a0);
  });
  it('charges the arcade fee from the player to the shop owner', () => {
    const { w, lot } = town();
    const opened = ok(w, 'a', { id: 's1', lot: lot.id, delta: [], reserved: 0, action: { type: 'shop', shop: { name: 'ゲームセンター', items: [], sales: [], revenue: 0, arcadeFee: 200 } } });
    const play = (wo: typeof w, who: string, id: string, fee: number) => applyCommand(wo, who, { id, lot: lot.id, delta: [], reserved: fee, action: { type: 'play', fee } }, who);
    expect(play(opened, 'a', 'g0', 200).result.ok).toBe(false);
    expect(play(opened, 'b', 'g1', 100).result.message).toContain('料金が変わりました');
    const done = play(opened, 'b', 'g2', 200).world;
    expect(done.accounts!.b.money).toBe(opened.accounts!.b.money - 200);
    expect(done.accounts!.a.money).toBe(opened.accounts!.a.money + 200);
    expect(done.economy.lots[0].shop).toMatchObject({ revenue: 200, sales: [{ buyer: 'b', price: 200 }] });
  });
});
