// 歩く画面で建てるときの「1ブロック」。床・屋根は1マス、壁は1マス分の長さの辺1本。
import { GRID } from './dimensions';

/** 狙った位置(m)のマス */
export function blockCell(x: number, z: number) {
  return { x: Math.floor(x / GRID), z: Math.floor(z / GRID) };
}

/** 狙った位置(m)にいちばん近いマスの辺（1マス分の壁の線、マス目の座標） */
export function blockWallSegment(x: number, z: number) {
  const fx = x / GRID, fz = z / GRID, cx = Math.floor(fx), cz = Math.floor(fz);
  const west = fx - cx, east = cx + 1 - fx, north = fz - cz, south = cz + 1 - fz;
  const m = Math.min(west, east, north, south);
  if (m === west) return { x0: cx, z0: cz, x1: cx, z1: cz + 1 };
  if (m === east) return { x0: cx + 1, z0: cz, x1: cx + 1, z1: cz + 1 };
  if (m === north) return { x0: cx, z0: cz, x1: cx + 1, z1: cz };
  return { x0: cx, z0: cz + 1, x1: cx + 1, z1: cz + 1 };
}
