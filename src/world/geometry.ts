// 壁・床・屋根の形（BufferGeometry）を計算で作る
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { GRID } from '../building/dimensions';
import type { Rect } from '../building/rules';
import type { Slab } from '../building/roof';

export interface Hole {
  lo: number;
  hi: number;
  bottom: number;
  top: number;
}

/**
 * 壁の形。ローカル座標で X = 壁の長さ方向（0..length）、Y = 高さ、Z = 厚み（中心0）。
 * 窓・ドアの穴を開ける。マテリアルのグループ：0 = +Z面, 1 = -Z面, 2 = 小口（端・穴の内側）
 */
export function wallGeometry(length: number, height: number, thickness: number, holes: Hole[], extend: number, xs = -extend, xe = length + extend) {
  const shape = new THREE.Shape();
  shape.moveTo(xs, 0);
  const floorHoles = holes.filter((h) => h.bottom <= 0.001).sort((a, b) => a.lo - b.lo);
  for (const h of floorHoles) {
    shape.lineTo(h.lo, 0);
    shape.lineTo(h.lo, h.top);
    shape.lineTo(h.hi, h.top);
    shape.lineTo(h.hi, 0);
  }
  shape.lineTo(xe, 0);
  shape.lineTo(xe, height);
  shape.lineTo(xs, height);
  shape.lineTo(xs, 0);
  for (const h of holes) {
    if (h.bottom <= 0.001) continue;
    const p = new THREE.Path();
    p.moveTo(h.lo, h.bottom);
    p.lineTo(h.hi, h.bottom);
    p.lineTo(h.hi, h.top);
    p.lineTo(h.lo, h.top);
    p.lineTo(h.lo, h.bottom);
    shape.holes.push(p);
  }
  const geo = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false, curveSegments: 1 });
  geo.translate(0, 0, -thickness / 2);
  const out = regroupByFacing(geo);
  geo.dispose();
  return out;
}

/** 三角形を向きで3つに分けて並べ直す（+Z面、-Z面、それ以外） */
function regroupByFacing(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  const src = geo.index ? geo.toNonIndexed() : geo;
  const pos = src.getAttribute('position');
  const uv = src.getAttribute('uv');
  const buckets: number[][] = [[], [], []];
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const n = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i);
    b.fromBufferAttribute(pos, i + 1);
    c.fromBufferAttribute(pos, i + 2);
    n.subVectors(c, b).cross(new THREE.Vector3().subVectors(a, b)).normalize();
    const bucket = n.z > 0.5 ? 0 : n.z < -0.5 ? 1 : 2;
    buckets[bucket].push(i);
  }
  const positions: number[] = [];
  const uvs: number[] = [];
  const out = new THREE.BufferGeometry();
  let start = 0;
  buckets.forEach((tris, group) => {
    for (const i of tris) {
      for (let k = 0; k < 3; k++) {
        positions.push(pos.getX(i + k), pos.getY(i + k), pos.getZ(i + k));
        // 小口は高さ方向と奥行きで貼る
        if (group === 2) {
          const px = pos.getX(i + k);
          const pz = pos.getZ(i + k);
          uvs.push(px + pz, pos.getY(i + k));
        } else {
          uvs.push(uv.getX(i + k), uv.getY(i + k));
        }
      }
    }
    out.addGroup(start, tris.length * 3, group);
    start += tris.length * 3;
  });
  out.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  out.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  out.computeVertexNormals();
  if (src !== geo) src.dispose();
  return out;
}

