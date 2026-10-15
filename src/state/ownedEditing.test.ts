import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { activateOwnedHouse } from './ownedEditing';
import { useEconomy } from './economy';
import type { Lot } from './economy';
import { useGame } from './store';
import { emptyHouse } from '../building/types';
import { plotX, plotZ } from '../economy/town';

const originalGame = useGame.getState(), originalEconomy = useEconomy.getState();
const a = { ...emptyHouse(), furniture: [{ id: 'a', type: 'chair', level: 0, x: 3, z: 3, rotation: 0, color: '#fff' }] };
const b = { ...emptyHouse(), furniture: [{ ...a.furniture[0], id: 'b' }] };
const lot = (id: string, plot: number, design: typeof a | null): Lot => ({ id, plot, design, name: id, location: 'rural', variance: 1, built: null, construction: null, rented: false, invested: 0 });
beforeEach(() => {
  useGame.setState({ house: a, mode: 'build', tool: 'select', past: [], future: [], dragBase: null });
  useEconomy.setState({ lots: [lot('a', 0, null), lot('b', 1, b)], currentLotId: 'a' });
});
afterEach(() => { useGame.setState(originalGame, true); useEconomy.setState(originalEconomy, true); });
describe('direct editing of owned houses', () => {
  it('routes a touched house to the correct data and supplies its coordinate offset', () => {
    expect(activateOwnedHouse('b')).toEqual({ x: plotX(1) - plotX(0), z: plotZ(1) - plotZ(0) });
    expect(useGame.getState().house).toBe(b);
    expect(useGame.getState().mode).toBe('build');
    expect(activateOwnedHouse('a')).toEqual({ x: plotX(0) - plotX(1), z: plotZ(0) - plotZ(1) });
    expect(useGame.getState().house).toBe(a);
  });
  it('preserves edits made to both houses after warping', () => {
    activateOwnedHouse('b');
    const edited = { ...b, furniture: b.furniture.map(p => ({ ...p, x: 7 })) };
    useGame.getState().commit(edited);
    activateOwnedHouse('a');
    expect(useGame.getState().house).toBe(a);
    activateOwnedHouse('b');
    expect(useGame.getState().house).toBe(edited);
  });
  it('cannot activate public buildings or unknown property', () => {
    expect(activateOwnedHouse('casino')).toBeNull();
    expect(activateOwnedHouse('estate')).toBeNull();
    expect(useGame.getState().house).toBe(a);
  });
});
