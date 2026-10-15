// 窓・ドアの建具。親（壁）のローカル座標で、X = 壁の長さ方向、Z = 厚み方向
import { useRef } from 'react';
import type { ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getOpening } from '../../catalog';
import type { OpeningPart } from '../../building/types';
import { glassMaterial, plainMaterial } from '../materials';
import type { Highlight } from '../materials';
import { useDoors } from '../../state/doors';
import { useGame } from '../../state/store';
import { usePart } from './usePart';

const FRAME = 0.045;
const DEPTH = 0.08;

function Box({ size, pos, color, highlight, metal = false }: {
  size: [number, number, number];
  pos: [number, number, number];
  color: string;
  highlight: Highlight;
  metal?: boolean;
}) {
  return (
    <mesh position={pos} castShadow receiveShadow material={plainMaterial(color, highlight, metal ? { roughness: 0.35, metalness: 0.6 } : { roughness: 0.55 })}>
      <boxGeometry args={size} />
    </mesh>
  );
}

function Glass({ w, h, pos }: { w: number; h: number; pos: [number, number, number] }) {
  return (
    <mesh position={pos} material={glassMaterial()}>
      <boxGeometry args={[w, h, 0.008]} />
    </mesh>
  );
}

/** 開口の内側に沿った四角い枠 */
function Frame({ w, h, color, highlight, depth = DEPTH, z = 0, bottom = true }: {
  w: number;
  h: number;
  color: string;
  highlight: Highlight;
  depth?: number;
  z?: number;
  bottom?: boolean;
}) {
  return (
    <>
      <Box size={[w, FRAME, depth]} pos={[0, h - FRAME / 2, z]} color={color} highlight={highlight} metal />
      {bottom && <Box size={[w, FRAME, depth]} pos={[0, FRAME / 2, z]} color={color} highlight={highlight} metal />}
      <Box size={[FRAME, h, depth]} pos={[-w / 2 + FRAME / 2, h / 2, z]} color={color} highlight={highlight} metal />
      <Box size={[FRAME, h, depth]} pos={[w / 2 - FRAME / 2, h / 2, z]} color={color} highlight={highlight} metal />
    </>
  );
}

/** 引き違いの障子1枚 */
function Sash({ w, h, x, z, color, highlight }: { w: number; h: number; x: number; z: number; color: string; highlight: Highlight }) {
  const f = 0.035;
  return (
    <group position={[x, 0, z]}>
      <Box size={[w, f, 0.03]} pos={[0, h - f / 2, 0]} color={color} highlight={highlight} metal />
      <Box size={[w, f, 0.03]} pos={[0, f / 2, 0]} color={color} highlight={highlight} metal />
      <Box size={[f, h, 0.03]} pos={[-w / 2 + f / 2, h / 2, 0]} color={color} highlight={highlight} metal />
      <Box size={[f, h, 0.03]} pos={[w / 2 - f / 2, h / 2, 0]} color={color} highlight={highlight} metal />
      <Glass w={w - f * 2} h={h - f * 2} pos={[0, h / 2, 0]} />
    </group>
  );
}

const OPEN_SECONDS = 0.6;
const SWING_ANGLE = Math.PI * 0.5;

/** 0..1 をなめらかに（動き出しと止まりをゆっくり） */
const ease = (t: number) => t * t * (3 - 2 * t);

/** 扉の動き：swing = 蝶番で回る、slide = 横にすべる。null なら動かない（親子ドアの子扉など） */
type Motion = { id: string; kind: 'swing' } | { id: string; kind: 'slide'; distance: number } | null;

/** ドアの扉（パネル＋取っ手、縦長のガラススリットつきも）。歩きモードで開いたドアは動かす */
function DoorLeaf({ w, h, x, color, handleSide, slit, highlight, motion = null }: {
  w: number;
  h: number;
  x: number;
  color: string;
  handleSide: 1 | -1;
  slit: boolean;
  highlight: Highlight;
  motion?: Motion;
}) {
  const mover = useRef<THREE.Group>(null);
  const progress = useRef(0);
  useFrame((_, dt) => {
    if (!motion || !mover.current) return;
    const dir = useDoors.getState().open[motion.id];
    const goal = dir !== undefined && useGame.getState().mode === 'walk' ? 1 : 0;
    const step = Math.min(dt, 0.1) / OPEN_SECONDS;
    progress.current = goal > progress.current ? Math.min(goal, progress.current + step) : Math.max(goal, progress.current - step);
    const e = ease(progress.current);
    if (motion.kind === 'swing') {
      // プレイヤーから遠ざかる向きに開く。閉じる途中も最後に開いた向きを使う
      if (dir !== undefined) mover.current.userData.dir = dir;
      const d = (mover.current.userData.dir as number | undefined) ?? 1;
      // d は扉が向かう側（壁のローカル +Z なら 1）。+Z 側へ振るには負の回転
      mover.current.rotation.y = -e * SWING_ANGLE * d * handleSide;
    } else {
      mover.current.position.x = x + e * motion.distance;
    }
  });
  const hingeX = x - (handleSide * w) / 2;
  const leaf = <DoorPanel w={w} h={h} color={color} handleSide={handleSide} slit={slit} highlight={highlight} />;
  if (motion?.kind === 'swing') {
    return (
      <group ref={mover} position={[hingeX, 0, 0]}>
        <group position={[(handleSide * w) / 2, 0, 0]}>{leaf}</group>
      </group>
    );
  }
  return (
    <group ref={mover} position={[x, 0, 0]}>
      {leaf}
    </group>
  );
}

