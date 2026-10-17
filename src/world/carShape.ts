import * as THREE from 'three';
import type { CarDef } from '../catalog/cars';

/** 車体の形。座標は x 左右（+が右）、y 高さ、z 前後（前が −）。単位 m。 */
export interface CarShape {
  w: number; L: number; H: number; r: number; belt: number; b0: number;
  frontZ: number; rearZ: number;
  /** フロントガラスの付け根 / 後ろの窓の下端 / 屋根の前端 / 屋根の後端 */
  cf: number; cr: number; topFront: number; topRear: number;
  noseH: number; tailH: number; floorY: number;
  /** 車内の床が見える（上が開いた）範囲。ピックアップは荷台も。 */
  tubs: [number, number, number][];
  wheelZ: number[]; archR: number;
  topAt(z: number): number; hwAt(z: number): number; roofAt(z: number): number;
  hwBelt(z: number): number; hwRoof(z: number): number;
  /** 車体の断面（右半分、下の中心→外側→上の中心） */
  ring(z: number): [number, number][];
}

const CROWN = .025;
type Key = [number, number];
/** 区分線形の補間（keys は z の昇順） */
function interp(keys: Key[], z: number) {
  if (z <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (z <= keys[i][0]) {
    const [z0, v0] = keys[i - 1], [z1, v1] = keys[i];
    return z1 === z0 ? v1 : v0 + (v1 - v0) * (z - z0) / (z1 - z0);
  }
  return keys[keys.length - 1][1];
}

/** 窓の下端（ベルトライン）の高さ */
export function carBelt(d: CarDef) {
  return d.height * (d.body === 'van' ? .56 : d.body === 'roadster' ? .6 : d.body === 'coupe' || d.body === 'suv' || d.body === 'pickup' ? .58 : .6);
}
/** フロントガラスの付け根 */
export function carCowl(d: CarDef) {
  const sport = d.body === 'coupe' || d.body === 'roadster';
  return -d.length * (d.body === 'van' ? .31 : sport ? (d.seats > 2 ? .16 : .1) : .18);
}

const cache = new WeakMap<CarDef, CarShape>();
export function carShape(d: CarDef): CarShape {
  const hit = cache.get(d); if (hit) return hit;
  const w = d.width, L = d.length, H = d.height, r = d.wheel, b = d.body;
  const sport = b === 'coupe' || b === 'roadster', tall = b === 'suv' || b === 'van' || b === 'pickup';
  const belt = carBelt(d), b0 = r * .6, frontZ = -L / 2, rearZ = L / 2;
  const cf = carCowl(d);
  const cr = b === 'sedan' ? L * .32 : b === 'coupe' ? L * .32 : b === 'pickup' ? L * .2 : b === 'roadster' ? L * .15 : rearZ - (b === 'van' ? .06 : b === 'wagon' ? .08 : .1);
  const topFront = cf + L * (b === 'van' ? .14 : sport ? .14 : .12);
  const topRear = cr - (b === 'sedan' ? L * .12 : b === 'coupe' ? L * .13 : b === 'hatch' ? .28 : b === 'wagon' ? .14 : b === 'suv' ? .2 : b === 'van' ? .12 : .08);
  const noseH = Math.max(belt - (sport ? .15 : tall ? .12 : .16), sport ? 0 : 2 * r + .1);
  const deck = b === 'sedan' || b === 'coupe' || b === 'roadster' ? belt + .02 : b === 'pickup' ? belt + .04 : belt;
  const tailH = deck - .1, floorY = b0 + .08;
  const archR = r + .05, wheelZ = [-d.wheelbase / 2, d.wheelbase / 2];
  const tubs: [number, number, number][] = [[cf, b === 'roadster' ? L * .15 : cr, floorY]];
  if (b === 'pickup') tubs.push([cr + .08, rearZ - .07, belt - .32]);
  const top: Key[] = [[frontZ, noseH - .08], [frontZ + .04, noseH - .025], [frontZ + .12, noseH], [cf, belt - .02], [cr, b === 'pickup' ? belt + .04 : belt],
    [rearZ - .16, deck], [rearZ - .05, deck - .03], [rearZ, tailH]];
  const hwK: Key[] = [[frontZ, .82], [frontZ + .04, .91], [frontZ + .12, .965], [frontZ + .3, .99], [frontZ + .7, 1], [rearZ - .5, 1], [rearZ - .3, .99], [rearZ - .12, .975], [rearZ - .04, .93], [rearZ, .86]];
  const botK: Key[] = [[frontZ, b0 + .14], [frontZ + .06, b0 + .05], [frontZ + .2, b0], [rearZ - .18, b0], [rearZ - .06, b0 + .06], [rearZ, b0 + .16]];
  const topAt = (z: number) => interp(top, z), hwAt = (z: number) => w / 2 * .985 * interp(hwK, z);
  const arch = (z: number) => Math.max(0, ...wheelZ.map(zw => { const dz = z - zw; return Math.abs(dz) < archR ? r + Math.sqrt(archR * archR - dz * dz) : 0; }));
  const fender = (z: number) => Math.max(0, ...wheelZ.map(zw => { const R2 = (archR + .12) ** 2 - (z - zw) ** 2; return R2 > 0 ? r - .04 + Math.sqrt(R2) : 0; }));
  const hwBelt = (z: number) => hwAt(z) * .93;
  // 屋根の高さ：フロントガラス→屋根（少し丸い）→リアガラス
  const Hr = H - .02;
  const roofAt = (z: number) => {
    if (z <= cf) return belt;
    if (z < topFront) { const u = (z - cf) / (topFront - cf); return belt + (Hr - belt) * (1 - (1 - u) ** 1.4); }
    if (z <= topRear) { const v = (z - topFront) / Math.max(.01, topRear - topFront); return Hr - .035 * (2 * v - 1) ** 2; }
    if (z < cr) { const u = (z - topRear) / (cr - topRear), y0 = Hr - .035; return y0 - (y0 - belt) * u ** 1.5; }
    return belt;
  };
  const hwRoof = (z: number) => Math.max(.2, hwBelt(z) - (roofAt(z) - belt) * .3);
  const ring = (z: number): [number, number][] => {
    const hw = hwAt(z), t = topAt(z), tO = Math.max(t, Math.min(belt - .01, fender(z)));
    const tub = tubs.find(([a, c]) => z > a && z < c);
    const bO = Math.min(Math.max(interp(botK, z), arch(z)), tO - .1), bC = Math.min(bO, (tub ? tub[2] : t) - .05, interp(botK, z));
    const k = Math.min(1, (tO - bO) / .4);
    const side: [number, number][] = [[0, bC], [hw * .7, bO], [hw * .95, bO + .03], [hw * .995, bO + (tO - bO) * .3], [hw, bO + (tO - bO) * .62], [hw * .985, tO - .06 * k], [hw * .95, tO - .015 * k]];
    return tub ? [...side, [hw * .9, tO - .01], [hw * .88, tub[2]], [0, tub[2]]]
      : [...side, [hw * .82, (tO + t) / 2], [hw * .42, t + CROWN * .8], [0, t + CROWN]];
  };
  const s: CarShape = { w, L, H, r, belt, b0, frontZ, rearZ, cf, cr, topFront, topRear, noseH, tailH, floorY, tubs, wheelZ, archR, topAt, hwAt, roofAt, hwBelt, hwRoof, ring };
  cache.set(d, s);
  return s;
}

export type Row = ([number, number, number] | null)[];
/** 行（同じ列数の点列）を四角形でつないだ面。null の点を含む四角形は作らない。 */
export function gridGeometry(rows: Row[], { wrap = false, caps = false } = {}) {
  const pos: number[] = [], idx: number[] = [], ids: (number | null)[][] = [];
  rows.forEach(row => ids.push(row.map(p => p ? (pos.push(...p), pos.length / 3 - 1) : null)));
  for (let i = 0; i + 1 < rows.length; i++) {
    const n = rows[i].length, m = wrap ? n : n - 1;
    for (let j = 0; j < m; j++) {
      const a = ids[i][j], b = ids[i][(j + 1) % n], c = ids[i + 1][(j + 1) % n], e = ids[i + 1][j];
      if (a == null || b == null || c == null || e == null) continue;
      idx.push(a, b, c, a, c, e);
    }
  }
  if (caps) for (const i of [0, rows.length - 1]) {
    const pts = rows[i].filter(Boolean) as [number, number, number][];
    if (pts.length < 3) continue;
    const cx = pts.reduce((v, p) => v + p[0], 0) / pts.length, cy = pts.reduce((v, p) => v + p[1], 0) / pts.length;
    pos.push(cx, cy, pts[0][2]); const c = pos.length / 3 - 1, row = ids[i] as number[];
    for (let j = 0; j < row.length; j++) idx.push(c, row[j], row[(j + 1) % row.length]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
/** 右半分の断面を左右対称に広げた点列。closed は下の中心から始まり上の中心で終わる。 */
export function mirrorRing(half: [number, number][], z: number, closed: boolean): Row {
  const n = half.length, right = half.map(([x, y]) => [x, y, z] as [number, number, number]);
  const left: [number, number, number][] = [];
  for (let i = n - 2; i >= (closed ? 1 : 0); i--) left.push([-half[i][0], half[i][1], z]);
  return [...right, ...left];
}
/** a から b まで step 間隔、extra の点も必ず含む */
export function samples(a: number, b: number, step: number, extra: number[] = []) {
  const zs = new Set<number>(); for (let z = a; z < b; z += step) zs.add(+z.toFixed(4)); zs.add(b);
  extra.forEach(z => { if (z >= a && z <= b) zs.add(+z.toFixed(4)); });
  return [...zs].sort((x, y) => x - y);
}

export interface CarGeoms { body: THREE.BufferGeometry; glass: THREE.BufferGeometry | null; roof: THREE.BufferGeometry | null; pillars: THREE.BufferGeometry[] }
const geomCache = new WeakMap<CarDef, CarGeoms>();
/** 車体・窓・屋根の形（車種ごとに1回だけ作って使い回す） */
export function carGeoms(d: CarDef): CarGeoms {
  const hit = geomCache.get(d); if (hit) return hit;
  const s = carShape(d), extra = s.tubs.flatMap(([a, c]) => [a, a + .004, c - .004, c]);
  const zs = samples(s.frontZ, s.rearZ, .04, [s.frontZ + .02, s.frontZ + .04, s.frontZ + .08, s.rearZ - .02, s.rearZ - .04, s.rearZ - .08, ...extra]);
  const body = gridGeometry(zs.map(z => mirrorRing(s.ring(z), z, true)), { wrap: true, caps: true });
  let glass = null, roof = null;
  const pillars: THREE.BufferGeometry[] = [];
  if (d.body !== 'roadster') {
    const gz = samples(s.cf, s.cr, .04, [s.topFront, s.topRear]);
    glass = gridGeometry(gz.map(z => {
      const y = s.roofAt(z), hb = s.hwBelt(z), ht = s.hwRoof(z);
      return mirrorRing([[hb * .985, s.belt - .02], [hb, s.belt + .03], [ht, y - .04], [ht * .93, y - .006], [ht * .5, y], [0, y]], z, false);
    }));
    const rz = samples(s.topFront - .05, s.topRear + .05, .04);
    roof = gridGeometry(rz.map(z => {
      const y = s.roofAt(z), ht = s.hwRoof(z);
      return mirrorRing([[0, y - .03], [ht - .03, y - .03], [ht + .006, y - .045], [ht * .93 + .004, y], [ht * .5, y + .007], [0, y + .008]], z, true);
    }), { wrap: true, caps: true });
    // 柱：窓の面に沿って外側へ少し浮かせた帯（A は前の角、C/D は後ろの横窓をふさぐ板）
    const band = (zs: number[], from: number, to: number, k: number) => gridGeometry(zs.map(z => {
      const y = s.roofAt(z), hb = s.hwBelt(z), ht = s.hwRoof(z), o = .006;
      const pts: [number, number][] = [[hb * .985 + o, s.belt - .02], [hb + o, s.belt + .03], [ht + o, y - .04], [ht * .93 + o * .7, y - .002]];
      return pts.slice(from, to + 1).map(([x, yy]) => [k * x, yy, z] as [number, number, number]);
    }));
    const sailFrom = Math.max(s.topFront + .1, s.topRear - (d.body === 'coupe' ? .3 : .16));
    for (const k of [-1, 1]) {
      pillars.push(band(samples(s.cf + .01, s.topFront + .03, .03), 2, 3, k));
      pillars.push(band(samples(sailFrom, s.cr - .005, .03), 0, 3, k));
    }
  }
  const g = { body, glass, roof, pillars };
  geomCache.set(d, g);
  return g;
}
