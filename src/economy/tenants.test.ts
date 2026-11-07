import { describe, expect, it } from 'vitest';
import { satisfaction, residentSeeds } from './tenants';
import { emptyHouse } from '../building/types';
import { sampleHouse } from '../building/sample';

describe('tenants', () => {
  it('empty house is unhappy, sample house is better', () => {
    const empty = satisfaction(emptyHouse());
    const good = satisfaction(sampleHouse());
    expect(empty.rentFactor).toBeLessThan(1);
    expect(good.score).toBeGreaterThan(empty.score);
    expect(good.rentFactor).toBeLessThanOrEqual(1.4);
  });
  it('seeds are stable per lot', () => {
    expect(residentSeeds('lot-a', 3)).toEqual(residentSeeds('lot-a', 3));
    expect(residentSeeds('lot-a', 1)).not.toEqual(residentSeeds('lot-b', 1));
  });
});
