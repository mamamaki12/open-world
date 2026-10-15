// レース映像の3D：競馬場・競輪場（傾いたバンク）・ボートレース場を作り、テレビ中継のようなカメラで先頭集団を追う
import { useLayoutEffect, useMemo, useRef } from 'react';
import type { MutableRefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer, Sky } from '@react-three/drei';
import * as THREE from 'three';
import { NUMBER_COLORS } from '../../../economy/race';
import type { Race } from '../../../economy/race';
import { courseP, pointAt } from '../../../economy/raceMotion';
import type { Course } from '../../../economy/raceMotion';
import { Boat, Cyclist, Horse, elevation } from './RaceRunners';
import type { RaceSim } from './RaceRunners';
import {
  bankTexture,
  boardTexture,
  crowdTexture,
  dirtTexture,
  grassTexture,
  turfTexture,
  visionTexture,
  waterTexture,
} from './raceTextures';

export type { RaceSim };

type Elev = (p: number, lat: number) => number;
const flat: Elev = () => 0;

/** コースに沿った帯（内側 lat0 から外側 lat1）。u はコースに沿って uvLen m ごとに 1 */
function ribbon(c: Course, lat0: number, lat1: number, step: number, elev: Elev = flat, uvLen = 20, dy = 0.01) {
  const n = Math.ceil(c.circumference / step);
  const pos: number[] = [];
  const uv: number[] = [];
  for (let k = 0; k <= n; k++) {
    const p = (k * c.circumference) / n;
    for (const [j, lat] of [[0, lat0], [1, lat1]] as const) {
      const q = pointAt(c, p, lat);
      pos.push(q.x, elev(p, lat) + dy, q.y);
      uv.push(p / uvLen, j);
    }
  }
  return strip(pos, uv, n, true);
}

/** コースに沿った縦の壁（柵・フェンス） */
function wall(c: Course, lat: number, h0: number, h1: number, step: number, elev: Elev = flat, uvLen = 8) {
  const n = Math.ceil(c.circumference / step);
  const pos: number[] = [];
  const uv: number[] = [];
  for (let k = 0; k <= n; k++) {
    const p = (k * c.circumference) / n;
    const q = pointAt(c, p, lat);
    const e = elev(p, lat);
    pos.push(q.x, e + h0, q.y, q.x, e + h1, q.y);
    uv.push(p / uvLen, 0, p / uvLen, 1);
  }
  return strip(pos, uv, n, false);
}

/** コースを横切る線（ゴールの線） */
function crossLine(c: Course, p: number, lat0: number, lat1: number, w: number, elev: Elev = flat) {
  const n = 12;
  const pos: number[] = [];
  const uv: number[] = [];
  for (let k = 0; k <= n; k++) {
    const lat = lat0 + ((lat1 - lat0) * k) / n;
    for (const [j, dp] of [[0, -w / 2], [1, w / 2]] as const) {
      const q = pointAt(c, p + dp, lat);
      pos.push(q.x, elev(p + dp, lat) + 0.03, q.y);
      uv.push(k / n, j);
    }
  }
  return strip(pos, uv, n, true);
}

function strip(pos: number[], uv: number[], n: number, faceUp: boolean) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  const idx: number[] = [];
  for (let k = 0; k < n; k++) {
    const a = 2 * k;
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  g.setIndex(idx);
  g.computeVertexNormals();
  // 上を向いていなければ面の向きを裏返す
  if (faceUp && g.getAttribute('normal').getY(0) < 0) {
    for (let k = 0; k < idx.length; k += 3) [idx[k + 1], idx[k + 2]] = [idx[k + 2], idx[k + 1]];
    g.setIndex(idx);
    g.computeVertexNormals();
  }
  return g;
}

/** コース上の位置に、進む向きにそろえて物を置く */
function At({ c, p, lat, y = 0, children }: { c: Course; p: number; lat: number; y?: number; children: React.ReactNode }) {
  const pt = pointAt(c, p, lat);
  return (
    <group position={[pt.x, y, pt.y]} rotation-y={-pt.angle}>
      {children}
    </group>
  );
}

