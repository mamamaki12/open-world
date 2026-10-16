import { describe, expect, it } from 'vitest';
import { cleanShop, listedShops, newShop, passesOf, recordSale, removeItem, upsertItem } from './shop';
import type { Shop } from './shop';

const item = { id: 'a', name: '家の設計代行', price: 300_000, description: '2階建てまで' };

describe('player shops', () => {
  it('adds any free-form item and rejects bad prices', () => {
    const s = upsertItem(newShop('しんご設計'), item) as Shop;
    expect(s.items).toHaveLength(1);
    expect(upsertItem(s, { ...item, id: 'b', price: 0 })).toMatch(/1円以上/);
    expect(upsertItem(s, { ...item, id: 'b', price: 1.5 })).toMatch(/整数/);
    expect(upsertItem(s, { ...item, id: 'c', name: ' ' })).toMatch(/商品名/);
    expect((upsertItem(s, { ...item, price: 1000 }) as Shop).items[0].price).toBe(1000);
    expect(removeItem(s, 'a').items).toHaveLength(0);
  });
  it('caps the item count', () => {
    let s = newShop('x');
    for (let i = 0; i < 12; i++) s = upsertItem(s, { ...item, id: 'i' + i }) as Shop;
    expect(upsertItem(s, { ...item, id: 'over' })).toMatch(/12個/);
  });
  it('records a one-time sale only at the listed price', () => {
    const s = upsertItem(newShop('x'), item) as Shop;
    const r = recordSale(s, { id: 'p1', day: 3, buyer: 'たろう', itemId: 'a', price: 300_000 });
    expect(typeof r).not.toBe('string');
    if (typeof r !== 'string') { expect(r.shop.revenue).toBe(300_000); expect(r.shop.sales[0]).toMatchObject({ buyer: 'たろう', item: '家の設計代行' }); }
    expect(recordSale(s, { id: 'p2', day: 3, buyer: 'x', itemId: 'a', price: 1 })).toMatch(/値段が変わりました/);
    expect(recordSale(s, { id: 'p3', day: 3, buyer: 'x', itemId: 'zz', price: 1 })).toMatch(/取り下げ/);
  });
  it('drops unsafe data from the network', () => {
    const s = cleanShop({ name: 'x'.repeat(99), items: [{ ...item, photo: 'javascript:alert(1)' }, { id: 'b', name: 'n', price: -5 }], sales: 'no', revenue: 'a' })!;
    expect(s.name).toHaveLength(24);
    expect(s.items).toHaveLength(1);
    expect(s.items[0].photo).toBeUndefined();
    expect(s.sales).toEqual([]);
    expect(cleanShop(null)).toBeNull();
  });
  it('sells tickets, reservations and memberships as passes the buyer can show', () => {
    let s = newShop('ジム');
    s = upsertItem(s, { id: 'm', name: '月会員', price: 5000, description: '', kind: 'membership', days: 30 }) as Shop;
    s = upsertItem(s, { id: 'r', name: '貸切', price: 9000, description: '', kind: 'reservation' }) as Shop;
    s = upsertItem(s, { id: 't', name: '入場券', price: 500, description: '', kind: 'ticket' }) as Shop;
    expect(cleanShop(s)!.items.map(i => i.kind)).toEqual(['membership', 'reservation', 'ticket']);
    expect(recordSale(s, { id: 'x', day: 5, buyer: 'b', buyerId: 'B', itemId: 'r', price: 9000, forDay: 40 })).toMatch(/30日以内/);
    for (const [id, itemId, price, forDay] of [['1', 'm', 5000, undefined], ['2', 'r', 9000, 8], ['3', 't', 500, undefined]] as const) {
      const r = recordSale(s, { id, day: 5, buyer: 'b', buyerId: 'B', itemId, price, forDay });
      if (typeof r === 'string') throw Error(r);
      s = r.shop;
    }
    expect(s.sales[0].until).toBe(34);
    expect(passesOf(s, 'B', 5).map(p => p.item)).toEqual(['月会員', '貸切', '入場券']);
    expect(passesOf(s, 'B', 35).map(p => p.item)).toEqual(['入場券']);
    expect(passesOf(s, 'someone', 5)).toEqual([]);
  });
});

describe('shop promotion', () => {
  it('keeps clean sign, flyer, pin and event, and lists pinned shops and upcoming events', () => {
    const s = cleanShop({ ...newShop('喫茶'), sign: '  珈琲あります  ', flyer: 'x'.repeat(500), pin: 'yes', event: { title: 'ライブ', day: 5, note: '夜' } })!;
    expect(s.sign).toBe('珈琲あります');
    expect(s.flyer).toHaveLength(120);
    expect(s.pin).toBeUndefined();
    expect(s.event).toEqual({ title: 'ライブ', day: 5, note: '夜' });
    expect(cleanShop({ ...newShop('a'), event: { title: '', day: 3 } })!.event).toBeUndefined();
    const lots = [{ id: 'a', shop: { ...newShop('B'), pin: true } }, { id: 'b', shop: { ...newShop('A'), event: { title: 'e', day: 4, note: '' } } }, { id: 'c', shop: { ...newShop('C'), event: { title: 'old', day: 1, note: '' } } }, { id: 'd' }];
    expect(listedShops(lots, 2).map((l) => l.id)).toEqual(['b', 'a']);
  });
});
