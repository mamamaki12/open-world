import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Ray, Vector3 } from 'three';
import { beginPartDrag } from './partDrag';
import { useGame } from '../state/store';
import { useInteraction } from '../state/interaction';
import { emptyHouse } from '../building/types';

const original = useGame.getState(), originalInteraction = useInteraction.getState();
const ray = new Ray(new Vector3(1, 10, 1), new Vector3(0, -1, 0));
beforeEach(() => {
  vi.useFakeTimers();
  useInteraction.setState({ buildingDrag: null, furnitureDrag: null });
  useGame.setState({ ...original, mode: 'build', tool: 'select', selection: null, past: [], future: [], dragBase: null,
    house: { ...emptyHouse(), floors: [{ id: 'floor', level: 0, x0: 0, z0: 0, x1: 2, z1: 2, finish: { material: 'wood', color: '#fff' } }],
      furniture: [{ id: 'chair', type: 'chair', level: 0, x: 1, z: 1, rotation: 0, color: '#fff' }] } });
});
afterEach(() => { vi.useRealTimers(); useGame.setState(original, true); useInteraction.setState(originalInteraction, true); });
describe('construction without a selection tool', () => {
  it('never selects, drags or long-press deletes a building part', () => {
    for (const groupSelection of [false, true]) {
      useGame.setState({ groupSelection });
      beginPartDrag({ kind: 'floor', id: 'floor' }, ray, 100, 100);
      vi.advanceTimersByTime(1000);
      expect(useGame.getState().selection).toBeNull();
      expect(useGame.getState().house.floors).toHaveLength(1);
      expect(useInteraction.getState().buildingDrag).toBeNull();
    }
  });
  it('only allows editing furniture that is already active after placement', () => {
    beginPartDrag({ kind: 'furniture', id: 'chair' }, ray, 100, 100);
    expect(useInteraction.getState().furnitureDrag).toBeNull();
    useGame.setState({ selection: { kind: 'furniture', id: 'chair' } });
    beginPartDrag({ kind: 'furniture', id: 'chair' }, ray, 100, 100);
    vi.advanceTimersByTime(1000);
    expect(useInteraction.getState().furnitureDrag?.id).toBe('chair');
    expect(useGame.getState().house.furniture).toHaveLength(1);
  });
  it('does not replace an active furniture drag when another pointer presses', () => {
    useGame.setState({ selection: { kind: 'furniture', id: 'chair' } });
    beginPartDrag({ kind: 'furniture', id: 'chair' }, ray, 100, 100);
    const base = useGame.getState().dragBase;
    beginPartDrag({ kind: 'furniture', id: 'chair' }, ray, 200, 200);
    expect(useGame.getState().dragBase).toBe(base);
    expect(useInteraction.getState().furnitureDrag?.startX).toBe(100);
  });
});