/** 木（まわりの景色） */
function Trees({ points }: { points: [number, number, number][] }) {
  const foliage = useRef<THREE.InstancedMesh>(null);
  const trunk = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const f = foliage.current;
    const t = trunk.current;
    if (!f || !t) return;
    const m = new THREE.Matrix4();
    const col = new THREE.Color();
    const q = new THREE.Quaternion();
    points.forEach(([x, z, s], k) => {
      m.compose(new THREE.Vector3(x, 3.6 * s, z), q, new THREE.Vector3(2.6 * s, 4.6 * s, 2.6 * s));
      f.setMatrixAt(k, m);
      f.setColorAt(k, col.setHSL(0.27 + (k % 7) * 0.012, 0.45, 0.24 + (k % 5) * 0.025));
      m.compose(new THREE.Vector3(x, 1 * s, z), q, new THREE.Vector3(0.3 * s, 2 * s, 0.3 * s));
      t.setMatrixAt(k, m);
    });
    f.instanceMatrix.needsUpdate = true;
    if (f.instanceColor) f.instanceColor.needsUpdate = true;
    t.instanceMatrix.needsUpdate = true;
  }, [points]);
  return (
    <group>
      <instancedMesh ref={foliage} args={[undefined, undefined, points.length]}>
        <sphereGeometry args={[1, 10, 8]} />
        <meshStandardMaterial roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={trunk} args={[undefined, undefined, points.length]}>
        <cylinderGeometry args={[1, 1, 1, 6]} />
        <meshStandardMaterial color="#5a4030" roughness={0.9} />
      </instancedMesh>
    </group>
  );
}

/** 木を並べる場所（コースの外まわりに散らす） */
function treeRing(c: Course, latFrom: number, count: number, seed: number, avoid?: (x: number, z: number) => boolean) {
  const out: [number, number, number][] = [];
  let s = seed;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let k = 0; k < count * 3 && out.length < count; k++) {
    const p = r() * c.circumference;
    const pt = pointAt(c, p, latFrom + r() * 60);
    if (avoid?.(pt.x, pt.y)) continue;
    out.push([pt.x, pt.y, 0.8 + r() * 0.8]);
  }
  return out;
}

/** スタンド（ホームストレッチの外）：傾いた客席、屋根、柱 */
function Grandstand({ x, z, length, depth, height }: { x: number; z: number; length: number; depth: number; height: number }) {
  const crowd = useMemo(() => {
    const t = crowdTexture().clone();
    t.repeat.set(length / 40, 2);
    t.needsUpdate = true;
    return t;
  }, [length]);
  const slope = Math.atan2(height * 0.75, depth);
  const run = Math.hypot(height * 0.75, depth);
  const pillars = Math.max(2, Math.round(length / 30));
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, height * 0.18 + height * 0.375, depth / 2 + 1]} rotation-x={-Math.PI / 2 + slope}>
        <planeGeometry args={[length, run]} />
        <meshStandardMaterial map={crowd} roughness={0.9} />
      </mesh>
      {/* 客席の前の壁と、下の階 */}
      <mesh position={[0, height * 0.09, 0.5]}>
        <boxGeometry args={[length, height * 0.18, 1]} />
        <meshStandardMaterial color="#d9d6cf" roughness={0.8} />
      </mesh>
      <mesh position={[0, height / 2, depth + 2]}>
        <boxGeometry args={[length, height, 2]} />
        <meshStandardMaterial color="#c9c5bc" roughness={0.8} />
      </mesh>
      {/* 屋根と柱 */}
      <mesh position={[0, height + 1.5, depth / 2 + 1]} rotation-x={-0.08}>
        <boxGeometry args={[length + 4, 0.6, depth + 6]} />
        <meshStandardMaterial color="#eeeeea" roughness={0.5} metalness={0.2} />
      </mesh>
      {Array.from({ length: pillars + 1 }, (_, k) => (
        <mesh key={k} position={[-length / 2 + (k * length) / pillars, height / 2 + 0.6, depth + 0.6]}>
          <boxGeometry args={[0.8, height + 1.4, 0.8]} />
          <meshStandardMaterial color="#b9b5ac" />
        </mesh>
      ))}
    </group>
  );
}

