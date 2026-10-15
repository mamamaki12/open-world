// 窓・ドアの建具。親（壁）のローカル座標で、X = 壁の長さ方向、Z = 厚み方向
import { createContext, useContext, useRef } from 'react';
import type { ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getOpening, getSashType } from '../../catalog';
import type { SashTypeDef } from '../../catalog';
import type { OpeningPart } from '../../building/types';
import { finishMaterial, glassMaterial, plainMaterial } from '../materials';
import type { Highlight } from '../materials';
import { useDoors } from '../../state/doors';
import { useGame } from '../../state/store';
import { usePart } from './usePart';

const FRAME = 0.045;
const DEPTH = 0.08;

/** 枠と障子の質感（サッシの種類で変わる） */
const SashLook = createContext<SashTypeDef>(getSashType(undefined));

function Box({ size, pos, color, highlight, metal = false, sash = false }: {
  size: [number, number, number];
  pos: [number, number, number];
  color: string;
  highlight: Highlight;
  metal?: boolean;
  /** サッシの種類の質感を使う */
  sash?: boolean;
}) {
  const look = useContext(SashLook);
  const material = sash
    ? look.material
      ? finishMaterial({ material: look.material, color }, highlight)
      : plainMaterial(color, highlight, { roughness: look.roughness, metalness: look.metalness })
    : plainMaterial(color, highlight, metal ? { roughness: 0.35, metalness: 0.6 } : { roughness: 0.55 });
  return (
    <mesh position={pos} castShadow receiveShadow material={material}>
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
      <Box size={[w, FRAME, depth]} pos={[0, h - FRAME / 2, z]} color={color} highlight={highlight} sash />
      {bottom && <Box size={[w, FRAME, depth]} pos={[0, FRAME / 2, z]} color={color} highlight={highlight} sash />}
      <Box size={[FRAME, h, depth]} pos={[-w / 2 + FRAME / 2, h / 2, z]} color={color} highlight={highlight} sash />
      <Box size={[FRAME, h, depth]} pos={[w / 2 - FRAME / 2, h / 2, z]} color={color} highlight={highlight} sash />
    </>
  );
}

/** 引き違いの障子1枚 */
function Sash({ w, h, x, z, color, highlight }: { w: number; h: number; x: number; z: number; color: string; highlight: Highlight }) {
  const f = 0.035;
  return (
    <group position={[x, 0, z]}>
      <Box size={[w, f, 0.03]} pos={[0, h - f / 2, 0]} color={color} highlight={highlight} sash />
      <Box size={[w, f, 0.03]} pos={[0, f / 2, 0]} color={color} highlight={highlight} sash />
      <Box size={[f, h, 0.03]} pos={[-w / 2 + f / 2, h / 2, 0]} color={color} highlight={highlight} sash />
      <Box size={[f, h, 0.03]} pos={[w / 2 - f / 2, h / 2, 0]} color={color} highlight={highlight} sash />
      <Glass w={w - f * 2} h={h - f * 2} pos={[0, h / 2, 0]} />
    </group>
  );
}

const OPEN_SECONDS = 0.6;
const SWING_ANGLE = Math.PI * 0.5;
const CASEMENT_ANGLE = Math.PI * 0.36;

/** 0..1 をなめらかに（動き出しと止まりをゆっくり） */
const ease = (t: number) => t * t * (3 - 2 * t);

/**
 * 建具の動き。null なら動かない（親子ドアの子扉など）
 * - swing：蝶番で回る（プレイヤーから遠ざかる側へ）
 * - slide：横にすべる（引き戸・引き違い窓）
 * - outward：外へ押し出して開く（すべり出し窓）。outside は外側（ローカル +Z なら 1）
 */
type Motion =
  | { id: string; kind: 'swing' }
  | { id: string; kind: 'slide'; distance: number }
  | { id: string; kind: 'outward'; outside: 1 | -1 }
  | null;

/** 歩きモードで開いた建具を、毎フレーム開いた位置・角度へ近づける */
function useOpenAnimation(motion: Motion, baseX: number, hingeSide: 1 | -1) {
  const mover = useRef<THREE.Group>(null);
  const progress = useRef(0);
  useFrame((_, dt) => {
    if (!motion || !mover.current) return;
    const dir = useDoors.getState().open[motion.id];
    const goal = dir !== undefined && useGame.getState().mode === 'walk' ? 1 : 0;
    if (goal === progress.current) return;
    const step = Math.min(dt, 0.1) / OPEN_SECONDS;
    progress.current = goal > progress.current ? Math.min(goal, progress.current + step) : Math.max(goal, progress.current - step);
    const e = ease(progress.current);
    if (motion.kind === 'swing') {
      // プレイヤーから遠ざかる向きに開く。閉じる途中も最後に開いた向きを使う
      if (dir !== undefined) mover.current.userData.dir = dir;
      const d = (mover.current.userData.dir as number | undefined) ?? 1;
      // d は扉が向かう側（壁のローカル +Z なら 1）。+Z 側へ振るには負の回転
      mover.current.rotation.y = -e * SWING_ANGLE * d * hingeSide;
    } else if (motion.kind === 'outward') {
      mover.current.rotation.y = -e * CASEMENT_ANGLE * motion.outside * hingeSide;
    } else {
      mover.current.position.x = baseX + e * motion.distance;
    }
  });
  return mover;
}

