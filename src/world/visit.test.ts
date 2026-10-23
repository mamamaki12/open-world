import { expect, it } from 'vitest';
import { GRID } from '../building/dimensions';
import { sampleHouse } from '../building/sample';
import { emptyHouse } from '../building/types';
import { nearestOpening, surfaceHeight } from '../building/walk';
import { plotOffset, plotOffsetZ, useEconomy, type Lot } from '../state/economy';
import { visitAt } from './visit';

const lot = (id: string, plot: number, built = emptyHouse()): Lot => ({ id, owner: id, plot, name: id, location: 'rural', variance: 1, built, design: null, construction: null, rented: false, invested: 0 });

it('walks on the floors and opens the doors of another player’s house', () => {
  const house = sampleHouse();
  useEconomy.setState({ lots: [lot('me', 0), lot('friend', 1, house)], currentLotId: 'me', offers: [] });
  const ox = plotOffset(1), oz = plotOffsetZ(1);
  const vis = visitAt(ox + 10 * GRID, oz + 10 * GRID);
  expect(vis?.plot).toBe(1);
  expect(surfaceHeight(vis!.world, ox + 10 * GRID, oz + 10 * GRID, 1)).toBeGreaterThan(0);
  const door = house.openings.find(o => o.type === 'entrance')!;
  const spot = nearestOpening(vis!.world, ox + 6 * GRID + 7.735 + 0.4, oz + 14 * GRID + 0.6, 0);
  expect(spot?.id).toBe(door.id);
  expect(visitAt(10 * GRID, 10 * GRID)).toBeNull(); // 自分の家はいつもどおり
});
