// 屋根の形を計算する（描画に依存しない純粋な計算）。
// 屋根の下面の多角形と、妻壁（屋根の下の三角の壁）の多角形をワールド座標（m）で返す。
import { GRID, WALL_THICKNESS, wallTopY } from './dimensions';
import type { RoofPart } from './types';

export type V3 = [number, number, number];

export interface Slab {
  /** 平らな凸多角形（ワールド座標） */
  points: V3[];
  /** 厚みの方向と大きさ */
  thickness: V3;
}

export interface RoofShape {
  planes: Slab[];
  gables: Slab[];
  /** 棟の高さ（ワールドY） */
  ridgeY: number;
}

export const ROOF_THICKNESS = 0.12;
export const FLAT_ROOF_THICKNESS = 0.22;
export const PARAPET_HEIGHT = 0.45;

export function roofShape(roof: RoofPart): RoofShape {
  const cx = ((roof.x0 + roof.x1) / 2) * GRID;
  const cz = ((roof.z0 + roof.z1) / 2) * GRID;
  const halfX = (Math.abs(roof.x1 - roof.x0) * GRID) / 2;
  const halfZ = (Math.abs(roof.z1 - roof.z0) * GRID) / 2;

  let axis = roof.axis;
  if (roof.type === 'hip') {
    // 寄棟の棟は長い辺の向きに通す
    axis = halfX >= halfZ ? 'x' : 'z';
  }
  // ローカル座標：u = 棟の向き、v = 棟に直交する向き
  const Aw = axis === 'x' ? halfX : halfZ;
  const Bw = axis === 'x' ? halfZ : halfX;
  const flipV = roof.flip ? -1 : 1;
  const toWorld = ([u, y, v]: V3): V3 => {
    const vv = v * flipV;
    return axis === 'x' ? [cx + u, y, cz + vv] : [cx + vv, y, cz + u];
  };
  const dirToWorld = ([u, y, v]: V3): V3 => {
    const vv = v * flipV;
    return axis === 'x' ? [u, y, vv] : [vv, y, u];
  };

  const yTop = wallTopY(roof.level);
  const s = roof.pitch / 10;
  const o = roof.overhang;
  const A = Aw + o;
  const B = Bw + o;
  const base = yTop - o * s;
  const up: V3 = [0, ROOF_THICKNESS, 0];
  const t = WALL_THICKNESS;

  const plane = (pts: V3[], thickness: V3 = up): Slab => ({
    points: dedupe(pts).map(toWorld),
    thickness: dirToWorld(thickness),
  });
  /** 壁面と同じ厚みで、u または v 方向を向いた縦の多角形 */
  const wallPoly = (pts: V3[], normal: V3): Slab => {
    const shifted = pts.map(([u, y, v]) => [u - (normal[0] * t) / 2, y, v - (normal[2] * t) / 2] as V3);
    return {
      points: shifted.map(toWorld),
      thickness: dirToWorld([normal[0] * t, 0, normal[2] * t]),
    };
  };

  switch (roof.type) {
    case 'gable': {
      const ridgeY = base + B * s;
      return {
        ridgeY: ridgeY + ROOF_THICKNESS,
        planes: [
          plane([[-A, base, -B], [A, base, -B], [A, ridgeY, 0], [-A, ridgeY, 0]]),
          plane([[-A, base, B], [A, base, B], [A, ridgeY, 0], [-A, ridgeY, 0]]),
        ],
        gables: [-1, 1].map((side) =>
          wallPoly(
            [[side * Aw, yTop, -Bw], [side * Aw, yTop, Bw], [side * Aw, yTop + Bw * s, 0]],
            [1, 0, 0],
          ),
        ),
      };
    }
    case 'hip': {
      const ridgeY = base + B * s;
      const r = A - B;
      return {
        ridgeY: ridgeY + ROOF_THICKNESS,
        planes: [
          plane([[-A, base, -B], [A, base, -B], [r, ridgeY, 0], [-r, ridgeY, 0]]),
          plane([[-A, base, B], [A, base, B], [r, ridgeY, 0], [-r, ridgeY, 0]]),
          plane([[-A, base, -B], [-A, base, B], [-r, ridgeY, 0]]),
          plane([[A, base, -B], [A, base, B], [r, ridgeY, 0]]),
        ],
        gables: [],
      };
    }
    case 'shed': {
      const highY = base + 2 * B * s;
      const wallHigh = yTop + 2 * Bw * s;
      return {
        ridgeY: highY + ROOF_THICKNESS,
        planes: [plane([[-A, base, -B], [A, base, -B], [A, highY, B], [-A, highY, B]])],
        gables: [
          ...[-1, 1].map((side) =>
            wallPoly([[side * Aw, yTop, -Bw], [side * Aw, yTop, Bw], [side * Aw, wallHigh, Bw]], [1, 0, 0]),
          ),
          wallPoly([[-Aw, yTop, Bw], [Aw, yTop, Bw], [Aw, wallHigh, Bw], [-Aw, wallHigh, Bw]], [0, 0, 1]),
        ],
      };
    }
    case 'flat': {
      const top = yTop + FLAT_ROOF_THICKNESS;
      const ph = top + PARAPET_HEIGHT;
      return {
        ridgeY: ph,
        planes: [plane([[-A, yTop, -B], [A, yTop, -B], [A, yTop, B], [-A, yTop, B]], [0, FLAT_ROOF_THICKNESS, 0])],
        // パラペット（屋上の立ち上がり壁）
        gables: [
          wallPoly([[-A, yTop, -B + t / 2], [A, yTop, -B + t / 2], [A, ph, -B + t / 2], [-A, ph, -B + t / 2]], [0, 0, 1]),
          wallPoly([[-A, yTop, B - t / 2], [A, yTop, B - t / 2], [A, ph, B - t / 2], [-A, ph, B - t / 2]], [0, 0, 1]),
          wallPoly([[-A + t / 2, yTop, -B], [-A + t / 2, yTop, B], [-A + t / 2, ph, B], [-A + t / 2, ph, -B]], [1, 0, 0]),
          wallPoly([[A - t / 2, yTop, -B], [A - t / 2, yTop, B], [A - t / 2, ph, B], [A - t / 2, ph, -B]], [1, 0, 0]),
        ],
      };
    }
  }
}

function dedupe(pts: V3[]): V3[] {
  const out: V3[] = [];
  for (const p of pts) {
    if (!out.some((q) => Math.abs(q[0] - p[0]) < 1e-6 && Math.abs(q[1] - p[1]) < 1e-6 && Math.abs(q[2] - p[2]) < 1e-6)) {
      out.push(p);
    }
  }
  return out;
}

export const ROOF_TYPE_NAMES: Record<RoofPart['type'], string> = {
  gable: '切妻',
  hip: '寄棟',
  shed: '片流れ',
  flat: '陸屋根',
};
