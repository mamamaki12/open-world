import { expect, it } from 'vitest';
import { atCasinoDoor, atEstateDoor, CASINO, ESTATE, resolveLandmarks } from './landmarks';

it('only allows entry in front of the actual storefront at ground level', () => {
  expect(atEstateDoor(ESTATE.door.x, ESTATE.z0 - 1)).toBe(true);
  expect(atEstateDoor(ESTATE.door.x, ESTATE.z1 + 1)).toBe(false);
  expect(atEstateDoor(ESTATE.door.x, ESTATE.z0 - 1, 3)).toBe(false);
  expect(atCasinoDoor(CASINO.door.x, CASINO.z0 - 1)).toBe(true);
  expect(atCasinoDoor(CASINO.door.x, CASINO.z0 - 1, 3)).toBe(false);
  expect(atEstateDoor(CASINO.door.x, CASINO.z0 - 1)).toBe(false);
});
it('keeps players out of the estate building geometry', () => {
  const p = resolveLandmarks({ x: ESTATE.door.x, z: ESTATE.z0 + 0.1 });
  expect(p.z).toBeLessThan(ESTATE.z0);
});
