import { expect, it } from 'vitest';
import { DEFAULT_LOOKS, HAIR_STYLES, colorPrice, getHair, salonCost, sanitizeLooks } from './looks';

it('repairs any saved or remote value into drawable looks', () => {
  expect(sanitizeLooks(null)).toEqual(DEFAULT_LOOKS);
  expect(sanitizeLooks({ sex: 'x', build: 'huge', skin: 99, face: -1, hair: 'mohawk', hairColor: 1.5 })).toEqual(DEFAULT_LOOKS);
  const ok = { sex: 'f', build: 'slim', skin: 4, face: 2, hair: 'pony', hairColor: 8 };
  expect(sanitizeLooks(ok)).toEqual(ok);
});

it('charges the salon only for what changes', () => {
  const now = { ...DEFAULT_LOOKS };
  expect(salonCost(now, { hair: now.hair, hairColor: now.hairColor })).toBe(0);
  expect(salonCost(now, { hair: 'bob', hairColor: now.hairColor })).toBe(getHair('bob').price);
  expect(salonCost(now, { hair: now.hair, hairColor: 4 })).toBe(colorPrice(4));
  expect(salonCost(now, { hair: 'long', hairColor: 6 })).toBe(getHair('long').price + colorPrice(6));
  expect(HAIR_STYLES.every((h) => h.price > 0)).toBe(true);
});
