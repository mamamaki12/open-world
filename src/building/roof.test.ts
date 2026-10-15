import { describe, expect, it } from 'vitest';
import { roofHeightAt, roofShape } from './roof';
import type { RoofPart, RoofType } from './types';

const roof = (type: RoofType, axis: 'x' | 'z', flip: boolean): RoofPart => ({
  id: 'r',
  level: 0,
  x0: 2,
  z0: 3,
  x1: 10,
  z1: 8,
  type,
  axis,
  flip,
  pitch: type === 'flat' ? 0 : 5,
  overhang: type === 'flat' ? 0 : 0.5,
  finish: { material: 'slate', color: '#333' },
  gableFinish: { material: 'siding', color: '#eee' },
});

describe('屋根の高さ（当たり判定用）', () => {
  for (const type of ['gable', 'hip', 'shed', 'flat'] as RoofType[]) {
    for (const axis of ['x', 'z'] as const) {
      for (const flip of [false, true]) {
        it(`${type} / ${axis}${flip ? ' / 反転' : ''}：描画する屋根面の頂点と下面の高さが合う`, () => {
          const r = roof(type, axis, flip);
          for (const plane of roofShape(r).planes) {
            // 頂点を少し面の内側へ寄せて調べる（境目の取り合いを避ける）
            const n = plane.points.length;
            const cx = plane.points.reduce((a, p) => a + p[0], 0) / n;
            const cy = plane.points.reduce((a, p) => a + p[1], 0) / n;
            const cz = plane.points.reduce((a, p) => a + p[2], 0) / n;
            for (const [px, py, pz] of plane.points) {
              const k = 0.98;
              const h = roofHeightAt(r, cx + (px - cx) * k, cz + (pz - cz) * k);
              expect(h).not.toBeNull();
              expect(h!.bottom).toBeCloseTo(cy + (py - cy) * k, 2);
            }
          }
        });
      }
    }
  }

  it('屋根の外は null', () => {
    expect(roofHeightAt(roof('gable', 'x', false), 0, 0)).toBeNull();
  });
});
