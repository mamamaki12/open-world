// 3Dのスロット台：本物の台のように、ガラスの奥でリール（絵柄を巻いた円柱）が回る
import { useMemo, useRef } from 'react';
import type { MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import type { SlotSymbol } from '../../../economy/casino';
import { reelTexture, slotMarquee, slotPayGlass } from './textures';

export interface ReelState {
  /** 位置（絵柄いくつぶん回ったか）。整数のとき、その番号の絵柄が真ん中に止まる */
  pos: number;
}

const W = 1.15;
const D = 0.7;
const TOP = 1.25;
const BOTTOM = -0.95;
const WIN_Y = 0.36;
const REEL_R = 0.55;
const REEL_W = 0.24;
const GAP = 0.035;
const WIN_W = REEL_W * 3 + GAP * 4;
const CELL = (Math.PI * 2 * REEL_R) / 20;
const WIN_H = CELL * 3;

const RED = { color: '#a30f1c', metalness: 0.55, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.08 };
const CHROME = { color: '#e8e8ea', metalness: 1, roughness: 0.12 };
const GOLD = { color: '#d8ac48', metalness: 1, roughness: 0.22 };

function Reel({ strip, index, reels }: { strip: SlotSymbol[]; index: number; reels: MutableRefObject<ReelState[]> }) {
  const mesh = useRef<THREE.Mesh>(null);
  const tex = useMemo(() => reelTexture(strip, String(index)), [strip, index]);
  const n = strip.length;
  useFrame(() => {
    const r = reels.current[index];
    if (mesh.current && r) mesh.current.rotation.set(((r.pos + 0.5) * Math.PI * 2) / n, 0, Math.PI / 2);
  });
  const x = (index - 1) * (REEL_W + GAP);
  return (
    <mesh ref={mesh} position={[x, WIN_Y, -0.05 - REEL_R]}>
      <cylinderGeometry args={[REEL_R, REEL_R, REEL_W, 96, 1, true]} />
      <meshStandardMaterial map={tex} roughness={0.45} metalness={0} side={THREE.FrontSide} />
    </mesh>
  );
}

/** 点滅する電球の列 */
function Bulbs({ points, fast, size = 0.022 }: { points: [number, number, number][]; fast: boolean; size?: number }) {
  const on = useMemo(() => new THREE.MeshStandardMaterial({ color: '#fff4cf', emissive: '#ffcf6a', emissiveIntensity: 3 }), []);
  const off = useMemo(() => new THREE.MeshStandardMaterial({ color: '#d8c79a', emissive: '#ffcf6a', emissiveIntensity: 0.25 }), []);
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  useFrame(({ clock }) => {
    const p = Math.floor(clock.elapsedTime / (fast ? 0.12 : 0.45)) % 2;
    refs.current.forEach((m, i) => {
      if (m) m.material = (i + p) % 2 ? on : off;
    });
  });
  return (
    <>
      {points.map((p, i) => (
        <mesh key={i} ref={(m) => (refs.current[i] = m)} position={p} material={on}>
          <sphereGeometry args={[size, 12, 8]} />
        </mesh>
      ))}
    </>
  );
}

function Lever({ pulled, onPull, disabled }: { pulled: boolean; onPull: () => void; disabled: boolean }) {
  const arm = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (!arm.current) return;
    const goal = pulled ? 1.25 : 0;
    arm.current.rotation.x += (goal - arm.current.rotation.x) * Math.min(1, dt * (pulled ? 22 : 6));
  });
  return (
    <group position={[W / 2 + 0.07, 0.05, -0.3]}>
      <mesh rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.07, 0.07, 0.1, 32]} />
        <meshStandardMaterial {...CHROME} />
      </mesh>
      <group ref={arm} position={[0.05, 0, 0]}>
        <mesh position={[0, 0.32, 0]}>
          <cylinderGeometry args={[0.018, 0.022, 0.64, 16]} />
          <meshStandardMaterial {...CHROME} />
        </mesh>
        <mesh
          position={[0, 0.68, 0]}
          castShadow
          onClick={(e) => {
            e.stopPropagation();
            if (!disabled) onPull();
          }}
          onPointerOver={() => (document.body.style.cursor = disabled ? '' : 'pointer')}
          onPointerOut={() => (document.body.style.cursor = '')}
        >
          <sphereGeometry args={[0.075, 32, 24]} />
          <meshPhysicalMaterial color="#d10d1d" roughness={0.15} clearcoat={1} />
        </mesh>
      </group>
    </group>
  );
}

