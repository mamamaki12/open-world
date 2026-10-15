// 道路の向かいに最初から建っているカジノ・競技場。家の部品ではないので、消したり動かしたりできない
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CASINO, CASINO_PILLARS, CASINO_PLANTERS, CASINO_PLAZA } from '../building/landmarks';

const W = CASINO.x1 - CASINO.x0;
const D = CASINO.z1 - CASINO.z0;
const H = CASINO.height;
const CX = (CASINO.x0 + CASINO.x1) / 2;
const CZ = (CASINO.z0 + CASINO.z1) / 2;
const FRONT = CASINO.z0;
const DOOR = CASINO.door;
const CANOPY_Y = 4.2;
const CANOPY_W = DOOR.width + 3.6;

const GOLD = { color: '#c9a03c', metalness: 0.85, roughness: 0.32 };

/** 文字の看板（キャンバスに描いて光らせる） */
function signTexture(draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function mainSign() {
  return signTexture((g, w, h) => {
    const bg = g.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#5a0d14');
    bg.addColorStop(1, '#2a0508');
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#f2c64d';
    g.lineWidth = 14;
    g.strokeRect(14, 14, w - 28, h - 28);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.shadowColor = '#ffcf5a';
    g.shadowBlur = 30;
    g.fillStyle = '#ffe08a';
    g.font = '900 190px Georgia, "Times New Roman", serif';
    g.fillText('CASINO', w / 2, h * 0.42);
    g.shadowBlur = 16;
    g.fillStyle = '#fff3d0';
    g.font = '700 74px "Hiragino Sans", "Noto Sans JP", "Yu Gothic", sans-serif';
    g.fillText('カジノ・競技場', w / 2, h * 0.8);
  }, 1200, 400);
}

function roofSign() {
  return signTexture((g, w, h) => {
    g.fillStyle = '#14121a';
    g.fillRect(0, 0, w, h);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const cell = w / 3;
    for (let i = 0; i < 3; i++) {
      const x = cell * i + cell / 2;
      g.fillStyle = '#fbf6ea';
      g.fillRect(x - cell * 0.4, h * 0.1, cell * 0.8, h * 0.8);
      g.shadowColor = '#ff3b3b';
      g.shadowBlur = 18;
      g.fillStyle = '#e0141e';
      g.font = '900 230px Georgia, serif';
      g.fillText('7', x, h * 0.54);
      g.shadowBlur = 0;
    }
    g.strokeStyle = '#f2c64d';
    g.lineWidth = 12;
    g.strokeRect(6, 6, w - 12, h - 12);
  }, 900, 320);
}

/** ひさしの電球：2組を交互に光らせる */
function Bulbs() {
  const on = useMemo(() => new THREE.MeshStandardMaterial({ color: '#fff1c2', emissive: '#ffd27a', emissiveIntensity: 2.4 }), []);
  const off = useMemo(() => new THREE.MeshStandardMaterial({ color: '#fff1c2', emissive: '#ffd27a', emissiveIntensity: 0.3 }), []);
  const bulbs = useMemo(() => {
    const list: [number, number, number][] = [];
    const n = 18;
    for (let i = 0; i < n; i++) list.push([DOOR.x - CANOPY_W / 2 + 0.2 + (i * (CANOPY_W - 0.4)) / (n - 1), CANOPY_Y - 0.08, FRONT - CASINO.canopyDepth + 0.08]);
    for (let i = 1; i < 6; i++) {
      for (const s of [-1, 1]) list.push([DOOR.x + s * (CANOPY_W / 2 - 0.08), CANOPY_Y - 0.08, FRONT - CASINO.canopyDepth + 0.08 + (i * (CASINO.canopyDepth - 0.3)) / 6]);
    }
    return list;
  }, []);
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const phase = useRef(-1);
  useFrame(({ clock }) => {
    const p = Math.floor(clock.elapsedTime / 0.4) % 2;
    if (p === phase.current) return;
    phase.current = p;
    refs.current.forEach((m, i) => {
      if (m) m.material = (i + p) % 2 === 0 ? on : off;
    });
  });
  return (
    <>
      {bulbs.map((p, i) => (
        <mesh key={i} ref={(m) => (refs.current[i] = m)} position={p} material={on}>
          <sphereGeometry args={[0.07, 10, 8]} />
        </mesh>
      ))}
    </>
  );
}

/** 正面のガラス壁（入口の左右） */
function GlassWall({ x0, x1 }: { x0: number; x1: number }) {
  const w = x1 - x0;
  const mullions = Math.max(1, Math.round(w / 1.6));
  return (
    <group>
      <mesh position={[(x0 + x1) / 2, 3.6, FRONT - 0.03]}>
        <boxGeometry args={[w, 5.6, 0.06]} />
        <meshStandardMaterial color="#1b2633" metalness={0.7} roughness={0.12} emissive="#3a2a12" emissiveIntensity={0.35} />
      </mesh>
      {Array.from({ length: mullions + 1 }, (_, i) => (
        <mesh key={i} position={[x0 + (i * w) / mullions, 3.6, FRONT - 0.08]}>
          <boxGeometry args={[0.08, 5.6, 0.08]} />
          <meshStandardMaterial {...GOLD} />
        </mesh>
      ))}
      <mesh position={[(x0 + x1) / 2, 2.2, FRONT - 0.08]}>
        <boxGeometry args={[w, 0.08, 0.08]} />
        <meshStandardMaterial {...GOLD} />
      </mesh>
    </group>
  );
}

export function CasinoBuilding() {
  const main = useMemo(mainSign, []);
  const roof = useMemo(roofSign, []);
  const doorL = DOOR.x - DOOR.width / 2;
  const doorR = DOOR.x + DOOR.width / 2;
  return (
    <group name="casino">
      {/* 入口前の広場 */}
      <mesh rotation-x={-Math.PI / 2} position={[(CASINO_PLAZA.x0 + CASINO_PLAZA.x1) / 2, 0.004, (CASINO_PLAZA.z0 + CASINO_PLAZA.z1) / 2]} receiveShadow>
        <planeGeometry args={[CASINO_PLAZA.x1 - CASINO_PLAZA.x0, CASINO_PLAZA.z1 - CASINO_PLAZA.z0]} />
        <meshStandardMaterial color="#cfc6b6" roughness={0.95} />
      </mesh>
      {/* 赤いじゅうたん */}
      <mesh rotation-x={-Math.PI / 2} position={[DOOR.x, 0.012, FRONT - (CASINO.canopyDepth + 2.2) / 2]} receiveShadow>
        <planeGeometry args={[2.6, CASINO.canopyDepth + 2.2]} />
        <meshStandardMaterial color="#9e1420" roughness={0.9} />
      </mesh>

      {/* 建物 */}
      <mesh position={[CX, H / 2, CZ]} castShadow receiveShadow>
        <boxGeometry args={[W, H, D]} />
        <meshStandardMaterial color="#efe6d4" roughness={0.8} />
      </mesh>
      <mesh position={[CX, 0.35, CZ]} receiveShadow>
        <boxGeometry args={[W + 0.3, 0.7, D + 0.3]} />
        <meshStandardMaterial color="#6b6258" roughness={0.9} />
      </mesh>
      {/* 屋上（平らな屋根）と、ふちの金色の飾り */}
      <mesh position={[CX, H + 0.02, CZ]} receiveShadow>
        <boxGeometry args={[W - 0.3, 0.04, D - 0.3]} />
        <meshStandardMaterial color="#8d8a84" roughness={0.95} />
      </mesh>
      {[
        [CX, CASINO.z0, W + 0.5, 0.35],
        [CX, CASINO.z1, W + 0.5, 0.35],
        [CASINO.x0, CZ, 0.35, D + 0.5],
        [CASINO.x1, CZ, 0.35, D + 0.5],
      ].map(([x, z, w, d]) => (
        <mesh key={`${x},${z}`} position={[x, H - 0.1, z]} castShadow>
          <boxGeometry args={[w, 0.7, d]} />
          <meshStandardMaterial {...GOLD} />
        </mesh>
      ))}
      {/* 横のネオン */}
      <mesh position={[CX, 7.55, FRONT - 0.06]}>
        <boxGeometry args={[W - 0.6, 0.12, 0.08]} />
        <meshStandardMaterial color="#ff4a5a" emissive="#ff2a3c" emissiveIntensity={2.2} />
      </mesh>
      {[CASINO.x0 + 0.15, CASINO.x1 - 0.15].map((x) => (
        <mesh key={x} position={[x, H / 2, FRONT - 0.06]}>
          <boxGeometry args={[0.12, H - 1, 0.08]} />
          <meshStandardMaterial color="#ff4a5a" emissive="#ff2a3c" emissiveIntensity={2.2} />
        </mesh>
      ))}

      {/* 正面のガラス壁と入口 */}
      <GlassWall x0={CASINO.x0 + 1} x1={doorL - 0.9} />
      <GlassWall x0={doorR + 0.9} x1={CASINO.x1 - 1} />
      <mesh position={[DOOR.x, DOOR.height / 2 + 0.02, FRONT - 0.03]}>
        <planeGeometry args={[DOOR.width, DOOR.height]} />
        <meshStandardMaterial color="#ffe2a3" emissive="#ffb84d" emissiveIntensity={1.3} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[DOOR.x, DOOR.height / 2, FRONT - 0.06]}>
        <boxGeometry args={[0.06, DOOR.height, 0.06]} />
        <meshStandardMaterial {...GOLD} />
      </mesh>
      {[doorL - 0.2, doorR + 0.2].map((x) => (
        <mesh key={x} position={[x, (DOOR.height + 0.4) / 2, FRONT - 0.12]} castShadow>
          <boxGeometry args={[0.4, DOOR.height + 0.4, 0.24]} />
          <meshStandardMaterial {...GOLD} />
        </mesh>
      ))}
      <mesh position={[DOOR.x, DOOR.height + 0.4, FRONT - 0.12]}>
        <boxGeometry args={[DOOR.width + 0.8, 0.4, 0.24]} />
        <meshStandardMaterial {...GOLD} />
      </mesh>

      {/* ひさしと柱 */}
      <mesh position={[DOOR.x, CANOPY_Y + 0.18, FRONT - CASINO.canopyDepth / 2]} castShadow receiveShadow>
        <boxGeometry args={[CANOPY_W, 0.36, CASINO.canopyDepth]} />
        <meshStandardMaterial color="#2a2422" roughness={0.6} />
      </mesh>
      <mesh position={[DOOR.x, CANOPY_Y + 0.18, FRONT - CASINO.canopyDepth + 0.02]}>
        <boxGeometry args={[CANOPY_W + 0.04, 0.38, 0.04]} />
        <meshStandardMaterial {...GOLD} />
      </mesh>
      {CASINO_PILLARS.map((p) => (
        <mesh key={p.x} position={[p.x, CANOPY_Y / 2, p.z]} castShadow>
          <cylinderGeometry args={[0.22, 0.26, CANOPY_Y, 20]} />
          <meshStandardMaterial {...GOLD} />
        </mesh>
      ))}
      <Bulbs />

      {/* 看板 */}
      <mesh position={[DOOR.x, 6.0, FRONT - 0.08]} rotation-y={Math.PI}>
        <planeGeometry args={[9, 3]} />
        <meshStandardMaterial map={main} emissiveMap={main} emissive="#ffffff" emissiveIntensity={0.9} roughness={0.5} />
      </mesh>
      <group position={[DOOR.x, H, CASINO.z0 + 2]}>
        {[-2.4, 2.4].map((x) => (
          <mesh key={x} position={[x, 0.7, 0.1]}>
            <boxGeometry args={[0.16, 1.4, 0.16]} />
            <meshStandardMaterial color="#3a3a3a" metalness={0.6} roughness={0.5} />
          </mesh>
        ))}
        <mesh position={[0, 2.3, 0]} castShadow>
          <boxGeometry args={[6.4, 2.4, 0.2]} />
          <meshStandardMaterial color="#14121a" />
        </mesh>
        <mesh position={[0, 2.3, -0.11]} rotation-y={Math.PI}>
          <planeGeometry args={[6.2, 2.2]} />
          <meshStandardMaterial map={roof} emissiveMap={roof} emissive="#ffffff" emissiveIntensity={0.8} side={THREE.FrontSide} />
        </mesh>
      </group>

      {/* 植え込み */}
      {CASINO_PLANTERS.map((b) => (
        <group key={b.x0} position={[(b.x0 + b.x1) / 2, 0, (b.z0 + b.z1) / 2]}>
          <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
            <boxGeometry args={[b.x1 - b.x0, 0.6, b.z1 - b.z0]} />
            <meshStandardMaterial color="#8c8273" roughness={0.9} />
          </mesh>
          {[-0.8, 0, 0.8].map((x) => (
            <mesh key={x} position={[x, 0.85, 0]} castShadow>
              <sphereGeometry args={[0.45, 16, 12]} />
              <meshStandardMaterial color="#3f6b35" roughness={1} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}
