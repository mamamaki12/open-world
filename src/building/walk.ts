// プレイヤーが歩くときの当たり判定（描画に依存しない純粋な計算）
// - 足もとの高さ：地面、床、階段（坂として扱う）、屋根の上
// - 頭上：屋根の下面と上の階の床でつかえる。屋根の斜面は横からもすり抜けない
// - 壁：開いたドアと掃き出し窓だけ通り抜けられる。腰高の窓はよじ登って越える
// - 窓：開いた窓から出入りできるか（窓枠の高さ・すき間の大きさ）
// - 家具：床に置いた箱として押し返す
import { furnitureBounds, getFurniture, getOpening } from '../catalog';
import { GRID, SLAB_THICKNESS, STAIR_LENGTH, STORY_HEIGHT, WALL_HEIGHT, WALL_THICKNESS, floorY } from './dimensions';
import { roofHeightAt } from './roof';
import { stairFootprint, stairHoles } from './rules';
import type { OpeningDef } from '../catalog';
import type { House, OpeningPart, StairPart, WallPart } from './types';

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
  for (const r of house.roofs) {
    const h = roofHeightAt(r, x, z);
    if (h) consider(h.top);
  }
  return best;
}

/**
 * 頭がつかえる高さ（屋根の下面・上の階の床の下面のうち、足の高さより上で一番低いもの）。
 * 何もなければ Infinity
 */
export function ceilingHeight(house: House, x: number, z: number, feetY: number): number {
  let best = Infinity;
  const consider = (h: number) => {
    if (h > feetY + 0.05 && h < best) best = h;
  };
  const gx = x / GRID;
  const gz = z / GRID;
  for (const r of house.roofs) {
    const h = roofHeightAt(r, x, z);
    if (h) consider(h.bottom);
  }
  for (const f of house.floors) {
    if (f.level === 0 || gx < f.x0 || gx > f.x1 || gz < f.z0 || gz > f.z1) continue;
    const inHole = stairHoles(house, f.level).some((h) => gx > h.x0 && gx < h.x1 && gz > h.z0 && gz < h.z1);
    if (!inHole) consider(floorY(f.level) - SLAB_THICKNESS);
  }
  return best;
}

/**
 * (x, z) に立つと体が屋根に埋まるか。屋根の上面が段差で上がれる高さより高く、
 * 下面が頭より低ければ、そこへは進めない（斜面を横からすり抜けない）
 */
export function roofBlocks(house: House, x: number, z: number, feetY: number, height: number): boolean {
  return house.roofs.some((r) => {
    const h = roofHeightAt(r, x, z);
    return h !== null && h.top > feetY + PLAYER.maxStep && h.bottom < feetY + height - 0.05;
  });
}

/** 窓・ドアの枠の太さ（描画と同じ値） */
export const OPENING_FRAME = 0.045;

/** 歩きモードで開け閉めできる建具か（FIX窓・高窓は開かない） */
export function isOperable(def: OpeningDef): boolean {
  return def.kind === 'door' || def.style === 'slidingWindow' || def.style === 'casement';
}

/**
 * 開けたときに空くすき間（開口の中心からの距離 m）。
 * 引き違い窓は左の障子が右へすべるので左半分だけ空く。
 */
export function openGap(def: OpeningDef): [number, number] {
  const inner = def.width - OPENING_FRAME * 2;
  if (def.style === 'slidingWindow') return [-inner / 2, -0.03];
  return [-inner / 2, inner / 2];
}

/** 開いていれば、歩いてそのまま通れる建具（ドアと掃き出し窓） */
function walkThrough(def: OpeningDef): boolean {
  return def.kind === 'door' || (isOperable(def) && def.sill <= PLAYER.maxStep);
}

