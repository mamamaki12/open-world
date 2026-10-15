// 3Dのルーレット：木のボウルの中で盤（ローター）が回り、象牙の玉が外側の溝を逆向きに走ってポケットに落ちる
import { useMemo, useRef } from 'react';
import type { MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { WHEEL_ORDER } from '../../../economy/casino';
import { feltTexture, wheelFaceTexture, woodTexture } from './textures';

/** 盤の座標（絵と同じ、半径 150 の単位）から3Dの長さへ */
const S = 0.86 / 128;
const POCKET = (Math.PI * 2) / 37;

export interface WheelMotion {
  /** 盤の回転（ラジアン、上から見て時計回り） */
  wheel: number;
  /** 盤から見た玉の角度 */
  ballRel: number;
  /** 玉の中心からの距離（盤の単位：溝 134、ポケット 104） */
  ballR: number;
  ballVisible: boolean;
}

const GOLD = { color: '#d8ac48', metalness: 1, roughness: 0.2 };

function Bowl() {
  const wood = useMemo(woodTexture, []);
  const geo = useMemo(() => {
    // 外のふち → 玉の走る溝（なめらかな斜面）→ 盤のきわ
    const pts = [
      [1.2, -0.02],
      [1.2, 0.13],
      [1.14, 0.15],
      [1.06, 0.13],
      [1.02, 0.105],
      [0.95, 0.08],
      [0.88, 0.055],
      [0.87, 0.02],
    ].map(([r, y]) => new THREE.Vector2(r, y));
    return new THREE.LatheGeometry(pts, 128);
  }, []);
  return (
    <group>
      <mesh geometry={geo} receiveShadow castShadow>
        <meshPhysicalMaterial map={wood} color="#8a5329" roughness={0.25} clearcoat={1} clearcoatRoughness={0.06} side={THREE.DoubleSide} />
      </mesh>
      {/* 溝の斜面にあるひし形の当たり（玉がはねる） */}
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2 + 0.2;
        const r = 0.955;
        return (
          <mesh key={i} position={[Math.sin(a) * r, 0.088, -Math.cos(a) * r]} rotation={[0, -a, 0]}>
            <boxGeometry args={[0.035, 0.012, 0.05]} />
            <meshStandardMaterial {...GOLD} />
          </mesh>
        );
      })}
    </group>
  );
}

function Rotor({ motion }: { motion: MutableRefObject<WheelMotion> }) {
  const group = useRef<THREE.Group>(null);
  const face = useMemo(wheelFaceTexture, []);
  const cone = useMemo(() => {
    // 内から外へ並べる（面が上を向くように）
    const pts = [
      [0.0, 0.118],
      [0.14, 0.115],
      [0.3, 0.1],
      [0.5, 0.075],
      [0.645, 0.04],
    ].map(([r, y]) => new THREE.Vector2(r, y));
    return new THREE.LatheGeometry(pts, 96);
  }, []);
  const wood = useMemo(woodTexture, []);
  useFrame(() => {
    if (group.current) group.current.rotation.y = -motion.current.wheel;
  });
  return (
    <group ref={group}>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.04, 0]} receiveShadow>
        <circleGeometry args={[150 * S, 128]} />
        <meshPhysicalMaterial map={face} transparent alphaTest={0.5} roughness={0.35} clearcoat={0.6} />
      </mesh>
      {/* ポケットの仕切り（金属）と、外側の輪 */}
      {WHEEL_ORDER.map((_, i) => {
        const a = i * POCKET - POCKET / 2;
        const r = ((96 + 108) / 2) * S;
        return (
          <mesh key={i} position={[Math.sin(a) * r, 0.052, -Math.cos(a) * r]} rotation={[0, -a, 0]} castShadow>
            <boxGeometry args={[0.006, 0.024, 12 * S]} />
            <meshStandardMaterial {...GOLD} />
          </mesh>
        );
      })}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.042, 0]}>
        <ringGeometry args={[127 * S, 129 * S, 128]} />
        <meshStandardMaterial {...GOLD} />
      </mesh>
      {/* 真ん中の円すいと、取っ手（タレット） */}
      <mesh geometry={cone} castShadow receiveShadow>
        <meshPhysicalMaterial map={wood} color="#9a6233" roughness={0.3} clearcoat={1} />
      </mesh>
      <group position={[0, 0.118, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.045, 0.06, 0.09, 32]} />
          <meshStandardMaterial {...GOLD} />
        </mesh>
        {[0, 1, 2, 3].map((k) => (
          <group key={k} rotation-y={(k * Math.PI) / 2}>
            <mesh position={[0.11, 0.06, 0]} rotation-z={Math.PI / 2} castShadow>
              <cylinderGeometry args={[0.009, 0.009, 0.2, 12]} />
              <meshStandardMaterial {...GOLD} />
            </mesh>
            <mesh position={[0.21, 0.06, 0]}>
              <sphereGeometry args={[0.018, 16, 12]} />
              <meshStandardMaterial {...GOLD} />
            </mesh>
          </group>
        ))}
        <mesh position={[0, 0.12, 0]}>
          <sphereGeometry args={[0.03, 16, 12]} />
          <meshStandardMaterial {...GOLD} />
        </mesh>
      </group>
    </group>
  );
}

