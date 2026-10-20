import { afterEach, describe, expect, it } from 'vitest';
import { useGame } from './store';
import { emptyHouse } from '../building/types';

const original = useGame.getState();
afterEach(() => useGame.setState(original, true));
const ref = { kind: 'floor' as const, id: 'selected' };

describe('bulk selection controls', () => {
  it('keeps marks when reopening the current tool or clicking the current selection mode', () => {
    useGame.setState({ tool: 'erase', eraseMulti: true, marked: [ref] });
    useGame.getState().setTool('erase');
    useGame.getState().setEraseMulti(true);
    expect(useGame.getState().marked).toEqual([ref]);
    useGame.getState().setTool('wall');
    expect(useGame.getState().marked).toEqual([]);
  });
  it('deletes multiple marks together and restores them in one undo', () => {
    const finish = { material: 'wood', color: '#fff' };
    const house = { ...emptyHouse(), floors: ['selected', 'second'].map((id, i) => ({ id, level: 0, x0: i * 3, z0: 0, x1: i * 3 + 2, z1: 2, finish })) };
    useGame.setState({ house, past: [], future: [], lastCommit: null, dragBase: null, marked: [ref, { kind: 'floor', id: 'second' }] });
    useGame.getState().deleteMarked();
    expect(useGame.getState().house.floors).toHaveLength(0);
    expect(useGame.getState().past).toHaveLength(1);
    useGame.getState().undo();
    expect(useGame.getState().house).toBe(house);
  });
  it('moves a drawn selection of different materials and furniture as one undo', () => {
    const house = { ...emptyHouse(), floors: ['a', 'b'].map((id, i) => ({ id, level: 0, x0: 2 + i * 4, z0: 2, x1: 4 + i * 4, z1: 4, finish: { material: 'wood', color: i ? '#000' : '#fff' } })),
      furniture: [{ id: 'chair', type: 'chair', level: 0, x: 2.5, z: 2.5, rotation: 0, color: '#fff' }] };
    const marked = [{ kind: 'floor' as const, id: 'a' }, { kind: 'floor' as const, id: 'b' }, { kind: 'furniture' as const, id: 'chair' }];
    useGame.setState({ house, past: [], future: [], lastCommit: null, tool: 'select', marked, selection: marked[0], groupSelection: false });
    useGame.getState().moveSelection(1, 0);
    expect(useGame.getState().house.floors.map(p => p.x0)).toEqual([3, 7]);
    expect(useGame.getState().house.furniture[0].x).toBeCloseTo(3.41);
    expect(useGame.getState().past).toHaveLength(1);
    useGame.getState().undo();
    expect(useGame.getState().house).toBe(house);
  });
  it('preserves a drawn group when grabbing a member, and clears it on unrelated selection', () => {
    useGame.setState({ tool: 'select', marked: [ref, { kind: 'floor', id: 'second' }] });
    useGame.getState().select(ref);
    expect(useGame.getState().marked).toHaveLength(2);
    useGame.getState().select({ kind: 'floor', id: 'other' });
    expect(useGame.getState().marked).toEqual([]);
  });
});