/** 壁を、通り抜けられる（開いている）ドアの部分を除いた区間に分ける（壁の始点からの距離 m） */
function solidSpans(house: House, w: WallPart, length: number, isOpen: (id: string) => boolean): [number, number][] {
  const gaps = house.openings
    .filter((o) => o.wallId === w.id && isOpen(o.id) && walkThrough(getOpening(o.type)))
    .map((o) => {
      const d = getOpening(o.type);
      if (d.kind === 'door') return [o.offset - d.width / 2, o.offset + d.width / 2] as [number, number];
      const [lo, hi] = openGap(d);
      return [o.offset + lo, o.offset + hi] as [number, number];
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

/**
 * 円（プレイヤー）を壁と家具から押し出した位置を返す。
 * isOpen：ドアが開いているか（閉じたドアは壁と同じく通れない）。省略時はすべて開いている扱い
 */
export function resolveCollisions(
  house: House,
  p: Vec2,
  feetY: number,
  height: number,
  isOpen: (id: string) => boolean = () => true,
  radius = PLAYER.radius,
): Vec2 {
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
      for (const [lo, hi] of solidSpans(house, w, len, isOpen)) {
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

export interface DoorSpot {
  id: string;
  kind: OpeningPart['kind'];
  x: number;
  z: number;
  /** プレイヤーが壁のどちら側にいるか（壁の左法線 = ローカル +Z 側なら 1） */
  side: 1 | -1;
  distance: number;
}

/** プレイヤーの近く（同じ階）で開け閉めできるドア・窓のうち一番近いもの */
export function nearestOpening(house: House, x: number, z: number, feetY: number, reach = 1.5): DoorSpot | null {
  let best: DoorSpot | null = null;
  for (const o of house.openings) {
    if (!isOperable(getOpening(o.type))) continue;
    const w = house.walls.find((ww) => ww.id === o.wallId);
    if (!w) continue;
    const y0 = floorY(w.level);
    if (feetY < y0 - PLAYER.maxStep - 0.05 || feetY > y0 + 1.0) continue;
    const len = Math.hypot(w.x1 - w.x0, w.z1 - w.z0);
    const dx = (w.x1 - w.x0) / len;
    const dz = (w.z1 - w.z0) / len;
    const cx = w.x0 * GRID + dx * o.offset;
    const cz = w.z0 * GRID + dz * o.offset;
    const distance = Math.hypot(x - cx, z - cz);
    if (distance > reach || (best && best.distance <= distance)) continue;
    const side = (x - cx) * -dz + (z - cz) * dx >= 0 ? 1 : -1;
    best = { id: o.id, kind: o.kind, x: cx, z: cz, side, distance };
  }
  return best;
}

/** ドアだけを探す（以前の呼び名） */
export function nearestDoor(house: House, x: number, z: number, feetY: number, reach = 1.5): DoorSpot | null {
  const doorsOnly = { ...house, openings: house.openings.filter((o) => o.kind === 'door') };
  return nearestOpening(doorsOnly, x, z, feetY, reach);
}

export interface WindowPassage {
  /** すき間の中心（壁の厚みの真ん中、窓台の上）のワールド座標 */
  x: number;
  z: number;
  sillY: number;
  /** プレイヤーのいる側から反対側へ向かう水平の単位ベクトル */
  nx: number;
  nz: number;
  /** すき間の幅と高さ（m） */
  width: number;
  height: number;
  /** 窓台の高さ（足もとから m） */
  climb: number;
  /** 出入りできるか。できないときは理由 */
  ok: boolean;
  reason: 'narrow' | 'high' | null;
}

/** 体が通れるすき間の最小寸法（肩幅・しゃがんだ高さ） */
export const WINDOW_MIN = { width: 0.4, height: 0.85, climb: 1.5 };

/**
 * 窓（腰高窓）を乗り越えて反対側へ出るための情報。
 * 掃き出し窓は歩いて通れるので対象外（null）。
 */
export function windowPassage(house: House, o: OpeningPart, x: number, z: number, feetY: number): WindowPassage | null {
  const def = getOpening(o.type);
  if (o.kind !== 'window' || !isOperable(def) || def.sill <= PLAYER.maxStep) return null;
  const w = house.walls.find((ww) => ww.id === o.wallId);
  if (!w) return null;
  const len = Math.hypot(w.x1 - w.x0, w.z1 - w.z0);
  const dx = (w.x1 - w.x0) / len;
  const dz = (w.z1 - w.z0) / len;
  const [lo, hi] = openGap(def);
  const mid = o.offset + (lo + hi) / 2;
  const cx = w.x0 * GRID + dx * mid;
  const cz = w.z0 * GRID + dz * mid;
  // 左法線 (-dz, dx)。プレイヤーがいる側の反対へ向かう
  const side = (x - cx) * -dz + (z - cz) * dx >= 0 ? 1 : -1;
  const sillY = floorY(w.level) + def.sill + OPENING_FRAME;
  const width = hi - lo;
  const height = def.height - OPENING_FRAME * 2;
  const climb = sillY - feetY;
  const reason = width < WINDOW_MIN.width || height < WINDOW_MIN.height ? 'narrow' : climb > WINDOW_MIN.climb || climb < -0.3 ? 'high' : null;
  return { x: cx, z: cz, sillY, nx: dz * side, nz: -dx * side, width, height, climb, ok: reason === null, reason };
}
