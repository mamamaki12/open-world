import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Ray, Vector3 } from 'three';
import { beginPartDrag } from './partDrag';
import { useGame } from '../state/store';
import { useInteraction } from '../state/interaction';
import { emptyHouse } from '../building/types';

const original = useGame.getState(), originalInteraction = useInteraction.getState();
const ref = { kind: 'floor' as const, id: 'a' };
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('window', new EventTarget());
  vi.stubGlobal('navigator', { vibrate: vi.fn() });
  const finish = { material: 'wood', color: '#fff' };
  useGame.setState({ ...original, mode: 'build', tool: 'select', groupSelection: true, past: [], future: [], dragBase: null,
    house: { ...emptyHouse(), floors: ['a', 'b'].map((id, i) => ({ id, level: 0, x0: i * 4, z0: 1, x1: i * 4 + 2, z1: 3, finish })) } });
});
afterEach(() => {
  window.dispatchEvent(new Event('pointerup'));
  vi.useRealTimers(); vi.unstubAllGlobals();
  useGame.setState(original, true); useInteraction.setState(originalInteraction, true);
});
describe('starting a grouped drag', () => {
  it('can be held before moving without deleting one member', () => {
    beginPartDrag(ref, new Ray(new Vector3(1, 10, 1), new Vector3(0, -1, 0)), 100, 100);
    vi.advanceTimersByTime(1000);
    expect(useGame.getState().house.floors.map(f => f.id)).toEqual(['a', 'b']);
    expect(useInteraction.getState().buildingDrag?.refs.map(r => r.id)).toEqual(['a', 'b']);
    expect(useGame.getState().past).toHaveLength(0);
  });
  it('preserves explicit single-part long-press deletion outside grouped movement', () => {
    useGame.setState({ groupSelection: false });
    beginPartDrag(ref, new Ray(new Vector3(1, 10, 1), new Vector3(0, -1, 0)), 100, 100);
    vi.advanceTimersByTime(600);
    expect(useGame.getState().house.floors.map(f => f.id)).toEqual(['b']);
    expect(useGame.getState().past).toHaveLength(1);
  });
  it('holds an explicit mixed selection without losing marks or deleting a member', () => {
    useGame.setState({ groupSelection: false, marked: [{ kind: 'floor', id: 'a' }, { kind: 'floor', id: 'b' }] });
    beginPartDrag(ref, new Ray(new Vector3(1, 10, 1), new Vector3(0, -1, 0)), 100, 100);
    vi.advanceTimersByTime(800);
    expect(useGame.getState().marked).toHaveLength(2);
    expect(useInteraction.getState().buildingDrag?.refs).toHaveLength(2);
    expect(useGame.getState().house.floors).toHaveLength(2);
  });
});