// ---- 競馬場 ----

function HorseTrack({ c, race }: { c: Course; race: Race }) {
  const dirtRace = race.surface === 'ダート';
  const main = useMemo(() => (dirtRace ? dirtTexture() : turfTexture()), [dirtRace]);
  const other = useMemo(() => (dirtRace ? turfTexture() : dirtTexture()), [dirtRace]);
  const grass = useMemo(() => {
    const t = grassTexture().clone();
    t.repeat.set(140, 90);
    t.needsUpdate = true;
    return t;
  }, []);
  const boards = useMemo(boardTexture, []);
  const vision = useMemo(() => visionTexture(`${race.venue}競馬場`), [race.venue]);
  const geo = useMemo(
    () => ({
      track: ribbon(c, -0.8, c.width + 0.8, 3, flat, 16),
      inner: dirtRace ? ribbon(c, c.width + 4, c.width + 22, 4, flat, 16) : ribbon(c, -16, -4, 4, flat, 16),
      innerRail: wall(c, -0.8, 0.85, 1.05, 3),
      innerSkirt: wall(c, -0.8, 0.0, 0.85, 3),
      outerRail: wall(c, c.width + 0.8, 0.85, 1.05, 3),
      boards: wall(c, c.width + (dirtRace ? 24 : 3), 0, 1.4, 4, flat, 12),
      finish: crossLine(c, c.finishP, -0.8, c.width + 0.8, 0.3),
    }),
    [c, dirtRace],
  );
  const posts = useMemo(() => {
    const out: { p: number; lat: number }[] = [];
    for (let p = 0; p < c.circumference; p += 4) out.push({ p, lat: -0.8 }, { p: p + 2, lat: c.width + 0.8 });
    return out;
  }, [c]);
  const postsRef = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const el = postsRef.current;
    if (!el) return;
    const m = new THREE.Matrix4();
    posts.forEach((q, k) => {
      const pt = pointAt(c, q.p, q.lat);
      m.makeTranslation(pt.x, 0.5, pt.y);
      el.setMatrixAt(k, m);
    });
    el.instanceMatrix.needsUpdate = true;
  }, [c, posts]);
  const fin = pointAt(c, c.finishP, c.width + 30);
  const trees = useMemo(
    () => treeRing(c, c.width + 40, 160, 7, (x, z) => z > c.radius + c.width + 10 && Math.abs(x - fin.x) < 260),
    [c, fin.x],
  );
  const innerTrees = useMemo(() => treeRing(c, -c.radius + 15, 40, 11), [c]);
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[2400, 1600]} />
        <meshStandardMaterial map={grass} roughness={1} />
      </mesh>
      <mesh geometry={geo.track} receiveShadow>
        <meshStandardMaterial map={main} roughness={0.95} />
      </mesh>
      <mesh geometry={geo.inner}>
        <meshStandardMaterial map={other} roughness={0.95} />
      </mesh>
      {/* 白いラチ（柵） */}
      {[geo.innerRail, geo.outerRail].map((g, k) => (
        <mesh key={k} geometry={g}>
          <meshStandardMaterial color="#ffffff" roughness={0.4} side={THREE.DoubleSide} />
        </mesh>
      ))}
      <mesh geometry={geo.innerSkirt}>
        <meshStandardMaterial color="#e9f1e6" roughness={0.6} side={THREE.DoubleSide} transparent opacity={0.35} />
      </mesh>
      <instancedMesh ref={postsRef} args={[undefined, undefined, posts.length]}>
        <boxGeometry args={[0.12, 1, 0.12]} />
        <meshStandardMaterial color="#f4f4f4" />
      </instancedMesh>
      <mesh geometry={geo.boards}>
        <meshStandardMaterial map={boards} roughness={0.6} side={THREE.DoubleSide} />
      </mesh>
      {/* ハロン棒（ゴールから200mごと、赤白） */}
      {Array.from({ length: Math.floor(c.circumference / 200) }, (_, k) => (
        <At key={k} c={c} p={c.finishP - (k + 1) * 200} lat={-1.6}>
          <mesh position={[0, 1.5, 0]}>
            <cylinderGeometry args={[0.09, 0.09, 3, 8]} />
            <meshStandardMaterial color={k % 2 ? '#ffffff' : '#e53935'} />
          </mesh>
          <mesh position={[0, 3.05, 0]}>
            <boxGeometry args={[0.08, 0.35, 0.8]} />
            <meshStandardMaterial color={k % 2 ? '#e53935' : '#ffffff'} />
          </mesh>
        </At>
      ))}
      {/* ゴール板と、ゴールの線 */}
      <At c={c} p={c.finishP} lat={c.width + 1.8}>
        <mesh position={[0, 2.5, 0]}>
          <cylinderGeometry args={[0.12, 0.12, 5, 10]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        <mesh position={[0, 5.1, 0]} rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.9, 0.9, 0.08, 32]} />
          <meshStandardMaterial color="#e53935" roughness={0.4} />
        </mesh>
      </At>
      <mesh geometry={geo.finish}>
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      {/* スタートのゲート */}
      {race.runners.map((_, k) => (
        <At key={k} c={c} p={c.startP - 1} lat={0.8 + k * 1.25}>
          {[-0.62, 0.62].map((z) => (
            <mesh key={z} position={[0, 1.4, z]}>
              <boxGeometry args={[1.6, 2.8, 0.08]} />
              <meshStandardMaterial color="#2f6b3f" roughness={0.6} />
            </mesh>
          ))}
          <mesh position={[0, 2.95, 0]}>
            <boxGeometry args={[1.7, 0.3, 1.3]} />
            <meshStandardMaterial color="#e8e8e8" />
          </mesh>
        </At>
      ))}
      <Grandstand x={fin.x} z={c.radius + c.width + 14} length={Math.min(c.straight * 0.9, 340)} depth={34} height={22} />
      {/* 内馬場の池と、大型ビジョン */}
      <mesh rotation-x={-Math.PI / 2} position={[c.straight * 0.12, 0.02, -c.radius * 0.25]}>
        <circleGeometry args={[c.radius * 0.45, 48]} />
        <meshStandardMaterial color="#3b7fa8" roughness={0.15} metalness={0.2} />
      </mesh>
      <group position={[fin.x, 0, c.radius - 30]}>
        <mesh position={[0, 9, 0]}>
          <boxGeometry args={[34, 12, 1]} />
          <meshStandardMaterial color="#222" />
        </mesh>
        <mesh position={[0, 9, 0.52]}>
          <planeGeometry args={[32, 10.5]} />
          <meshBasicMaterial map={vision} toneMapped={false} />
        </mesh>
        {[-10, 10].map((x) => (
          <mesh key={x} position={[x, 1.6, 0]}>
            <boxGeometry args={[1, 3.2, 1]} />
            <meshStandardMaterial color="#555" />
          </mesh>
        ))}
      </group>
      <Trees points={[...trees, ...innerTrees]} />
    </group>
  );
}

