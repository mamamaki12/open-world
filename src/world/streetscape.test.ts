import { describe, expect, it } from 'vitest';
import { signalState, streetLayout } from './Streetscape';
import { TOWN_ROADS } from '../economy/town';

describe('町並み', () => {
  const L = streetLayout();
  it('歩道・街灯・信号が道路の中にある', () => {
    expect(L.walks.length).toBeGreaterThan(20);
    expect(L.lamps.length).toBeGreaterThan(20);
    expect(L.signals.length % 4).toBe(0);
    const inRoad = (x: number, z: number) => TOWN_ROADS.some((r) => x >= r.x0 - 1e-6 && x <= r.x1 + 1e-6 && z >= r.z0 - 1e-6 && z <= r.z1 + 1e-6);
    expect(L.lamps.every((l) => inRoad(l.x, l.z))).toBe(true);
    expect(L.signals.every((s) => inRoad(s.x, s.z))).toBe(true);
  });
  it('縦と横の信号が同時に青にならない', () => {
    for (let t = 0; t < 60; t += 0.25) expect(signalState(t, 0) === 0 && signalState(t, 1) === 0).toBe(false);
  });
});
