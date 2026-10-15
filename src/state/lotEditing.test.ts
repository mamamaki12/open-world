import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { emptyHouse } from '../building/types';
import type { House } from '../building/types';
import { useEconomy } from './economy';
import type { Lot } from './economy';
import { useGame } from './store';
import { useInteraction } from './interaction';
import { selectLotForEditing, useBuildView } from './lotEditing';

const gameBefore = useGame.getState(), economyBefore = useEconomy.getState(), interactionBefore = useInteraction.getState();
const house = (id: string): House => ({ ...emptyHouse(), furniture: [{ id, type: 'chair', level: 0, x: 3, z: 3, rotation: 0, color: '#fff' }] });
const a = house('a'), b = house('b');
const lot = (id: string, plot: number, design: House | null): Lot => ({ id, name: id, location: 'rural', variance: 1, built: null, design, construction: null, rented: false, invested: 0, plot });

beforeEach(() => {
  useGame.setState({ house: a, mode: 'walk', past: [], future: [], selection: null, dragBase: null });
  useEconomy.setState({ lots: [lot('home-a', 0, null), lot('home-b', 1, b)], currentLotId: 'home-a' });
});
afterEach(() => {
  useGame.setState(gameBefore, true);
  useEconomy.setState(economyBefore, true);
  useInteraction.setState(interactionBefore, true);
});

describe('editing another owned house', () => {
  it('opens the selected house for building and allows returning to the original', () => {
    expect(selectLotForEditing('home-b')).toBe(true);
    expect(useGame.getState().mode).toBe('build');
    expect(useGame.getState().house).toBe(b);
    expect(useEconomy.getState().currentLotId).toBe('home-b');
    selectLotForEditing('home-a');
    expect(useGame.getState().house).toBe(a);
  });
  it('keeps independent edits when switching back and forth', () => {
    selectLotForEditing('home-b');
    const editedB = { ...b, furniture: b.furniture.map(p => ({ ...p, x: 5 })) };
    useGame.getState().commit(editedB);
    selectLotForEditing('home-a');
    const editedA = { ...a, furniture: a.furniture.map(p => ({ ...p, z: 7 })) };
    useGame.getState().commit(editedA);
    selectLotForEditing('home-b');
    expect(useGame.getState().house).toBe(editedB);
    selectLotForEditing('home-a');
    expect(useGame.getState().house).toBe(editedA);
  });
  it('clears old selection, previews and undo history so the previous house cannot be overwritten', () => {
    useGame.setState({ past: [emptyHouse()], future: [emptyHouse()], selection: { kind: 'furniture', id: 'a' }, marked: [{ kind: 'furniture', id: 'a' }], tool: 'erase' });
    useInteraction.setState({ preview: { kind: 'furniture', x: 1, z: 1 } });
    const focus = useBuildView.getState().focusVersion;
    selectLotForEditing('home-b');
    expect(useGame.getState().selection).toBeNull();
    expect(useGame.getState().marked).toEqual([]);
    expect(useGame.getState().tool).toBe('select');
    expect(useInteraction.getState().preview).toBeNull();
    expect(useGame.getState().past).toEqual([]);
    expect(useGame.getState().future).toEqual([]);
    expect(useBuildView.getState().focusVersion).toBe(focus + 1);
    useGame.getState().undo();
    expect(useGame.getState().house).toBe(b);
  });
  it('does not switch to land the player does not own', () => {
    expect(selectLotForEditing('not-owned')).toBe(false);
    expect(useEconomy.getState().currentLotId).toBe('home-a');
    expect(useGame.getState().house).toBe(a);
  });
});
