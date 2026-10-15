// レースの3Dの走り手：騎手を乗せた馬、自転車の選手、ボートとレーサー。
// どれも +X を向いて作り、走った距離から脚・ペダル・波の動きを決める
import { useMemo, useRef } from 'react';
import type { MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { courseP, pointAt } from '../../../economy/raceMotion';
import type { Course } from '../../../economy/raceMotion';
import { blobTexture, numberTexture } from './raceTextures';

export interface RaceSim {
  /** レースの時刻（秒、スタート前はマイナス） */
  t: number;
  dist: number[];
  lat: number[];
  standings: number[];
  overview: boolean;
  /** 競輪の誘導員 */
  pacer: { d: number; lat: number; alpha: number } | null;
}

/** バンクの傾き（競輪だけ。直線はゆるく、カントはきつい） */
export function bankAngle(c: Course, p: number) {
  if (c.kind !== 'keirin') return 0;
  const S = c.straight;
  const A = Math.PI * c.radius;
  const q = ((p % c.circumference) + c.circumference) % c.circumference;
  let into: number;
  if (q < S) into = -Math.min(q, S - q);
  else if (q < S + A) into = Math.min(q - S, S + A - q);
  else if (q < 2 * S + A) into = -Math.min(q - S - A, 2 * S + A - q);
  else into = Math.min(q - 2 * S - A, c.circumference - q);
  const ramp = 16;
  const f = Math.min(1, Math.max(0, (into + ramp) / (2 * ramp)));
  const s = f * f * (3 - 2 * f);
  return ((9 + (33 - 9) * s) * Math.PI) / 180;
}

/** 走路の高さ（競輪のバンクは外ほど高い） */
export function elevation(c: Course, p: number, lat: number) {
  if (c.kind !== 'keirin') return 0;
  return Math.max(0, lat + 1.2) * Math.tan(bankAngle(c, p));
}

/** 2点（XY 面）を結ぶ円柱を置く。円柱は Y 軸向きに作ってあること */
function between(m: THREE.Object3D | null, ax: number, ay: number, bx: number, by: number) {
  if (!m) return;
  const vx = bx - ax;
  const vy = by - ay;
  const len = Math.hypot(vx, vy);
  m.position.set((ax + bx) / 2, (ay + by) / 2, m.position.z);
  m.rotation.set(0, 0, Math.atan2(-vx, vy));
  m.scale.y = len;
}

/** 2本の骨の長さから、ひざの位置を出す（ひざは前に曲がる） */
function knee(hx: number, hy: number, px: number, py: number, l1: number, l2: number, forward = 1) {
  const dx = px - hx;
  const dy = py - hy;
  const d = Math.min(Math.hypot(dx, dy), l1 + l2 - 1e-4);
  const a = Math.atan2(dy, dx);
  const b = Math.acos(Math.min(1, Math.max(-1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
  const ang = a + b * forward;
  return [hx + Math.cos(ang) * l1, hy + Math.sin(ang) * l1] as const;
}

/** 走り手の位置・向き・速さをまとめて出す */
function usePose(course: Course, sim: MutableRefObject<RaceSim>, i: number) {
  const prev = useRef({ t: -1e9, d: 0, v: 0 });
  return () => {
    const s = sim.current;
    const d = s.dist[i] ?? 0;
    const lat = s.lat[i] ?? 0;
    const p = courseP(course, d);
    const pt = pointAt(course, p, lat);
    const pr = prev.current;
    if (s.t > pr.t + 1e-4) {
      const v = (d - pr.d) / (s.t - pr.t);
      pr.v = pr.t < -1e8 ? 0 : pr.v + (Math.min(Math.max(v, 0), 40) - pr.v) * 0.3;
      pr.t = s.t;
      pr.d = d;
    }
    return { x: pt.x, z: pt.y, yaw: -pt.angle, y: elevation(course, p, lat), bank: bankAngle(course, p), d, v: pr.v };
  };
}

const UNIT_CYL = new THREE.CylinderGeometry(1, 1, 1, 12);
const SPHERE = new THREE.SphereGeometry(1, 20, 14);
const BOX = new THREE.BoxGeometry(1, 1, 1);

function Blob({ w, h, y = 0.02 }: { w: number; h: number; y?: number }) {
  const tex = useMemo(blobTexture, []);
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, y, 0]} renderOrder={1}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial map={tex} transparent depthWrite={false} />
    </mesh>
  );
}

/** 頭の上の番号の札（画面の上で同じ大きさに見える） */
export function NumberTag({ no, bg, fg, y, sim, i }: { no: number; bg: string; fg: string; y: number; sim: MutableRefObject<RaceSim>; i: number }) {
  const tex = useMemo(() => numberTexture(no, bg, fg), [no, bg, fg]);
  const ref = useRef<THREE.Sprite>(null);
  useFrame(({ camera, size }) => {
    const sp = ref.current;
    if (!sp) return;
    const fov = (camera as THREE.PerspectiveCamera).fov ?? 40;
    // スマホの小さな画面では札を小さくし、重なって読めなくならないよう上位5つだけ出す（全体の順位は下の帯）
    const narrow = size.width < 560;
    const k = ((narrow ? 17 : 22) / size.height) * 2 * Math.tan((fov * Math.PI) / 360);
    sp.scale.set(k, k, 1);
    const s = sim.current;
    sp.visible = !s.overview && (!narrow || s.standings.indexOf(i) < 5);
  });
  return (
    <sprite ref={ref} position={[0, y, 0]} renderOrder={10}>
      <spriteMaterial map={tex} sizeAttenuation={false} depthTest={false} transparent />
    </sprite>
  );
}

// ---- 馬と騎手 ----

/** 馬の脚の付け根（前脚・後ろ脚、左右）と、ギャロップで地面に着く順番のずれ */
const LEGS = [
  { x: 0.62, z: 0.17, off: 0.42, front: true },
  { x: 0.62, z: -0.17, off: 0.52, front: true },
  { x: -0.6, z: 0.17, off: 0.0, front: false },
  { x: -0.6, z: -0.17, off: 0.12, front: false },
];

export function Horse({ course, sim, i, coat, cap, silk, sleeve, no }: {
  course: Course;
  sim: MutableRefObject<RaceSim>;
  i: number;
  coat: string;
  cap: string;
  silk: string;
  sleeve: string;
  no: number;
}) {
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const neck = useRef<THREE.Group>(null);
  const tail = useRef<THREE.Group>(null);
  const jockey = useRef<THREE.Group>(null);
  const upper = useRef<(THREE.Group | null)[]>([]);
  const lower = useRef<(THREE.Group | null)[]>([]);
  const pose = usePose(course, sim, i);
  const cloth = useMemo(() => numberTexture(no, '#ffffff', '#111', '#ffffff'), [no]);
  const dark = useMemo(() => new THREE.Color(coat).multiplyScalar(0.35).getStyle(), [coat]);

  useFrame(() => {
    const g = root.current;
    if (!g) return;
    const ps = pose();
    g.position.set(ps.x, 0, ps.z);
    g.rotation.y = ps.yaw;
    const amp = Math.min(1, ps.v / 13);
    const ph = (ps.d / 6.8) * Math.PI * 2;
    const bob = Math.sin(ph * 2) * 0.06 * amp;
    if (body.current) {
      body.current.position.y = bob;
      body.current.rotation.z = Math.sin(ph) * 0.05 * amp;
    }
    if (jockey.current) jockey.current.position.y = 1.72 - bob * 0.85;
    if (neck.current) neck.current.rotation.z = Math.sin(ph + 1.2) * 0.14 * amp;
    if (tail.current) tail.current.rotation.z = 0.2 * amp + Math.sin(ph * 2) * 0.12 * amp;
    LEGS.forEach((l, k) => {
      const a = ph - l.off * Math.PI * 2;
      const u = upper.current[k];
      const lo = lower.current[k];
      if (u) u.rotation.z = Math.sin(a) * 0.62 * amp;
      // 前脚はひざを後ろへ、後ろ脚は前へたたむ
      const fold = Math.max(0, Math.sin(a + (l.front ? -1.3 : 1.6))) * 1.2 * amp;
      if (lo) lo.rotation.z = l.front ? -fold : fold * 0.8;
    });
  });

  const coatMat = <meshStandardMaterial color={coat} roughness={0.45} metalness={0.05} />;
  return (
    <group ref={root}>
      <Blob w={3.2} h={1.3} />
      <group ref={body}>
        {/* 胴・胸・おしり */}
        <mesh geometry={SPHERE} position={[0, 1.3, 0]} scale={[0.95, 0.38, 0.33]} castShadow>{coatMat}</mesh>
        <mesh geometry={SPHERE} position={[0.55, 1.3, 0]} scale={[0.42, 0.42, 0.33]}>{coatMat}</mesh>
        <mesh geometry={SPHERE} position={[-0.58, 1.34, 0]} scale={[0.46, 0.42, 0.36]}>{coatMat}</mesh>
        {/* 首と頭 */}
        <group ref={neck} position={[0.72, 1.45, 0]}>
          <mesh geometry={UNIT_CYL} position={[0.3, 0.27, 0]} rotation-z={-0.81} scale={[0.2, 0.8, 0.17]}>{coatMat}</mesh>
          <mesh geometry={BOX} position={[0.22, 0.42, 0]} rotation-z={-0.81} scale={[0.07, 0.75, 0.06]}>
            <meshStandardMaterial color={dark} roughness={0.8} />
          </mesh>
          <mesh geometry={UNIT_CYL} position={[0.8, 0.28, 0]} rotation-z={-2.3} scale={[0.12, 0.62, 0.11]}>{coatMat}</mesh>
          {[0.06, -0.06].map((z) => (
            <mesh key={z} position={[0.6, 0.6, z]} rotation-z={-0.3}>
              <coneGeometry args={[0.04, 0.14, 8]} />
              {coatMat}
            </mesh>
          ))}
        </group>
        {/* しっぽ */}
        <group ref={tail} position={[-0.98, 1.45, 0]}>
          <mesh geometry={UNIT_CYL} position={[-0.22, -0.32, 0]} rotation-z={2.5} scale={[0.07, 0.8, 0.07]}>
            <meshStandardMaterial color={dark} roughness={0.9} />
          </mesh>
        </group>
        {/* 鞍と、番号のゼッケン（白地に黒の数字） */}
        <mesh geometry={BOX} position={[0.05, 1.6, 0]} scale={[0.55, 0.06, 0.62]}>
          <meshStandardMaterial color="#f4f4f4" roughness={0.7} />
        </mesh>
        {[1, -1].map((s) => (
          <mesh key={s} position={[0.05, 1.42, 0.345 * s]} rotation-y={s > 0 ? 0 : Math.PI}>
            <planeGeometry args={[0.52, 0.36]} />
            <meshStandardMaterial map={cloth} roughness={0.7} />
          </mesh>
        ))}
        {/* 脚 */}
        {LEGS.map((l, k) => (
          <group key={k} position={[l.x, 1.12, l.z]} ref={(el) => (upper.current[k] = el)}>
            <mesh geometry={UNIT_CYL} position={[0, -0.27, 0]} scale={[l.front ? 0.085 : 0.11, 0.56, l.front ? 0.085 : 0.11]}>{coatMat}</mesh>
            <group position={[0, -0.55, 0]} ref={(el) => (lower.current[k] = el)}>
              <mesh geometry={UNIT_CYL} position={[0, -0.25, 0]} scale={[0.05, 0.5, 0.05]}>
                <meshStandardMaterial color={k % 2 ? dark : coat} roughness={0.5} />
              </mesh>
              <mesh geometry={UNIT_CYL} position={[0, -0.52, 0]} scale={[0.065, 0.07, 0.065]}>
                <meshStandardMaterial color="#1a1410" roughness={0.6} />
              </mesh>
            </group>
          </group>
        ))}
      </group>
      {/* 騎手：前かがみで鞍の上に浮かせて乗る */}
      <group ref={jockey} position={[0.1, 1.72, 0]}>
        {[0.2, -0.2].map((z) => (
          <group key={z}>
            <mesh geometry={UNIT_CYL} position={[0.05, 0.1, z]} rotation-z={-1.1} scale={[0.07, 0.42, 0.07]}>
              <meshStandardMaterial color="#f2f2f2" roughness={0.7} />
            </mesh>
            <mesh geometry={UNIT_CYL} position={[0.08, -0.12, z * 0.95]} rotation-z={0.5} scale={[0.055, 0.36, 0.055]}>
              <meshStandardMaterial color="#1b1b1b" roughness={0.5} />
            </mesh>
          </group>
        ))}
        <mesh geometry={BOX} position={[0.12, 0.3, 0]} rotation-z={-0.3} scale={[0.52, 0.22, 0.3]}>
          <meshStandardMaterial color={silk} roughness={0.35} />
        </mesh>
        {[0.15, -0.15].map((z) => (
          <mesh key={z} geometry={UNIT_CYL} position={[0.55, 0.26, z]} rotation-z={-1.75} scale={[0.05, 0.5, 0.05]}>
            <meshStandardMaterial color={sleeve} roughness={0.35} />
          </mesh>
        ))}
        <mesh geometry={SPHERE} position={[0.48, 0.48, 0]} scale={0.12}>
          <meshStandardMaterial color="#e2b48f" roughness={0.6} />
        </mesh>
        <mesh geometry={SPHERE} position={[0.47, 0.52, 0]} scale={[0.135, 0.11, 0.13]}>
          <meshStandardMaterial color={cap} roughness={0.3} />
        </mesh>
      </group>
      <NumberTag no={no} bg="#ffffff" fg="#222" y={3.1} sim={sim} i={i} />
    </group>
  );
}

// ---- 自転車と選手（競輪） ----

const CRANK = { x: 0, y: 0.3, r: 0.17 };
const HIP = { x: -0.14, y: 0.98 };

export function Cyclist({ course, sim, i, color, no, tag, pacer = false }: {
  course: Course;
  sim: MutableRefObject<RaceSim>;
  i: number;
  color: string;
  no: number;
  tag?: { bg: string; fg: string };
  pacer?: boolean;
}) {
  const root = useRef<THREE.Group>(null);
  const wheels = useRef<(THREE.Group | null)[]>([]);
  const crank = useRef<THREE.Group>(null);
  const legs = useRef<(THREE.Mesh | null)[]>([]);
  const pose = usePose(course, sim, i);
  const pacerPose = useRef({ t: -1e9, d: 0, v: 0 });

  useFrame(() => {
    const g = root.current;
    if (!g) return;
    let ps;
    if (pacer) {
      const s = sim.current;
      const pc = s.pacer;
      g.visible = !!pc && pc.alpha > 0.02;
      if (!pc || !g.visible) return;
      const p = courseP(course, pc.d);
      const pt = pointAt(course, p, pc.lat);
      const pr = pacerPose.current;
      if (s.t > pr.t + 1e-4) {
        pr.v = pr.t < -1e8 ? 0 : (pc.d - pr.d) / (s.t - pr.t);
        pr.t = s.t;
        pr.d = pc.d;
      }
      ps = { x: pt.x, z: pt.y, yaw: -pt.angle, y: elevation(course, p, pc.lat), bank: bankAngle(course, p), d: pc.d, v: pr.v };
    } else ps = pose();
    g.position.set(ps.x, ps.y, ps.z);
    g.rotation.set(-ps.bank, ps.yaw, 0, 'YXZ');
    const turn = (ps.d / 2.1) * Math.PI * 2;
    wheels.current.forEach((w) => w && (w.rotation.z = -turn));
    // ギア比 約3.9：ペダル1回転で約8.3m進む
    const th = -(ps.d / 8.3) * Math.PI * 2;
    if (crank.current) crank.current.rotation.z = th;
    [0, Math.PI].forEach((o, k) => {
      const px = CRANK.x + Math.cos(th + o) * CRANK.r;
      const py = CRANK.y + Math.sin(th + o) * CRANK.r;
      const [kx, ky] = knee(HIP.x, HIP.y, px, py, 0.46, 0.46, -1);
      between(legs.current[k * 2], HIP.x, HIP.y, kx, ky);
      between(legs.current[k * 2 + 1], kx, ky, px, py);
    });
  });

  const frame = <meshStandardMaterial color={pacer ? '#d8d8d8' : '#c0c4c8'} metalness={0.8} roughness={0.25} />;
  const suit = <meshStandardMaterial color={color} roughness={0.4} />;
  return (
    <group ref={root}>
      <Blob w={2} h={0.7} />
      {/* 車輪：後ろはディスク、前はスポーク */}
      <group position={[-0.5, 0.34, 0]} ref={(el) => (wheels.current[0] = el)}>
        <mesh rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.335, 0.335, 0.03, 32]} />
          <meshStandardMaterial color="#2b2b2e" metalness={0.5} roughness={0.35} />
        </mesh>
        <mesh>
          <torusGeometry args={[0.335, 0.02, 8, 32]} />
          <meshStandardMaterial color="#111" roughness={0.6} />
        </mesh>
      </group>
      <group position={[0.52, 0.34, 0]} ref={(el) => (wheels.current[1] = el)}>
        <mesh>
          <torusGeometry args={[0.335, 0.02, 8, 32]} />
          <meshStandardMaterial color="#111" roughness={0.6} />
        </mesh>
        {[0, 1, 2, 3, 4, 5].map((k) => (
          <mesh key={k} geometry={UNIT_CYL} rotation-z={(k * Math.PI) / 6} scale={[0.004, 0.66, 0.004]}>
            <meshStandardMaterial color="#ddd" metalness={0.8} roughness={0.2} />
          </mesh>
        ))}
      </group>
      {/* フレーム */}
      {[
        [CRANK.x, CRANK.y, -0.12, 0.86],
        [-0.12, 0.84, 0.46, 0.84],
        [0.46, 0.82, CRANK.x, CRANK.y],
        [CRANK.x, CRANK.y, -0.5, 0.34],
        [-0.12, 0.84, -0.5, 0.34],
        [0.46, 0.84, 0.52, 0.34],
      ].map(([ax, ay, bx, by], k) => (
        <mesh key={k} geometry={UNIT_CYL} ref={(m) => between(m, ax, ay, bx, by)} scale={[0.022, 1, 0.022]}>
          {frame}
        </mesh>
      ))}
      <group ref={crank} position={[CRANK.x, CRANK.y, 0]}>
        <mesh rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.1, 0.1, 0.02, 24]} />
          <meshStandardMaterial color="#888" metalness={0.9} roughness={0.2} />
        </mesh>
      </group>
      <mesh geometry={BOX} position={[-0.14, 0.9, 0]} scale={[0.22, 0.04, 0.08]}>
        <meshStandardMaterial color="#111" />
      </mesh>
      <mesh position={[0.6, 0.78, 0]} rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.1, 0.014, 6, 16, Math.PI]} />
        {frame}
      </mesh>
      {/* 脚（太もも・すね）：ペダルに合わせて曲げ伸ばし */}
      {[0.1, -0.1].map((z, k) => (
        <group key={z} position={[0, 0, z]}>
          <mesh geometry={UNIT_CYL} ref={(m) => (legs.current[k * 2] = m)} scale={[0.075, 1, 0.075]}>{suit}</mesh>
          <mesh geometry={UNIT_CYL} ref={(m) => (legs.current[k * 2 + 1] = m)} scale={[0.055, 1, 0.055]}>
            <meshStandardMaterial color={pacer ? '#222' : '#f2f2f2'} roughness={0.6} />
          </mesh>
        </group>
      ))}
      {/* 上半身：深い前傾 */}
      <mesh geometry={BOX} position={[0.13, 1.1, 0]} rotation-z={-0.38} scale={[0.62, 0.2, 0.34]}>{suit}</mesh>
      {[0.16, -0.16].map((z) => (
        <mesh key={z} geometry={UNIT_CYL} ref={(m) => between(m, 0.38, 1.2, 0.6, 0.8)} position-z={z} scale={[0.045, 1, 0.045]}>{suit}</mesh>
      ))}
      <mesh geometry={SPHERE} position={[0.52, 1.32, 0]} scale={[0.15, 0.13, 0.13]}>
        <meshStandardMaterial color={pacer ? '#f2f2f2' : color} roughness={0.25} metalness={0.1} />
      </mesh>
      {tag && <NumberTag no={no} bg={tag.bg} fg={tag.fg} y={2.1} sim={sim} i={i} />}
    </group>
  );
}

