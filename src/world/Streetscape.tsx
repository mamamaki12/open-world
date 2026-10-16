// 町並み：道路の歩道・縁石・横断歩道・街灯・交差点の信号（色が順に変わる）。
// 道路の位置（TOWN_ROADS）は車の走行にも使うので変えず、その中に歩道を描く。町の座標で描く（Town がずらす）
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BLOCK_ROWS, BLOCK_COLUMNS, TOWN_ROADS } from '../economy/town';

type Rect = { x0: number; x1: number; z0: number; z1: number };
const SIGNAL_CYCLE = 22; // 秒：青9・黄2・全赤0〜 を縦横で交互
const N_VERTICAL = BLOCK_COLUMNS + 1;
const N_MAIN = N_VERTICAL + BLOCK_ROWS + 1; // ここまでが幅の広い道路（あとはブロック内の細い道）

const horizontal = (r: Rect) => r.x1 - r.x0 > r.z1 - r.z0;
const width = (r: Rect) => (horizontal(r) ? r.z1 - r.z0 : r.x1 - r.x0);
/** 歩道の幅 */
const walkWidth = (r: Rect) => (width(r) >= 9 ? 1.7 : 1.1);

/** 区間 [a, b] から、ほかの区間を取り除いた残り */
function subtract(a: number, b: number, cuts: [number, number][]): [number, number][] {
  let out: [number, number][] = [[a, b]];
  for (const [c0, c1] of cuts) {
    out = out.flatMap(([s, e]) => {
      if (c1 <= s || c0 >= e) return [[s, e] as [number, number]];
      const parts: [number, number][] = [];
      if (c0 > s) parts.push([s, c0]);
      if (c1 < e) parts.push([c1, e]);
      return parts;
    });
  }
  return out.filter(([s, e]) => e - s > 0.5);
}

interface Layout {
  walks: Rect[];
  curbs: Rect[];
  stripes: Rect[];
  lamps: { x: number; z: number; rot: number }[];
  signals: { x: number; z: number; sx: number; sz: number }[];
}

export function streetLayout(): Layout {
  const roads = TOWN_ROADS as Rect[];
  const walks: Rect[] = [];
  const curbs: Rect[] = [];
  const stripes: Rect[] = [];
  const lamps: Layout['lamps'] = [];
  const signals: Layout['signals'] = [];
  const crosses = (a: Rect, b: Rect) => a.x0 < b.x1 && b.x0 < a.x1 && a.z0 < b.z1 && b.z0 < a.z1;
  roads.forEach((r, i) => {
    const h = horizontal(r);
    const sw = walkWidth(r);
    const others = roads.filter((o, j) => j !== i && horizontal(o) !== h && crosses(o, r));
    const segs = subtract(h ? r.x0 : r.z0, h ? r.x1 : r.z1, others.map((o) => (h ? [o.x0, o.x1] : [o.z0, o.z1]) as [number, number]));
    // いちばん南の道路の南側には店が並ぶので、街灯は北側だけ
    const southRoad = h && i === N_VERTICAL + BLOCK_ROWS;
    for (const [s, e] of segs) {
      for (const side of [0, 1]) {
        const edge = h ? (side ? r.z1 - sw : r.z0) : side ? r.x1 - sw : r.x0;
        const rect = h ? { x0: s, x1: e, z0: edge, z1: edge + sw } : { x0: edge, x1: edge + sw, z0: s, z1: e };
        walks.push(rect);
        const curb = side ? edge : edge + sw;
        curbs.push(h ? { x0: s, x1: e, z0: curb - 0.08, z1: curb + 0.08 } : { x0: curb - 0.08, x1: curb + 0.08, z0: s, z1: e });
        if (southRoad && side === 1) continue;
        // 街灯：歩道の車道側に、22m ごと（向かい側とは半分ずらす）
        const len = e - s;
        const n = Math.floor(len / 22);
        for (let k = 0; k < n; k++) {
          const t = s + (len - (n - 1) * 22) / 2 + k * 22 + (side ? 11 : 0);
          if (t > e - 2 || t < s + 2) continue;
          const at = side ? edge + 0.35 : edge + sw - 0.35;
          // 腕は車道の方へ伸ばす
          lamps.push(h ? { x: t, z: at, rot: side ? Math.PI : 0 } : { x: at, z: t, rot: side ? -Math.PI / 2 : Math.PI / 2 });
        }
      }
    }
    // 交差点：横断歩道（幅の広い道路どうし）と信号
    if (!h || i >= N_MAIN) return;
    for (const v of others) {
      if (roads.indexOf(v) >= N_VERTICAL) continue;
      const box = { x0: v.x0, x1: v.x1, z0: r.z0, z1: r.z1 };
      const vw = walkWidth(v);
      // 角の歩道
      for (const [cx, cz] of [[box.x0, box.z0], [box.x1 - vw, box.z0], [box.x0, box.z1 - sw], [box.x1 - vw, box.z1 - sw]]) {
        walks.push({ x0: cx, x1: cx + vw, z0: cz, z1: cz + sw });
      }
      // 横断歩道の白線（交差点の4方向）
      const zebra = (x0: number, x1: number, z0: number, z1: number, alongX: boolean) => {
        const len = alongX ? x1 - x0 : z1 - z0;
        for (let t = 0.3; t < len - 0.3; t += 0.9) {
          stripes.push(alongX ? { x0: x0 + t, x1: x0 + t + 0.45, z0, z1 } : { x0, x1, z0: z0 + t, z1: z0 + t + 0.45 });
        }
      };
      zebra(box.x0 + vw, box.x1 - vw, box.z0 - 3.2, box.z0 - 0.8, true);
      zebra(box.x0 + vw, box.x1 - vw, box.z1 + 0.8, box.z1 + 3.2, true);
      zebra(box.x0 - 3.2, box.x0 - 0.8, box.z0 + sw, box.z1 - sw, false);
      zebra(box.x1 + 0.8, box.x1 + 3.2, box.z0 + sw, box.z1 - sw, false);
      // 信号は角の歩道に立てる（sx, sz は交差点の外向き）
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        signals.push({ x: sx < 0 ? box.x0 + vw / 2 : box.x1 - vw / 2, z: sz < 0 ? box.z0 + sw / 2 : box.z1 - sw / 2, sx, sz });
      }
    }
  });
  return { walks, curbs, stripes, lamps, signals };
}

