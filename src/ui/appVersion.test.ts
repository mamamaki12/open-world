import { expect, it } from 'vitest';
import { appVersion, formatVersion, parseVersion } from '../../scripts/app-version.mjs';

it('adds main commits since the last package.json bump to PATCH', () => {
  expect(formatVersion(parseVersion('1.12.0'), 5)).toBe('1.12.5');
  expect(formatVersion(parseVersion('2.0.3'), 0)).toBe('2.0.3');
});
it('rejects package versions that are not MAJOR.MINOR.PATCH', () => {
  for (const v of ['1.2', 'r1234567', '1.2.3-beta']) expect(() => parseVersion(v)).toThrow();
});
it('builds a numeric version for this checkout', () => {
  expect(appVersion()).toMatch(/^\d+\.\d+\.\d+$/);
});