// ---- ボートとレーサー ----

export function Boat({ course, sim, i, color, no, tag }: {
  course: Course;
  sim: MutableRefObject<RaceSim>;
  i: number;
  color: string;
  no: number;
  tag: { bg: string; fg: string };
}) {
  const root = useRef<THREE.Group>(null);
  const tilt = useRef<THREE.Group>(null);
  const prevYaw = useRef<number | null>(null);
  const roll = useRef(0);
  const pose = usePose(course, sim, i);
  const hull = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(1.75, 0);
    s.quadraticCurveTo(1.3, 0.72, 0.5, 0.74);
    s.lineTo(-1.45, 0.68);
    s.lineTo(-1.45, -0.68);
    s.lineTo(0.5, -0.74);
    s.quadraticCurveTo(1.3, -0.72, 1.75, 0);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.32, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 2 });
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);
  const side = useMemo(() => numberTexture(no, tag.bg, tag.fg), [no, tag.bg, tag.fg]);

  useFrame(({ clock }) => {
    const g = root.current;
    if (!g) return;
    const ps = pose();
    g.position.set(ps.x, 0, ps.z);
    g.rotation.y = ps.yaw;
    // 曲がるときは内側へ傾く（ターンマークのまわり）
    const py = prevYaw.current;
    let dy = py === null ? 0 : ps.yaw - py;
    dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    prevYaw.current = ps.yaw;
    const targetRoll = Math.max(-0.35, Math.min(0.35, dy * 25));
    roll.current += (targetRoll - roll.current) * 0.1;
    if (tilt.current) {
      const fast = Math.min(1, ps.v / 15);
      tilt.current.rotation.set(roll.current, 0, 0.05 + fast * 0.05 + Math.sin(clock.elapsedTime * 7 + i) * 0.015 * fast);
      tilt.current.position.y = 0.05 + Math.sin(clock.elapsedTime * 5.3 + i * 2) * 0.03 * fast;
    }
  });

  return (
    <group ref={root}>
      <group ref={tilt}>
        <mesh geometry={hull} castShadow>
          <meshPhysicalMaterial color="#f7f7f5" roughness={0.25} clearcoat={0.8} />
        </mesh>
        {/* 艇の色の甲板と、横の番号 */}
        <mesh geometry={BOX} position={[0.75, 0.37, 0]} scale={[1.2, 0.04, 1.0]}>
          <meshStandardMaterial color={color} roughness={0.3} />
        </mesh>
        {[1, -1].map((s) => (
          <mesh key={s} position={[0.9, 0.2, 0.74 * s]} rotation-y={s > 0 ? 0 : Math.PI}>
            <planeGeometry args={[0.32, 0.26]} />
            <meshStandardMaterial map={side} roughness={0.5} />
          </mesh>
        ))}
        {/* レーサー：ひざをついて前かがみ */}
        <mesh geometry={BOX} position={[-0.25, 0.62, 0]} rotation-z={-0.55} scale={[0.6, 0.28, 0.42]}>
          <meshStandardMaterial color={color} roughness={0.45} />
        </mesh>
        <mesh geometry={BOX} position={[-0.55, 0.42, 0]} scale={[0.5, 0.2, 0.44]}>
          <meshStandardMaterial color="#1d1d1f" roughness={0.6} />
        </mesh>
        <mesh geometry={SPHERE} position={[0.12, 0.88, 0]} scale={[0.17, 0.15, 0.15]}>
          <meshStandardMaterial color={color} roughness={0.2} metalness={0.15} />
        </mesh>
        <mesh geometry={BOX} position={[0.25, 0.86, 0]} scale={[0.05, 0.06, 0.2]}>
          <meshStandardMaterial color="#111" roughness={0.1} />
        </mesh>
        {/* ハンドルと、後ろのモーター */}
        <mesh geometry={UNIT_CYL} position={[0.35, 0.6, 0]} rotation-x={Math.PI / 2} scale={[0.02, 0.5, 0.02]}>
          <meshStandardMaterial color="#222" />
        </mesh>
        <mesh geometry={BOX} position={[-1.62, 0.55, 0]} scale={[0.36, 0.5, 0.3]}>
          <meshStandardMaterial color="#26282c" metalness={0.4} roughness={0.35} />
        </mesh>
        <mesh geometry={BOX} position={[-1.62, 0.84, 0]} scale={[0.4, 0.12, 0.32]}>
          <meshStandardMaterial color="#d33" roughness={0.3} />
        </mesh>
      </group>
      <NumberTag no={no} bg={tag.bg} fg={tag.fg} y={2.4} sim={sim} i={i} />
    </group>
  );
}