/** 動く建具：回るものは蝶番の位置を軸にする（handleSide の反対側が蝶番） */
function Moving({ motion, x, w, handleSide, children }: {
  motion: Motion;
  x: number;
  w: number;
  handleSide: 1 | -1;
  children: ReactNode;
}) {
  const mover = useOpenAnimation(motion, x, handleSide);
  if (motion?.kind === 'swing' || motion?.kind === 'outward') {
    const hingeX = x - (handleSide * w) / 2;
    return (
      <group ref={mover} position={[hingeX, 0, 0]}>
        <group position={[(handleSide * w) / 2, 0, 0]}>{children}</group>
      </group>
    );
  }
  return (
    <group ref={mover} position={[x, 0, 0]}>
      {children}
    </group>
  );
}

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
  return (
    <Moving motion={motion} x={x} w={w} handleSide={handleSide}>
      <DoorPanel w={w} h={h} color={color} handleSide={handleSide} slit={slit} highlight={highlight} />
    </Moving>
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

export function Opening({ opening, outside = 1 }: { opening: OpeningPart; outside?: 1 | -1 }) {
  const { highlight: partHighlight, handlers } = usePart({ kind: 'opening', id: opening.id });
  const targeted = useDoors((s) => s.target === opening.id);
  const walking = useGame((s) => s.mode === 'walk');
  const focused = targeted && walking;
  const highlight: Highlight = focused ? 'focus' : partHighlight;
  const def = getOpening(opening.type);
  const swing: Motion = { id: opening.id, kind: 'swing' };
  const { width: w, height: h } = def;
  const sash = opening.sashColor;
  const sashLook = getSashType(opening.sash);
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
            {/* 左の障子が右へすべって、左半分が空く */}
            <Moving motion={{ id: opening.id, kind: 'slide', distance: inner / 2 - 0.03 }} x={-inner / 4 + 0.015} w={sw} handleSide={1}>
              <Sash w={sw} h={innerH} x={0} z={0.02} color={sash} highlight={highlight} />
            </Moving>
            <Sash w={sw} h={innerH} x={inner / 4 - 0.015} z={-0.02} color={sash} highlight={highlight} />
          </group>
        </>
      );
      break;
    }
    case 'casement':
      body = (
        <>
          <Frame w={w} h={h} color={sash} highlight={highlight} />
          <group position={[0, FRAME, 0]}>
            {/* 縦すべり出し：左側を軸に外へ押し出す */}
            <Moving motion={{ id: opening.id, kind: 'outward', outside }} x={0} w={inner} handleSide={1}>
              <Sash w={inner} h={innerH} x={0} z={0} color={sash} highlight={highlight} />
              <Box size={[0.02, 0.12, 0.03]} pos={[inner / 2 - 0.05, innerH / 2, -0.035 * outside]} color="#9a9ea3" highlight={highlight} metal />
            </Moving>
          </group>
        </>
      );
      break;
    case 'fix':
      body = (
        <>
          <Frame w={w} h={h} color={sash} highlight={highlight} />
          <Glass w={inner} h={innerH} pos={[0, h / 2, 0]} />
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
      <SashLook.Provider value={sashLook}>{body}</SashLook.Provider>
      {focused && <FocusGlow width={w} y={-def.sill} />}
    </group>
  );
}

/** 操作できるドア・窓の足もと（床の上）で、ゆっくり明滅する光の輪 */
function FocusGlow({ width, y }: { width: number; y: number }) {
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(({ clock }) => {
    if (mat.current) mat.current.opacity = 0.35 + Math.sin(clock.elapsedTime * 4) * 0.2;
  });
  return (
    <mesh position={[0, y + 0.015, 0]} rotation-x={-Math.PI / 2} scale={[width * 0.9, 1.1, 1]}>
      <ringGeometry args={[0.42, 0.5, 48]} />
      <meshBasicMaterial ref={mat} color="#ffb347" transparent opacity={0.4} depthWrite={false} />
    </mesh>
  );
}