/** 平らな凸多角形に厚みを付けた板。上面のUVは「最初の辺の向き × 面内の直交方向」で実寸（m） */
export function slabGeometry(slab: Slab): THREE.BufferGeometry {
  const P = slab.points.map((p) => new THREE.Vector3(...p));
  const T = new THREE.Vector3(...slab.thickness);
  const Q = P.map((p) => p.clone().add(T));
  const e1 = P[1].clone().sub(P[0]).normalize();
  const nrm = P[1].clone().sub(P[0]).cross(P[2].clone().sub(P[0])).normalize();
  const e2 = nrm.clone().cross(e1).normalize();
  const positions: number[] = [];
  const uvs: number[] = [];
  const push = (v: THREE.Vector3) => {
    positions.push(v.x, v.y, v.z);
    const d = v.clone().sub(P[0]);
    uvs.push(d.dot(e1), Math.abs(d.dot(e2)));
  };
  const tri = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) => {
    push(a);
    push(b);
    push(c);
  };
  for (let i = 1; i < P.length - 1; i++) {
    tri(P[0], P[i + 1], P[i]);
    tri(Q[0], Q[i], Q[i + 1]);
  }
  for (let i = 0; i < P.length; i++) {
    const j = (i + 1) % P.length;
    tri(P[i], P[j], Q[j]);
    tri(P[i], Q[j], Q[i]);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.computeVertexNormals();
  return geo;
}

/**
 * 床の四角形を、階段の穴を避けて横長の帯に分ける（グリッド座標）。
 * within を渡すと、そのどれかに入っているマスだけを残す
 */
export function floorStrips(rect: Rect, holes: Rect[], within?: Rect[]): Rect[] {
  const strips: Rect[] = [];
  const inRect = (x: number, z: number, h: Rect) => x >= h.x0 && x < h.x1 && z >= h.z0 && z < h.z1;
  const inHole = (x: number, z: number) =>
    holes.some((h) => inRect(x, z, h)) || (within !== undefined && !within.some((h) => inRect(x, z, h)));
  for (let z = rect.z0; z < rect.z1; z++) {
    let x = rect.x0;
    while (x < rect.x1) {
      if (inHole(x, z)) {
        x++;
        continue;
      }
      const start = x;
      while (x < rect.x1 && !inHole(x, z)) x++;
      const last = strips[strips.length - 1];
      // 上の行と同じ幅なら縦につなげて三角形を減らす
      if (last && last.x0 === start && last.x1 === x && last.z1 === z) last.z1 = z + 1;
      else strips.push({ x0: start, z0: z, x1: x, z1: z + 1 });
    }
  }
  return strips;
}

/** 床の表面（上向きの板）。down = true なら下向き（天井） */
export function floorTopGeometry(strips: Rect[], y: number, down = false): THREE.BufferGeometry | null {
  if (!strips.length) return null;
  const parts = strips.map((s) => {
    const w = (s.x1 - s.x0) * GRID;
    const d = (s.z1 - s.z0) * GRID;
    const g = new THREE.PlaneGeometry(w, d);
    g.rotateX(down ? Math.PI / 2 : -Math.PI / 2);
    g.translate(s.x0 * GRID + w / 2, y, s.z0 * GRID + d / 2);
    return g;
  });
  const merged = mergeGeometries(parts)!;
  parts.forEach((p) => p.dispose());
  worldUV(merged);
  return merged;
}

/** 床の構造体（スラブ・基礎）の箱 */
export function floorBodyGeometry(strips: Rect[], yBottom: number, yTop: number): THREE.BufferGeometry | null {
  if (!strips.length) return null;
  const h = yTop - yBottom;
  const parts = strips.map((s) => {
    const w = (s.x1 - s.x0) * GRID;
    const d = (s.z1 - s.z0) * GRID;
    const g = new THREE.BoxGeometry(w, h, d);
    g.translate(s.x0 * GRID + w / 2, yBottom + h / 2, s.z0 * GRID + d / 2);
    return g;
  });
  const merged = mergeGeometries(parts)!;
  parts.forEach((p) => p.dispose());
  worldUV(merged);
  return merged;
}

function worldUV(geo: THREE.BufferGeometry) {
  const pos = geo.getAttribute('position');
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = pos.getX(i);
    uv[i * 2 + 1] = pos.getZ(i);
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