const tmp = new THREE.Object3D();
/** 同じ形をたくさん並べる（1回の描画で済ませる） */
function Instances({ items, geometry, material, castShadow }: { items: { p: [number, number, number]; s?: [number, number, number]; r?: number }[]; geometry: THREE.BufferGeometry; material: THREE.Material; castShadow?: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    items.forEach((it, i) => {
      tmp.position.set(...it.p);
      tmp.rotation.set(0, it.r ?? 0, 0);
      tmp.scale.set(...(it.s ?? [1, 1, 1]));
      tmp.updateMatrix();
      m.setMatrixAt(i, tmp.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, [items]);
  return <instancedMesh ref={ref} args={[geometry, material, items.length]} castShadow={castShadow} receiveShadow raycast={() => undefined} />;
}

const box = new THREE.BoxGeometry(1, 1, 1);
const plane = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
const MAT = {
  walk: new THREE.MeshStandardMaterial({ color: '#cfccc3', roughness: 0.92 }),
  curb: new THREE.MeshStandardMaterial({ color: '#e4e2db', roughness: 0.8 }),
  stripe: new THREE.MeshStandardMaterial({ color: '#f2f1ea', roughness: 0.7 }),
  pole: new THREE.MeshStandardMaterial({ color: '#7d838a', metalness: 0.6, roughness: 0.4 }),
  lamp: new THREE.MeshStandardMaterial({ color: '#fff6dd', emissive: '#ffe9b0', emissiveIntensity: 0.9 }),
  housing: new THREE.MeshStandardMaterial({ color: '#2d3236', roughness: 0.6 }),
};
// 信号の灯火：縦向きの道（z 方向に走る車）用と、横向きの道用。点いている色だけ光らせる
const LIGHT_COLORS = ['#2fd36a', '#ffc02e', '#ff3b30'] as const;
const signalMats = (['x', 'z'] as const).map(() =>
  LIGHT_COLORS.map((c) => new THREE.MeshStandardMaterial({ color: '#333', emissive: c, emissiveIntensity: 0 })),
);

/** 時刻 t の灯火（0 青, 1 黄, 2 赤）。axis 0 = x 方向に走る車 */
export function signalState(t: number, axis: 0 | 1): 0 | 1 | 2 {
  const half = SIGNAL_CYCLE / 2;
  const u = (t + (axis ? half : 0)) % SIGNAL_CYCLE;
  return u < half - 2.5 ? 0 : u < half - 0.5 ? 1 : 2;
}

export function Streetscape() {
  const L = useMemo(streetLayout, []);
  const flat = (rs: Rect[], y: number, h?: number) =>
    rs.map((r) => ({ p: [(r.x0 + r.x1) / 2, y, (r.z0 + r.z1) / 2] as [number, number, number], s: [r.x1 - r.x0, h ?? 1, r.z1 - r.z0] as [number, number, number] }));
  const walks = useMemo(() => flat(L.walks, 0.03, 0.06), [L]);
  const curbs = useMemo(() => flat(L.curbs, 0.06, 0.12), [L]);
  const stripes = useMemo(() => flat(L.stripes, 0.002), [L]);
  const lampPoles = useMemo(() => L.lamps.map((l) => ({ p: [l.x, 2.6, l.z] as [number, number, number], s: [0.14, 5.2, 0.14] as [number, number, number] })), [L]);
  const arm = (l: Layout['lamps'][0], d: number) => [l.x + Math.sin(l.rot) * d, 5.1, l.z + Math.cos(l.rot) * d] as [number, number, number];
  const lampArms = useMemo(() => L.lamps.map((l) => ({ p: arm(l, 0.6), s: [0.09, 0.09, 1.3] as [number, number, number], r: l.rot })), [L]);
  const lampHeads = useMemo(() => L.lamps.map((l) => ({ p: [arm(l, 1.15)[0], 5.0, arm(l, 1.15)[2]] as [number, number, number], s: [0.32, 0.12, 0.6] as [number, number, number], r: l.rot })), [L]);
  const sigPoles = useMemo(() => L.signals.map((s) => ({ p: [s.x, 1.9, s.z] as [number, number, number], s: [0.15, 3.8, 0.15] as [number, number, number] })), [L]);
  // 灯器：x 方向の車に向けたもの（面が ±x）と z 方向の車に向けたもの（面が ±z）
  const heads = useMemo(() => {
    const out: { axis: 0 | 1; p: [number, number, number]; face: [number, number] }[] = [];
    for (const s of L.signals) {
      out.push({ axis: 0, p: [s.x, 3.4, s.z + s.sz * 0.25], face: [s.sx, 0] });
      out.push({ axis: 1, p: [s.x + s.sx * 0.25, 3.4, s.z], face: [0, s.sz] });
    }
    return out;
  }, [L]);
  const housings = useMemo(() => heads.map((h) => ({ p: h.p, s: (h.face[0] ? [0.22, 1.0, 0.36] : [0.36, 1.0, 0.22]) as [number, number, number] })), [heads]);
  const bulbs = useMemo(
    () =>
      ([0, 1] as const).map((axis) =>
        [0, 1, 2].map((k) =>
          heads
            .filter((h) => h.axis === axis)
            .map((h) => ({
              p: [h.p[0] + h.face[0] * 0.12, 3.4 + 0.3 - k * 0.3, h.p[2] + h.face[1] * 0.12] as [number, number, number],
              s: [0.2, 0.2, 0.2] as [number, number, number],
            })),
        ),
      ),
    [heads],
  );

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    for (const axis of [0, 1] as const) {
      const on = signalState(t, axis);
      signalMats[axis].forEach((m, k) => (m.emissiveIntensity = k === on ? 2.2 : 0.05));
    }
  });

  return (
    <group name="streetscape">
      <Instances items={walks} geometry={box} material={MAT.walk} />
      <Instances items={curbs} geometry={box} material={MAT.curb} />
      <Instances items={stripes} geometry={plane} material={MAT.stripe} />
      <Instances items={lampPoles} geometry={box} material={MAT.pole} castShadow />
      <Instances items={lampArms} geometry={box} material={MAT.pole} />
      <Instances items={lampHeads} geometry={box} material={MAT.lamp} />
      <Instances items={sigPoles} geometry={box} material={MAT.pole} castShadow />
      <Instances items={housings} geometry={box} material={MAT.housing} />
      {bulbs.map((byColor, axis) => byColor.map((items, k) => <Instances key={`${axis}-${k}`} items={items} geometry={box} material={signalMats[axis][k]} />))}
    </group>
  );
}
