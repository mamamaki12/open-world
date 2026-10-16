import { expect, it } from 'vitest';
import { BOUTIQUE_IDS } from '../building/boutiques';
import { DEFAULT_OUTFIT, GARMENTS, SLOTS, garmentsOf, purchase, sanitizeWardrobe, wear } from './clothes';

it('sells every kind of item in each shop, with clearly separated price ranges from luxury to fast fashion', () => {
  const ranges = BOUTIQUE_IDS.map((id) => {
    const items = garmentsOf(id);
    for (const slot of SLOTS) expect(items.some((g) => g.slot === slot)).toBe(true);
    return { min: Math.min(...items.map((g) => g.price)), max: Math.max(...items.map((g) => g.price)) };
  });
  // maison > atelier > urban > daily（高い順）。平均で比べ、最安店の最高値はハイブランドの最安値より安い
  const avg = BOUTIQUE_IDS.map((id) => garmentsOf(id).reduce((a, g) => a + g.price, 0) / garmentsOf(id).length);
  for (let i = 1; i < avg.length; i++) expect(avg[i]).toBeLessThan(avg[i - 1] / 3);
  expect(ranges[3].max).toBeLessThan(ranges[0].min);
  expect(new Set(GARMENTS.map((g) => g.id)).size).toBe(GARMENTS.length);
});

it('buys, wears and keeps clothes, and repairs broken saves', () => {
  let d = sanitizeWardrobe(null);
  expect(d.outfit).toEqual(DEFAULT_OUTFIT);
  expect(purchase(d, 'mv-coat', 1000)).toBe('お金が足りません');
  const r = purchase(d, 'dw-tee', 1000);
  if (typeof r === 'string') throw new Error(r);
  expect(r.cost).toBe(990);
  d = r.data;
  expect(d.outfit.top).toBe('dw-tee');
  expect(purchase(d, 'dw-tee', 1000)).toBe('もう持っています');
  d = wear(d, 'top', 'starter-tee');
  expect(d.outfit.top).toBe('starter-tee');
  expect(wear(d, 'top', 'mv-coat').outfit.top).toBe('starter-tee'); // 持っていない服は着られない
  expect(wear(d, 'bottom', 'dw-tee').outfit.bottom).toBe('starter-pants'); // 部位がちがう
  expect(wear(d, 'hat', null).outfit.hat).toBeNull();
  const saved = sanitizeWardrobe(JSON.parse(JSON.stringify(d)));
  expect(saved).toEqual(d);
  const broken = sanitizeWardrobe({ owned: ['nope', 42, 'ut-cap'], outfit: { top: 'mv-coat', hat: 'ut-cap', bottom: 'zzz' } });
  expect(broken.owned).toContain('ut-cap');
  expect(broken.outfit).toEqual({ ...DEFAULT_OUTFIT, hat: 'ut-cap' });
});
