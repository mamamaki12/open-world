import { expect, it } from 'vitest';
import { CARS } from './cars';
import { cleanMods, quote, quoteTotal, STOCK_MODS, tunedCar, ENGINES, LABOR, WINGS } from './carMods';
const base = { color: '#204f7b', mods: STOCK_MODS };
it('quotes only the parts that changed', () => {
  expect(quote(base, base)).toEqual([]);
  const v8 = quote(base, { ...base, mods: { ...STOCK_MODS, engine: 'v8' } });
  expect(quoteTotal(v8)).toBe(ENGINES.find(e => e.id === 'v8')!.price);
  const paint = quote(base, { color: '#b52734', mods: { ...STOCK_MODS, finish: 'matte' } });
  expect(quoteTotal(paint)).toBe(LABOR.paint + 300000);
  const many = quote(base, { color: base.color, mods: { ...STOCK_MODS, camber: 5, rideHeight: -6, wheelSize: 2, wing: 'gt' } });
  expect(quoteTotal(many)).toBe(LABOR.camber + LABOR.rideHeight + LABOR.wheelSize * 2 + WINGS.find(w => w.id === 'gt')!.price);
  // 純正へ戻すのは工賃だけ
  expect(quoteTotal(quote({ ...base, mods: { ...STOCK_MODS, engine: 'v12' } }, base))).toBe(LABOR.revert);
});
it('repairs broken saved customisations', () => {
  expect(cleanMods(undefined)).toEqual(STOCK_MODS);
  const m = cleanMods({ engine: 'jet', camber: 99, rideHeight: -50, accent: 'red', wheel: 'mesh', tint: 2.4 });
  expect(m.engine).toBe('stock'); expect(m.camber).toBe(12); expect(m.rideHeight).toBe(-10); expect(m.accent).toBe(STOCK_MODS.accent); expect(m.wheel).toBe('mesh'); expect(m.tint).toBe(2);
});
it('makes engines faster and moderate stance easier to turn, extreme camber harder', () => {
  const d = CARS[2], stock = tunedCar(d), v12 = tunedCar(d, { ...STOCK_MODS, engine: 'v12' });
  expect(stock.power).toBe(d.power); expect(stock.grip).toBe(1);
  expect(v12.power).toBeGreaterThan(d.power * 1.5); expect(v12.maxSpeed).toBeGreaterThan(d.maxSpeed);
  const stance = tunedCar(d, { ...STOCK_MODS, camber: 3, rideHeight: -5 }), silly = tunedCar(d, { ...STOCK_MODS, camber: 12 });
  expect(stance.grip).toBeGreaterThan(1); expect(silly.grip).toBeLessThan(1);
  expect(tunedCar(d, { ...STOCK_MODS, rideHeight: 10 }).height).toBeCloseTo(d.height + .1);
});
