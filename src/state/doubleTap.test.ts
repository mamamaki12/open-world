import { describe, expect, it } from 'vitest';
import { DoubleTap } from './doubleTap';

const tap = (g: DoubleTap, at: number, x = 100, y = 200) => {
  g.down(1, x, y, at);
  return g.up(1, x, y, at + 50);
};
describe('canvas double tap', () => {
  it('fires once per pair of short nearby taps', () => {
    const g = new DoubleTap();
    expect(tap(g, 0)).toBe(false);
    expect(tap(g, 150, 110)).toBe(true);
    expect(tap(g, 250)).toBe(false);
  });
  it('rejects slow or distant taps', () => {
    const g = new DoubleTap();
    tap(g, 0);
    expect(tap(g, 500)).toBe(false);
    expect(tap(g, 600, 300)).toBe(false);
  });
  it('rejects drags even if the finger returns to its starting point', () => {
    const g = new DoubleTap();
    tap(g, 0); g.down(1, 100, 200, 150); g.move(1, 130, 200); g.move(1, 100, 200);
    expect(g.up(1, 100, 200, 200)).toBe(false);
    expect(tap(g, 250)).toBe(false);
  });
  it('rejects holds, cancelled touches and pinch gestures', () => {
    const g = new DoubleTap();
    tap(g, 0); g.down(1, 100, 200, 100);
    expect(g.up(1, 100, 200, 400)).toBe(false);
    tap(g, 500); g.reset(); expect(tap(g, 600)).toBe(false);
    g.down(1, 100, 200, 700); g.down(2, 110, 200, 710);
    expect(g.up(1, 100, 200, 750)).toBe(false);
    expect(g.up(2, 110, 200, 760)).toBe(false);
    expect(tap(g, 800)).toBe(false);
  });
});