// ---- 競輪場（バンク） ----

function KeirinTrack({ c, race }: { c: Course; race: Race }) {
  const bank = useMemo(bankTexture, []);
  const grass = useMemo(() => {
    const t = grassTexture().clone();
    t.repeat.set(30, 20);
    t.needsUpdate = true;
    return t;
  }, []);
  const boards = useMemo(boardTexture, []);
  const elev: Elev = (p, lat) => elevation(c, p, lat);
  const geo = useMemo(
    () => ({
      apron: ribbon(c, -3, -1.2, 1.5, elev, 10),
      track: ribbon(c, -1.2, c.width + 0.6, 1.5, elev, 10),
      lines: [
        { g: ribbon(c, -0.05, 0.05, 1.5, elev, 10, 0.02), col: '#ffffff' },
        { g: ribbon(c, 0.85, 0.95, 1.5, elev, 10, 0.02), col: '#e53935' },
        { g: ribbon(c, 2.35, 2.45, 1.5, elev, 10, 0.02), col: '#1e63d6' },
      ],
      fence: wall(c, c.width + 0.6, 0, 1.3, 1.5, elev, 10),
      fenceTop: wall(c, c.width + 0.6, 1.3, 2.4, 1.5, elev, 10),
      finish: crossLine(c, c.finishP, -1.2, c.width + 0.6, 0.3, elev),
    }),
    [c],
  );
  const fin = pointAt(c, c.finishP, c.width + 10);
  const trees = useMemo(() => treeRing(c, c.width + 30, 70, 5, (x, z) => z > c.radius + 10 && Math.abs(x - fin.x) < 70), [c, fin.x]);
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[600, 400]} />
        <meshStandardMaterial map={grass} roughness={1} />
      </mesh>
      {/* 内側の青い帯（安全地帯）とバンク */}
      <mesh geometry={geo.apron}>
        <meshStandardMaterial color="#2f6fd0" roughness={0.7} />
      </mesh>
      <mesh geometry={geo.track} receiveShadow>
        <meshStandardMaterial map={bank} roughness={0.85} />
      </mesh>
      {geo.lines.map((l, k) => (
        <mesh key={k} geometry={l.g}>
          <meshBasicMaterial color={l.col} />
        </mesh>
      ))}
      {/* バンクの上の金網と広告 */}
      <mesh geometry={geo.fence}>
        <meshStandardMaterial map={boards} roughness={0.6} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={geo.fenceTop}>
        <meshStandardMaterial color="#c8d0d6" metalness={0.6} roughness={0.4} side={THREE.DoubleSide} transparent opacity={0.35} />
      </mesh>
      {/* ゴールの線と、決勝線の判定台 */}
      <mesh geometry={geo.finish}>
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <At c={c} p={c.finishP} lat={c.width + 3}>
        <mesh position={[0, 4, 0]}>
          <boxGeometry args={[2.5, 3, 2.5]} />
          <meshStandardMaterial color="#e9e6df" />
        </mesh>
        <mesh position={[0, 1.2, 0]}>
          <boxGeometry args={[0.5, 2.4, 0.5]} />
          <meshStandardMaterial color="#999" />
        </mesh>
      </At>
      <Grandstand x={fin.x} z={c.radius + c.width + 8} length={90} depth={18} height={12} />
      <mesh position={[fin.x - 60, 9, -c.radius - 20]}>
        <boxGeometry args={[20, 8, 1]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      <mesh position={[fin.x - 60, 9, -c.radius - 19.45]}>
        <planeGeometry args={[19, 7]} />
        <meshBasicMaterial map={visionTexture(`${race.venue}競輪`)} toneMapped={false} />
      </mesh>
      <Trees points={trees} />
    </group>
  );
}

