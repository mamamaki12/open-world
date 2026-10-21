import { expect, it } from 'vitest';
import { periodicSaveDue } from './periodicSave';
it('keeps walking checkpoints and avoids full-world snapshots every two seconds while in a vehicle', () => {
  expect(periodicSaveDue(2000, 0, false)).toBe(true);
  expect(periodicSaveDue(2000, 0, true)).toBe(false);
  expect(periodicSaveDue(12000, 0, true)).toBe(true);
  expect(periodicSaveDue(4000, 2000, false)).toBe(true);
});
