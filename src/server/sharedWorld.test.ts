import { describe, expect, it } from 'vitest';
import { changes } from '../session/edits';
import { applyCommand, initialSharedWorld, tickWorld } from './sharedWorld';

const floor = { id: 'f-test', level: 0, x0: 20, z0: 16, x1: 22, z1: 18, finish: { material: 'flooring', color: '#c8a27a' } };
const addFloor = (w: ReturnType<typeof initialSharedWorld>) => changes(w.house, { ...w.house, floors: [...w.house.floors, floor as never] });

describe('shared world', () => {
  it('applies a paid edit, refuses a replay from someone else, and returns the same receipt to the sender', () => {
    const w = initialSharedWorld('w'), delta = addFloor(w);
    const r = applyCommand(w, 'a', { id: 'c1', lot: 'shared-square', delta, reserved: 1e9 });
    expect(r.result).toMatchObject({ ok: true });
    expect(r.world.house.floors.some(f => f.id === 'f-test')).toBe(true);
    expect(applyCommand(r.world, 'b', { id: 'c1', lot: 'shared-square', delta, reserved: 1e9 }).result.ok).toBe(false);
    expect(applyCommand(r.world, 'a', { id: 'c1', lot: 'shared-square', delta, reserved: 1e9 }).result).toEqual(r.result);
  });
  it('never applies a command after it was settled as cancelled', () => {
    const w = initialSharedWorld('w'), delta = addFloor(w);
    const s = applyCommand(w, 'a', { id: 'c2', lot: 'shared-square', delta: [], reserved: 0, settle: true });
    expect(s.result.ok).toBe(false);
    const late = applyCommand(s.world, 'a', { id: 'c2', lot: 'shared-square', delta, reserved: 1e9 });
    expect(late.result.ok).toBe(false);
    expect(late.world.house.floors.some(f => f.id === 'f-test')).toBe(false);
  });
  it('only lets the owner build on an owned lot', () => {
    const w = initialSharedWorld('w');
    w.economy.lots[0].owner = 'a';
    expect(applyCommand(w, 'b', { id: 'c3', lot: 'shared-square', delta: addFloor(w), reserved: 1e9 }).result.message).toContain('ほかの人');
  });
  it('rejects a reservation lower than the real cost', () => {
    const w = initialSharedWorld('w');
    expect(applyCommand(w, 'a', { id: 'c4', lot: 'shared-square', delta: addFloor(w), reserved: 0 }).result.ok).toBe(false);
  });
  it('advances days and the market', () => {
    const t = tickWorld(initialSharedWorld('w'), 61, () => 0.5);
    expect(t.newDay).toBe(true);
    expect(t.world.economy.day).toBe(2);
  });
});
