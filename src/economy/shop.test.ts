import { describe, expect, it } from 'vitest';
import { cleanShop, newShop, recordSale, removeItem, upsertItem } from './shop';
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
});