// ---- ボートレース場 ----

/** 引き波（艇のうしろにできる白い泡）。進んだ道のりに沿ってすき間なく置き、だんだん広がって消える */
function Wakes({ c, sim, n }: { c: Course; sim: MutableRefObject<RaceSim>; n: number }) {
  const MAX = 2400;
  const LIFE = 3.2;
  const ref = useRef<THREE.InstancedMesh>(null);
  const parts = useRef<{ x: number; z: number; t: number; yaw: number; side: number }[]>([]);
  const last = useRef<number[] | null>(null);
  const lastT = useRef(-1e9);
  const m = useMemo(() => new THREE.Matrix4(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const v = useMemo(() => new THREE.Vector3(), []);
  const sc = useMemo(() => new THREE.Vector3(), []);
  const col = useMemo(() => new THREE.Color(), []);
  const disc = useMemo(() => new THREE.CircleGeometry(0.6, 10).rotateX(-Math.PI / 2), []);
  useFrame(() => {
    const s = sim.current;
    const mesh = ref.current;
    if (!mesh) return;
    if (s.t < lastT.current || !last.current) {
      parts.current = [];
      last.current = s.dist.slice(0, n);
    }
    const dtSim = s.t - lastT.current;
    lastT.current = s.t;
    for (let i = 0; i < n; i++) {
      const d0 = last.current[i];
      const d1 = s.dist[i];
      const steps = Math.min(40, Math.floor((d1 - d0) / 0.9));
      for (let k = 1; k <= steps; k++) {
        const d = d0 + ((d1 - d0) * k) / steps;
        const pt = pointAt(c, courseP(c, d), s.lat[i]);
        const t = s.t - dtSim * (1 - k / steps);
        for (const side of [-1, 1]) parts.current.push({ x: pt.x - Math.cos(pt.angle) * 1.5, z: pt.y - Math.sin(pt.angle) * 1.5, t, yaw: -pt.angle, side });
      }
      if (steps > 0) last.current[i] = d1;
    }
    if (parts.current.length > MAX) parts.current.splice(0, parts.current.length - MAX);
    let k = 0;
    for (const p of parts.current) {
      const age = s.t - p.t;
      if (age < 0 || age > LIFE) continue;
      const a = age / LIFE;
      // 2本の白い筋が、後ろへ行くほど左右に開く
      const spread = 0.5 + a * 4.5;
      q.setFromAxisAngle(up, p.yaw);
      v.set(Math.sin(p.yaw) * spread * p.side, 0.03, Math.cos(p.yaw) * spread * p.side);
      v.x += p.x;
      v.z += p.z;
      m.compose(v, q, sc.set(1.1, 1, 0.5 + a * 1.6));
      mesh.setMatrixAt(k, m);
      const b = (1 - a) ** 1.5 * 0.85;
      mesh.setColorAt(k, col.setRGB(b, b, b));
      if (++k >= MAX) break;
    }
    mesh.count = k;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[disc, undefined, MAX]} frustumCulled={false} renderOrder={2}>
      {/* 足し算で重ねる：黒くなるほど見えなくなる */}
      <meshBasicMaterial color="#ffffff" blending={THREE.AdditiveBlending} depthWrite={false} transparent toneMapped={false} />
    </instancedMesh>
  );
}

function BoatCourse({ c, race, sim }: { c: Course; race: Race; sim: MutableRefObject<RaceSim> }) {
  const water = useMemo(() => {
    const t = waterTexture().clone();
    t.repeat.set(30, 30);
    t.needsUpdate = true;
    return t;
  }, []);
  useFrame((_, dt) => {
    water.offset.x += dt * 0.004;
    water.offset.y += dt * 0.002;
  });
  const shoreZ = c.radius + c.width + 18;
  const fin = pointAt(c, c.finishP, c.width);
  const trees = useMemo(() => {
    const out: [number, number, number][] = [];
    for (let k = 0; k < 60; k++) out.push([-420 + k * 14 + (k % 3) * 4, -c.radius - 120 - (k % 4) * 9, 1 + (k % 5) * 0.2]);
    return out;
  }, [c.radius]);
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[1400, 900]} />
        <meshStandardMaterial map={water} color="#d4e8f6" roughness={0.3} metalness={0.05} />
      </mesh>
      {/* 向こう岸の土手と、こちらの岸（スタンド） */}
      <mesh position={[0, 1, -c.radius - 110]}>
        <boxGeometry args={[1400, 2, 20]} />
        <meshStandardMaterial color="#6b8a4e" />
      </mesh>
      <mesh position={[0, 0.8, shoreZ + 40]}>
        <boxGeometry args={[1400, 1.6, 80]} />
        <meshStandardMaterial color="#b7b2a6" />
      </mesh>
      <Grandstand x={fin.x} z={shoreZ + 4} length={220} depth={26} height={16} />
      {/* ターンマーク（1マーク・2マーク） */}
      {[c.straight / 2, -c.straight / 2].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, 1.1, 0]}>
            <cylinderGeometry args={[0.9, 1.4, 2.4, 24]} />
            <meshStandardMaterial color="#ff8f00" roughness={0.4} />
          </mesh>
          <mesh position={[0, 1.4, 0]}>
            <cylinderGeometry args={[1.18, 1.22, 0.4, 24]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
          <mesh position={[0, 2.6, 0]}>
            <coneGeometry args={[0.9, 1.2, 24]} />
            <meshStandardMaterial color="#e53935" />
          </mesh>
        </group>
      ))}
      {/* コースの外のブイ */}
      {Array.from({ length: 24 }, (_, k) => {
        const x = -c.straight / 2 + (k / 23) * c.straight;
        return [c.radius + c.width + 4, -c.radius - c.width - 4].map((z) => (
          <mesh key={`${k}:${z}`} position={[x, 0.3, z]}>
            <sphereGeometry args={[0.55, 12, 10]} />
            <meshStandardMaterial color={k % 2 ? '#ffffff' : '#ff7043'} roughness={0.4} />
          </mesh>
        ));
      })}
      {/* 大時計（スタートの目安）と、ゴールの線の目印 */}
      <group position={[-c.straight / 2 + 40, 0, shoreZ - 6]}>
        <mesh position={[0, 7, 0]}>
          <cylinderGeometry args={[4, 4, 0.6, 40]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        <mesh position={[0, 3, 0]}>
          <boxGeometry args={[0.6, 6, 0.6]} />
          <meshStandardMaterial color="#777" />
        </mesh>
      </group>
      <group position={[fin.x, 0, 0]}>
        {[c.radius + c.width + 2, -c.radius + 6].map((z) => (
          <mesh key={z} position={[0, 2, z]}>
            <cylinderGeometry args={[0.2, 0.2, 4, 8]} />
            <meshStandardMaterial color="#e53935" />
          </mesh>
        ))}
      </group>
      <mesh position={[0, 8, -c.radius - 100]}>
        <boxGeometry args={[40, 12, 1]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      <mesh position={[0, 8, -c.radius - 99.45]}>
        <planeGeometry args={[38, 10.5]} />
        <meshBasicMaterial map={visionTexture(`ボートレース${race.venue}`)} toneMapped={false} />
      </mesh>
      <Trees points={trees} />
      <Wakes c={c} sim={sim} n={race.runners.length} />
    </group>
  );
}