function DoorPanel({ w, h, color, handleSide, slit, highlight }: {
  w: number;
  h: number;
  color: string;
  handleSide: 1 | -1;
  slit: boolean;
  highlight: Highlight;
}) {
  const t = 0.045;
  const children: ReactNode[] = [];
  if (slit) {
    children.push(<Glass key="g" w={0.1} h={h * 0.8} pos={[-handleSide * w * 0.25, h / 2, 0.025]} />);
    children.push(<Glass key="g2" w={0.1} h={h * 0.8} pos={[-handleSide * w * 0.25, h / 2, -0.025]} />);
  }
  return (
    <group>
      <Box size={[w, h, t]} pos={[0, h / 2, 0]} color={color} highlight={highlight} />
      {children}
      <Box size={[0.025, slit ? 0.9 : 0.12, 0.04]} pos={[handleSide * (w / 2 - 0.08), 1.0, 0.045]} color="#9a9ea3" highlight={highlight} metal />
      <Box size={[0.025, slit ? 0.9 : 0.12, 0.04]} pos={[handleSide * (w / 2 - 0.08), 1.0, -0.045]} color="#9a9ea3" highlight={highlight} metal />
    </group>
  );
}

export function Opening({ opening }: { opening: OpeningPart }) {
  const { highlight: partHighlight, handlers } = usePart({ kind: 'opening', id: opening.id });
  const targeted = useDoors((s) => s.target === opening.id);
  const walking = useGame((s) => s.mode === 'walk');
  const focused = targeted && walking;
  const highlight: Highlight = focused ? 'focus' : partHighlight;
  const def = getOpening(opening.type);
  const swing: Motion = { id: opening.id, kind: 'swing' };
  const { width: w, height: h } = def;
  const sash = opening.sashColor;
  const panel = opening.panelColor;
  const inner = w - FRAME * 2;
  const innerH = h - FRAME * 2;

  let body: ReactNode;
  switch (def.style) {
    case 'slidingWindow': {
      const sw = inner / 2 + 0.03;
      body = (
        <>
          <Frame w={w} h={h} color={sash} highlight={highlight} />
          <group position={[0, FRAME, 0]}>
            <Sash w={sw} h={innerH} x={-inner / 4 + 0.015} z={0.02} color={sash} highlight={highlight} />
            <Sash w={sw} h={innerH} x={inner / 4 - 0.015} z={-0.02} color={sash} highlight={highlight} />
          </group>
        </>
      );
      break;
    }
    case 'casement':
    case 'fix':
      body = (
        <>
          <Frame w={w} h={h} color={sash} highlight={highlight} />
          <Glass w={inner} h={innerH} pos={[0, h / 2, 0]} />
          {def.style === 'casement' && (
            <Box size={[0.02, 0.12, 0.03]} pos={[inner / 2 - 0.05, h / 2, -0.05]} color="#9a9ea3" highlight={highlight} metal />
          )}
        </>
      );
      break;
    case 'entrance':
      body = (
        <>
          <Frame w={w} h={h} color={sash} highlight={highlight} bottom={false} />
          <DoorLeaf w={inner} h={h - FRAME} x={0} color={panel} handleSide={1} slit highlight={highlight} motion={swing} />
        </>
      );
      break;
    case 'entranceDouble': {
      const main = inner * 0.7;
      const sub = inner - main;
      body = (
        <>
          <Frame w={w} h={h} color={sash} highlight={highlight} bottom={false} />
          <DoorLeaf w={main} h={h - FRAME} x={-inner / 2 + main / 2} color={panel} handleSide={1} slit highlight={highlight} motion={swing} />
          <DoorLeaf w={sub - 0.005} h={h - FRAME} x={inner / 2 - sub / 2} color={panel} handleSide={-1} slit={false} highlight={highlight} />
        </>
      );
      break;
    }
    case 'swing':
      body = (
        <>
          <Frame w={w} h={h} color={panel} highlight={highlight} bottom={false} depth={0.16} />
          <DoorLeaf w={inner} h={h - FRAME} x={0} color={panel} handleSide={1} slit={false} highlight={highlight} motion={swing} />
        </>
      );
      break;
    case 'sliding': {
      const lw = inner / 2 + 0.02;
      body = (
        <>
          <Frame w={w} h={h} color={panel} highlight={highlight} bottom={false} depth={0.16} />
          <group position={[0, 0, 0.025]}>
            <DoorLeaf
              w={lw}
              h={h - FRAME}
              x={-inner / 4}
              color={panel}
              handleSide={1}
              slit={false}
              highlight={highlight}
              motion={{ id: opening.id, kind: 'slide', distance: inner / 2 - 0.02 }}
            />
          </group>
          <group position={[0, 0, -0.025]}>
            <DoorLeaf w={lw} h={h - FRAME} x={inner / 4} color={panel} handleSide={-1} slit={false} highlight={highlight} />
          </group>
        </>
      );
      break;
    }
  }

  return (
    <group position={[opening.offset, def.sill, 0]} {...handlers}>
      {body}
      {focused && <FocusGlow width={w} />}
    </group>
  );
}

/** 操作できるドアの足もとで、ゆっくり明滅する光の輪 */
function FocusGlow({ width }: { width: number }) {
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(({ clock }) => {
    if (mat.current) mat.current.opacity = 0.35 + Math.sin(clock.elapsedTime * 4) * 0.2;
  });
  return (
    <mesh position={[0, 0.015, 0]} rotation-x={-Math.PI / 2} scale={[width * 0.9, 1.1, 1]}>
      <ringGeometry args={[0.42, 0.5, 48]} />
      <meshBasicMaterial ref={mat} color="#ffb347" transparent opacity={0.4} depthWrite={false} />
    </mesh>
  );
}
