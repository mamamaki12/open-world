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
});