export function SlotMachine3D({ strips, reels, spinning, win, big, pulled, onPull, color = RED.color, position = [0, 0, 0], rotationY = 0, floor = true }: {
  strips: SlotSymbol[][];
  reels: MutableRefObject<ReelState[]>;
  spinning: boolean;
  win: boolean;
  big: boolean;
  pulled: boolean;
  onPull: () => void;
  /** 台の色（となりの台は色を変える） */
  color?: string;
  position?: [number, number, number];
  rotationY?: number;
  floor?: boolean;
}) {
  const body = { ...RED, color };
  const marquee = useMemo(slotMarquee, []);
  const pay = useMemo(slotPayGlass, []);
  const marqueeBulbs = useMemo(() => {
    const pts: [number, number, number][] = [];
    for (let i = 0; i < 16; i++) {
      const x = -W / 2 + 0.06 + (i * (W - 0.12)) / 15;
      pts.push([x, TOP + 0.42, 0.075], [x, TOP + 0.03, 0.075]);
    }
    return pts;
  }, []);
  const windowBulbs = useMemo(() => {
    const pts: [number, number, number][] = [];
    const hw = WIN_W / 2 + 0.07;
    const hh = WIN_H / 2 + 0.07;
    for (let i = 0; i <= 12; i++) {
      const x = -hw + (i * 2 * hw) / 12;
      pts.push([x, WIN_Y + hh, 0.03], [x, WIN_Y - hh, 0.03]);
    }
    for (let i = 1; i < 6; i++) {
      const y = WIN_Y - hh + (i * 2 * hh) / 6;
      pts.push([-hw, y, 0.03], [hw, y, 0.03]);
    }
    return pts;
  }, []);
  const glow = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (glow.current) glow.current.emissiveIntensity = win ? 1.5 + Math.sin(clock.elapsedTime * 18) * 1.2 : 0.9;
  });

  const side = (WIN_W / 2 + 0.1 + W / 2) / 2;
  const sideW = W / 2 - WIN_W / 2 - 0.1;
  const winTop = WIN_Y + WIN_H / 2 + 0.1;
  const winBottom = WIN_Y - WIN_H / 2 - 0.1;
  return (
    <group position={[position[0], position[1] - 0.15, position[2]]} rotation-y={rotationY}>
      {/* 台の外側：窓のまわりを囲む赤い箱 */}
      <mesh position={[0, (TOP + winTop) / 2, -D / 2]} castShadow receiveShadow>
        <boxGeometry args={[W, TOP - winTop, D]} />
        <meshPhysicalMaterial {...body} />
      </mesh>
      <mesh position={[0, (winBottom + BOTTOM) / 2, -D / 2]} castShadow receiveShadow>
        <boxGeometry args={[W, winBottom - BOTTOM, D]} />
        <meshPhysicalMaterial {...body} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * side, WIN_Y, -D / 2]} castShadow>
          <boxGeometry args={[sideW, winTop - winBottom, D]} />
          <meshPhysicalMaterial {...body} />
        </mesh>
      ))}
      {/* リールの奥の暗い箱 */}
      <mesh position={[0, WIN_Y, -0.05 - REEL_R * 2 - 0.02]}>
        <boxGeometry args={[WIN_W + 0.2, WIN_H + 0.2, 0.02]} />
        <meshStandardMaterial color="#0a0506" />
      </mesh>
      {/* 窓のふち（クローム）と、その外の電球 */}
      {[
        [0, WIN_Y + WIN_H / 2 + 0.035, WIN_W + 0.14, 0.07],
        [0, WIN_Y - WIN_H / 2 - 0.035, WIN_W + 0.14, 0.07],
        [-WIN_W / 2 - 0.035, WIN_Y, 0.07, WIN_H],
        [WIN_W / 2 + 0.035, WIN_Y, 0.07, WIN_H],
      ].map(([x, y, w, h], i) => (
        <RoundedBox key={i} args={[w, h, 0.06]} radius={0.015} position={[x, y, 0.01]}>
          <meshStandardMaterial {...CHROME} />
        </RoundedBox>
      ))}
      {/* リールの仕切り */}
      {[-0.5, 0.5].map((k) => (
        <mesh key={k} position={[k * (REEL_W + GAP), WIN_Y, -0.04]}>
          <boxGeometry args={[GAP, WIN_H, 0.03]} />
          <meshStandardMaterial color="#111" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
      {strips.map((st, i) => (
        <Reel key={i} strip={st} index={i} reels={reels} />
      ))}
      {/* リールを照らす内側の明かり */}
      <pointLight position={[0, WIN_Y + WIN_H / 2 - 0.02, -0.02]} intensity={1.6} distance={1.4} color="#fff2d6" />
      {/* 当たりの線 */}
      <mesh position={[0, WIN_Y, -0.025]}>
        <boxGeometry args={[WIN_W, 0.008, 0.004]} />
        <meshStandardMaterial ref={glow} color="#ff3030" emissive={win ? '#ffd86b' : '#ff2020'} emissiveIntensity={0.9} />
      </mesh>
      {/* ガラス */}
      <mesh position={[0, WIN_Y, 0.005]}>
        <planeGeometry args={[WIN_W, WIN_H]} />
        <meshPhysicalMaterial color="#ffffff" transparent opacity={0.1} roughness={0.03} metalness={0} clearcoat={1} depthWrite={false} />
      </mesh>
      <Bulbs points={windowBulbs} fast={spinning || win} />

      {/* 上の看板 */}
      <RoundedBox args={[W, 0.5, D * 0.9]} radius={0.04} position={[0, TOP + 0.23, -D * 0.45]} castShadow>
        <meshPhysicalMaterial {...body} color={new THREE.Color(color).multiplyScalar(0.5)} />
      </RoundedBox>
      <mesh position={[0, TOP + 0.225, 0.006]}>
        <planeGeometry args={[W - 0.12, 0.3]} />
        <meshStandardMaterial map={marquee} emissiveMap={marquee} emissive="#ffffff" emissiveIntensity={big ? 1.6 : 1} toneMapped={false} />
      </mesh>
      <Bulbs points={marqueeBulbs} fast={spinning || win} size={0.018} />
      {/* ふちの金の飾り */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (W / 2 + 0.008), (TOP + BOTTOM) / 2 + 0.1, -D / 2]}>
          <boxGeometry args={[0.016, TOP - BOTTOM + 0.2, D + 0.01]} />
          <meshStandardMaterial {...GOLD} />
        </mesh>
      ))}

      {/* 払い戻し表 */}
      <mesh position={[0, winBottom - 0.17, 0.003]}>
        <planeGeometry args={[W - 0.16, (W - 0.16) * (300 / 1024)]} />
        <meshStandardMaterial map={pay} emissiveMap={pay} emissive="#ffffff" emissiveIntensity={0.55} />
      </mesh>
      {/* ボタン台（手前にせり出した斜めの板）とボタン */}
      <group position={[0, -0.47, 0.11]} rotation-x={-0.35}>
        <RoundedBox args={[W, 0.06, 0.26]} radius={0.02} castShadow receiveShadow>
          <meshPhysicalMaterial color="#1a1416" metalness={0.4} roughness={0.35} clearcoat={0.6} />
        </RoundedBox>
        {[
          [-0.36, '#2a7be0', 0.045],
          [-0.2, '#2a7be0', 0.045],
          [0.28, win ? '#ffd86b' : '#ff3b30', 0.075],
        ].map(([x, c, r], i) => (
          <mesh
            key={i}
            position={[x as number, 0.04, 0]}
            onClick={i === 2 ? (e) => (e.stopPropagation(), !spinning && onPull()) : undefined}
          >
            <cylinderGeometry args={[r as number, r as number, 0.03, 32]} />
            <meshStandardMaterial color={c as string} emissive={c as string} emissiveIntensity={i === 2 && !spinning ? 1.4 : 0.5} roughness={0.25} />
          </mesh>
        ))}
      </group>
      {/* コイン受け */}
      <mesh position={[0, -0.8, 0.05]}>
        <boxGeometry args={[W * 0.7, 0.12, 0.12]} />
        <meshStandardMaterial {...CHROME} />
      </mesh>
      <mesh position={[0, -0.74, 0.05]}>
        <boxGeometry args={[W * 0.66, 0.01, 0.1]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      <Lever pulled={pulled} onPull={onPull} disabled={spinning} />

      {/* 床（じゅうたん） */}
      {floor && (
        <mesh rotation-x={-Math.PI / 2} position={[0, BOTTOM, 0]} receiveShadow>
          <planeGeometry args={[12, 12]} />
          <meshStandardMaterial color="#4a1016" roughness={0.95} />
        </mesh>
      )}
    </group>
  );
}