// ---- 中継カメラ ----

const CAM: Record<Race['kind'], { side: number; up: number; back: number; ahead: number; fov: number }> = {
  horse: { side: 24, up: 8.5, back: 11, ahead: 6, fov: 34 },
  // 競輪はバンクの内側（中央の芝生）から、外の金網を背に映す
  keirin: { side: -15, up: 4.5, back: 7, ahead: 3, fov: 40 },
  boat: { side: 38, up: 15, back: 22, ahead: 10, fov: 38 },
};

function BroadcastCamera({ c, race, sim }: { c: Course; race: Race; sim: MutableRefObject<RaceSim> }) {
  const { camera } = useThree();
  const look = useRef(new THREE.Vector3());
  const first = useRef(true);
  useFrame((_, dtReal) => {
    const s = sim.current;
    const cfg = CAM[race.kind];
    const cam = camera as THREE.PerspectiveCamera;
    let pos: THREE.Vector3;
    let tgt: THREE.Vector3;
    if (s.overview) {
      const span = c.straight + 2 * (c.radius + c.width);
      pos = new THREE.Vector3(0, span * 0.62, span * 0.42);
      tgt = new THREE.Vector3(0, 0, 0);
    } else {
      const front = s.standings.slice(0, Math.min(4, s.standings.length));
      let x = 0;
      let z = 0;
      let y = 0;
      let d = 0;
      let lat = 0;
      for (const i of front) {
        const pt = pointAt(c, courseP(c, s.dist[i]), s.lat[i]);
        x += pt.x;
        z += pt.y;
        y += elevation(c, courseP(c, s.dist[i]), s.lat[i]);
        d += s.dist[i];
        lat += s.lat[i];
      }
      const nf = Math.max(1, front.length);
      x /= nf;
      z /= nf;
      y /= nf;
      d /= nf;
      lat /= nf;
      const p = courseP(c, d);
      const a = pointAt(c, p, lat);
      const out = pointAt(c, p, lat + 1);
      const nx = out.x - a.x;
      const nz = out.y - a.y;
      const fx = Math.cos(a.angle);
      const fz = Math.sin(a.angle);
      // 外側（スタンド側）の少し後ろ、高いところから見る
      pos = new THREE.Vector3(x + nx * cfg.side - fx * cfg.back, y + cfg.up, z + nz * cfg.side - fz * cfg.back);
      tgt = new THREE.Vector3(x + fx * cfg.ahead, y + 1, z + fz * cfg.ahead);
    }
    if (cam.fov !== cfg.fov) {
      cam.fov = cfg.fov;
      cam.updateProjectionMatrix();
    }
    const k = first.current ? 1 : 1 - Math.exp(-dtReal * (s.overview ? 3 : 4));
    first.current = false;
    cam.position.lerp(pos, k);
    look.current.lerp(tgt, k);
    cam.lookAt(look.current);
  });
  return null;
}

