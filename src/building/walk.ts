// プレイヤーが歩くときの当たり判定（描画に依存しない純粋な計算）
// - 足もとの高さ：地面、床、階段（坂として扱う）
// - 壁：ドアの開口だけ通り抜けられる
// - 家具：床に置いた箱として押し返す
import { furnitureBounds, getFurniture, getOpening } from '../catalog';
import { GRID, STAIR_LENGTH, STORY_HEIGHT, WALL_HEIGHT, WALL_THICKNESS, floorY } from './dimensions';
import { stairFootprint, stairHoles } from './rules';
import type { House, StairPart, WallPart } from './types';

export const PLAYER = {
  radius: 0.25,
  height: 1.7,
  crouchHeight: 1.15,
  /** 歩いて乗り越えられる段差（基礎の高さも上がれる） */
  maxStep: 0.55,
};

export interface Vec2 {
  x: number;
  z: number;
}

/** 階段の上での高さ。階段の外なら null */
function stairHeight(s: StairPart, x: number, z: number): number | null {
  const fp = stairFootprint(s);
  const gx = x / GRID;
  const gz = z / GRID;
  if (gx < fp.x0 || gx > fp.x1 || gz < fp.z0 || gz > fp.z1) return null;
  const len = STAIR_LENGTH * GRID;
  let u: number;
  switch (s.rot) {
    case 0:
      u = z - s.z * GRID;
      break;
    case 2:
      u = (s.z + 1) * GRID - z;
      break;
    case 1:
      u = x - s.x * GRID;
      break;
    case 3:
      u = (s.x + 1) * GRID - x;
      break;
  }
  return floorY(s.level) + Math.min(Math.max(u / len, 0), 1) * STORY_HEIGHT;
}

/**
 * 足もとの高さ。いまの足の高さ y から maxStep 以内で上がれる面のうち一番高いもの。
 * 1階にいるときに2階の床に吸い上げられないよう、高すぎる面は無視する。
 */
export function surfaceHeight(house: House, x: number, z: number, y: number): number {
  let best = 0;
  const limit = y + PLAYER.maxStep;
  const consider = (h: number) => {
    if (h <= limit && h > best) best = h;
  };
  const gx = x / GRID;
  const gz = z / GRID;
  for (const f of house.floors) {
    if (gx < f.x0 || gx > f.x1 || gz < f.z0 || gz > f.z1) continue;
    const inHole = stairHoles(house, f.level).some((h) => gx > h.x0 && gx < h.x1 && gz > h.z0 && gz < h.z1);
    if (!inHole) consider(floorY(f.level));
  }
  for (const s of house.stairs) {
    const h = stairHeight(s, x, z);
    if (h !== null) consider(h);
  }
  return best;
}

/** 壁を、通り抜けられるドアの部分を除いた区間に分ける（壁の始点からの距離 m） */
function solidSpans(house: House, w: WallPart, length: number): [number, number][] {
  const gaps = house.openings
    .filter((o) => o.wallId === w.id && o.kind === 'door')
    .map((o) => {
      const d = getOpening(o.type);
      return [o.offset - d.width / 2, o.offset + d.width / 2] as [number, number];
    })
    .sort((a, b) => a[0] - b[0]);
  const spans: [number, number][] = [];
  let start = -WALL_THICKNESS / 2;
  for (const [lo, hi] of gaps) {
    if (lo > start) spans.push([start, lo]);
    start = Math.max(start, hi);
  }
  const end = length + WALL_THICKNESS / 2;
  if (end > start) spans.push([start, end]);
  return spans;
}

/** 円（プレイヤー）を壁と家具から押し出した位置を返す */
export function resolveCollisions(house: House, p: Vec2, feetY: number, height: number, radius = PLAYER.radius): Vec2 {
  let { x, z } = p;
  const headY = feetY + height;
  for (let iter = 0; iter < 3; iter++) {
    for (const w of house.walls) {
      const wy0 = floorY(w.level);
      const wy1 = wy0 + WALL_HEIGHT;
      // 足が壁の上端より上（段差で越えられる高さも含む）か、頭が壁の下なら当たらない
      if (feetY >= wy1 - 0.05 || headY <= wy0 + PLAYER.maxStep) continue;
      const ax = w.x0 * GRID;
      const az = w.z0 * GRID;
      const len = Math.hypot(w.x1 - w.x0, w.z1 - w.z0) * GRID;
      const dx = ((w.x1 - w.x0) * GRID) / len;
      const dz = ((w.z1 - w.z0) * GRID) / len;
      const minD = radius + WALL_THICKNESS / 2;
      for (const [lo, hi] of solidSpans(house, w, len)) {
        const s = Math.min(Math.max((x - ax) * dx + (z - az) * dz, lo), hi);
        const cx = ax + dx * s;
        const cz = az + dz * s;
        const ox = x - cx;
        const oz = z - cz;
        const dist = Math.hypot(ox, oz);
        if (dist >= minD) continue;
        if (dist < 1e-6) {
          // 壁の真上：左法線の向きへ出す
          x = cx - dz * minD;
          z = cz + dx * minD;
        } else {
          x = cx + (ox / dist) * minD;
          z = cz + (oz / dist) * minD;
        }
      }
    }
    for (const f of house.furniture) {
      const y0 = floorY(f.level);
      const b = furnitureBounds(getFurniture(f.type));
      if (b.top < 0.1) continue; // ラグなどは踏める
      if (feetY >= y0 + b.top - 0.05 || headY <= y0) continue;
      const a = (f.rotation * Math.PI) / 180;
      const cos = Math.cos(a);
      const sin = Math.sin(a);
      // ワールド → 家具ローカル（Y軸まわりに -a 回転）
      const wx = x - f.x;
      const wz = z - f.z;
      const lx = wx * cos - wz * sin;
      const lz = wx * sin + wz * cos;
      const qx = Math.min(Math.max(lx, b.minX), b.maxX);
      const qz = Math.min(Math.max(lz, b.minZ), b.maxZ);
      let ox = lx - qx;
      let oz = lz - qz;
      let dist = Math.hypot(ox, oz);
      if (dist >= radius) continue;
      let nlx: number;
      let nlz: number;
      if (dist < 1e-6) {
        // 箱の中に入り込んだ：一番近い辺から外へ
        const pushes = [
          [b.minX - radius - lx, 0],
          [b.maxX + radius - lx, 0],
          [0, b.minZ - radius - lz],
          [0, b.maxZ + radius - lz],
        ].sort((m, n) => Math.abs(m[0] + m[1]) - Math.abs(n[0] + n[1]));
        nlx = lx + pushes[0][0];
        nlz = lz + pushes[0][1];
      } else {
        ox /= dist;
        oz /= dist;
        dist = radius;
        nlx = qx + ox * dist;
        nlz = qz + oz * dist;
      }
      // ローカル → ワールド（+a 回転）
      x = f.x + nlx * cos + nlz * sin;
      z = f.z - nlx * sin + nlz * cos;
    }
  }
  return { x, z };
}
