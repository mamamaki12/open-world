import { expect, it } from 'vitest';
import { wallGeometry } from './geometry';

it('preserves a window opening that crosses the ends of wall segments', () => {
  const geo = wallGeometry(1, 3, 0.15, [{ lo: 0, hi: 0.6, bottom: 1, top: 2 }], 0);
  const p = geo.getAttribute('position');
  const front = geo.groups.find((g) => g.materialIndex === 0)!;
  let area = 0;
  for (let i = front.start; i < front.start + front.count; i += 3) {
    const ax = p.getX(i), ay = p.getY(i);
    area += Math.abs((p.getX(i + 1) - ax) * (p.getY(i + 2) - ay) - (p.getY(i + 1) - ay) * (p.getX(i + 2) - ax)) / 2;
  }
  expect(area).toBeCloseTo(2.4);
  geo.dispose();
});