// ---- 全体 ----

/** 騎手の勝負服（馬主ごとの色）。名前から決めるので、毎回同じ服になる */
const SILKS = ['#c62828', '#1565c0', '#f9a825', '#2e7d32', '#6a1b9a', '#ef6c00', '#ad1457', '#00838f', '#212121', '#fafafa', '#4e342e', '#283593'];
function silkOf(name: string) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return { silk: SILKS[h % SILKS.length], sleeve: SILKS[(h >>> 4) % SILKS.length] };
}

export function Race3D({ race, course, sim, height }: { race: Race; course: Course; sim: MutableRefObject<RaceSim>; height: number }) {
  const color = (i: number) => {
    const r = race.runners[i];
    return NUMBER_COLORS[(race.kind === 'horse' ? r.frame : r.no) - 1] ?? NUMBER_COLORS[0];
  };
  const tagOf = (i: number) => NUMBER_COLORS[race.runners[i].no - 1] ?? NUMBER_COLORS[0];
  const fogFar = race.kind === 'keirin' ? 500 : 1500;
  return (
    <div className="race-3d" style={{ height }}>
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 60, 120], fov: 34, near: 0.5, far: 3000 }}
        gl={{ antialias: true }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.0;
        }}
      >
        <fog attach="fog" args={['#cfe0ee', fogFar * 0.25, fogFar]} />
        <Sky distance={4500} sunPosition={[120, 70, -160]} turbidity={6} rayleigh={1.2} mieCoefficient={0.004} mieDirectionalG={0.8} />
        <Environment resolution={64}>
          <Lightformer intensity={1.6} position={[0, 10, 0]} rotation-x={Math.PI / 2} scale={[40, 40, 1]} color="#dbeeff" />
          <Lightformer intensity={0.6} position={[0, 2, 20]} scale={[60, 6, 1]} color="#fff4e0" />
        </Environment>
        <hemisphereLight args={['#d8ecff', '#5a7a44', 0.8]} />
        <directionalLight position={[120, 160, -100]} intensity={2.4} color="#fff3df" />
        {race.kind === 'horse' && <HorseTrack c={course} race={race} />}
        {race.kind === 'keirin' && <KeirinTrack c={course} race={race} />}
        {race.kind === 'boat' && <BoatCourse c={course} race={race} sim={sim} />}
        {race.runners.map((r, i) => {
          if (race.kind === 'horse') {
            const s = silkOf(r.name);
            return <Horse key={i} course={course} sim={sim} i={i} coat={r.coat ?? '#7a4a2a'} cap={color(i).bg} silk={s.silk} sleeve={s.sleeve} no={r.no} />;
          }
          if (race.kind === 'keirin') return <Cyclist key={i} course={course} sim={sim} i={i} color={color(i).bg} no={r.no} tag={tagOf(i)} />;
          return <Boat key={i} course={course} sim={sim} i={i} color={color(i).bg} no={r.no} tag={tagOf(i)} />;
        })}
        {race.kind === 'keirin' && <Cyclist course={course} sim={sim} i={-1} color="#4a2a7a" no={0} pacer />}
        <BroadcastCamera c={course} race={race} sim={sim} />
      </Canvas>
    </div>
  );
}
