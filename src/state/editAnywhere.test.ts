import { describe, expect, it } from 'vitest';
import { editTargetAt } from './editAnywhere';
import { plotX, plotZ, TOWN_HOUSE_PLOTS } from '../economy/town';
type EconomyData = Parameters<typeof editTargetAt>[2];

const lot = (id: string, plot: number) => ({ id, name: id + '（郊外）', location: 'rural', variance: 1, built: null, design: null, construction: null, rented: false, invested: 0, plot });
const at = (plot: number, from: number) => ({ x: plotX(plot) - plotX(from) + 5, z: plotZ(plot) - plotZ(from) + 5 });

describe('editTargetAt', () => {
  const town = Number(Object.keys(TOWN_HOUSE_PLOTS)[0]);
  const s = { lots: [lot('mine', 0), lot('other', 1)], currentLotId: 'mine', offers: [{ id: 'o', plot: 4 }] } as unknown as EconomyData;
  it('knows the current lot, other lots, town houses, empty plots and land for sale', () => {
    expect(editTargetAt(5, 5, s)).toEqual({ kind: 'current' });
    expect(editTargetAt(at(1, 0).x, at(1, 0).z, s)).toMatchObject({ kind: 'lot', id: 'other', name: 'other' });
    expect(editTargetAt(at(town, 0).x, at(town, 0).z, s)).toMatchObject({ kind: 'plot', plot: town, town: true });
    expect(editTargetAt(at(7, 0).x, at(7, 0).z, s)).toMatchObject({ kind: 'plot', plot: 7, town: false });
    expect(editTargetAt(at(4, 0).x, at(4, 0).z, s)).toMatchObject({ kind: 'blocked' });
  });
  it('does not build on roads', () => {
    expect(editTargetAt(-3, 5, s)).toMatchObject({ kind: 'blocked', reason: expect.stringContaining('道路') });
  });
});