function Ball({ motion }: { motion: MutableRefObject<WheelMotion> }) {
  const mesh = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const m = motion.current;
    if (!mesh.current) return;
    mesh.current.visible = m.ballVisible;
    const a = m.wheel + m.ballRel;
    const r = m.ballR * S;
    // 溝の上は高く、ポケットに落ちると低い
    const y = 0.064 + Math.max(0, Math.min(1, (m.ballR - 104) / 30)) * 0.03;
    mesh.current.position.set(Math.sin(a) * r, y, -Math.cos(a) * r);
  });
  return (
    <mesh ref={mesh} castShadow>
      <sphereGeometry args={[0.024, 24, 16]} />
      <meshPhysicalMaterial color="#fbf7ec" roughness={0.12} clearcoat={1} />
    </mesh>
  );
}

/** 台の上に積んだチップ（飾り） */
function ChipPile({ x, z, color, n }: { x: number; z: number; color: string; n: number }) {
  return (
    <group position={[x, 0, z]}>
      {Array.from({ length: n }, (_, i) => (
        <mesh key={i} position={[Math.sin(i * 2.1) * 0.004, 0.009 + i * 0.017, Math.cos(i * 1.7) * 0.004]} castShadow receiveShadow>
          <cylinderGeometry args={[0.07, 0.07, 0.016, 32]} />
          <meshStandardMaterial color={color} roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

export function RouletteWheel3D({ motion }: { motion: MutableRefObject<WheelMotion> }) {
  const felt = useMemo(feltTexture, []);
  const wood = useMemo(woodTexture, []);
  return (
    <group>
      {/* 台のフェルトと木のふち */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.021, 0]} receiveShadow>
        <planeGeometry args={[6, 4]} />
        <meshStandardMaterial map={felt} roughness={0.95} />
      </mesh>
      <mesh position={[0, -0.04, 1.32]} castShadow receiveShadow>
        <boxGeometry args={[6, 0.1, 0.18]} />
        <meshPhysicalMaterial map={wood} color="#7a4523" roughness={0.3} clearcoat={0.8} />
      </mesh>
      <Bowl />
      <Rotor motion={motion} />
      <Ball motion={motion} />
      <ChipPile x={1.55} z={0.35} color="#c62828" n={9} />
      <ChipPile x={1.72} z={0.15} color="#1f5fbf" n={6} />
      <ChipPile x={1.5} z={-0.05} color="#1c1c1c" n={4} />
      <ChipPile x={-1.6} z={0.25} color="#f4f1ea" n={7} />
      <ChipPile x={-1.45} z={0.5} color="#c9a03c" n={3} />
    </group>
  );
}
