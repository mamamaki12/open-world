// 服屋さん4店舗の外観と売り場。正面は大きなショーウィンドウで、中のマネキンが通りから見える
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { BOUTIQUES, BOUTIQUE_DOOR, BOUTIQUE_IDS, BOUTIQUE_INFO } from '../building/boutiques';
import type { BoutiqueId } from '../building/boutiques';
import { garmentsOf } from '../catalog/clothes';
import type { Outfit, Slot } from '../catalog/clothes';
import { VENUE_WALL } from '../building/venues';
import { VenueDoor } from './VenueShell';
import { AvatarModel, useRig } from './Avatar';

function Block({ p, s, c, rough = 0.7, metal = 0 }: { p: [number, number, number]; s: [number, number, number]; c: string; rough?: number; metal?: number }) {
  return <mesh position={p} castShadow receiveShadow><boxGeometry args={s} /><meshStandardMaterial color={c} roughness={rough} metalness={metal} /></mesh>;
}

function signTexture(id: BoutiqueId) {
  const info = BOUTIQUE_INFO[id];
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 256;
  const g = canvas.getContext('2d')!;
  g.fillStyle = info.sign; g.fillRect(0, 0, 1024, 256);
  g.textAlign = 'center'; g.fillStyle = info.signText;
  g.font = id === 'maison' ? '600 96px Georgia, serif' : id === 'atelier' ? '500 92px Georgia, serif' : 'bold 104px sans-serif';
  g.fillText(info.name, 512, id === 'daily' ? 130 : 138, 960);
  g.font = '32px sans-serif'; g.fillText(info.tagline, 512, 210, 960);
  const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

/** 店のマネキン用のコーディネート：その店の服から上下・靴・帽子を選ぶ */
export function shopLook(id: BoutiqueId, n: number): Outfit {
  const items = garmentsOf(id);
  const pick = (slot: Slot) => { const s = items.filter((g) => g.slot === slot); return s.length ? s[n % s.length].id : null; };
  return { top: pick('top'), bottom: pick('bottom'), shoes: pick('shoes'), hat: n % 2 ? pick('hat') : null };
}

function Mannequin({ outfit, x, z, yaw = 0 }: { outfit: Outfit; x: number; z: number; yaw?: number }) {
  const rig = useRig();
  return <group position={[x, 0.3, z]} rotation-y={yaw}><AvatarModel rig={rig} outfit={outfit} mannequin /></group>;
}

/** 正面：入口の左右に大きなガラス窓。壁は箱で作り、中からも外からも見える */
function Front({ id }: { id: BoutiqueId }) {
  const b = BOUTIQUES[id], info = BOUTIQUE_INFO[id], h = info.height, cx = (b.x0 + b.x1) / 2, z = b.z0 + VENUE_WALL / 2;
  const half = BOUTIQUE_DOOR.width / 2, sill = 0.45, head = 3.0;
  const pier = 0.5, winW = (b.x1 - b.x0) / 2 - half - pier - 0.35;
  return <>
    {/* 両端の柱・入口わきの柱・窓の下の腰壁・窓より上の壁 */}
    {[-1, 1].map((s) => <group key={s}>
      <Block p={[cx + s * ((b.x1 - b.x0) / 2 - pier / 2), h / 2, z]} s={[pier, h, VENUE_WALL]} c={info.facade} />
      <Block p={[cx + s * (half + 0.175), h / 2, z]} s={[0.35, h, VENUE_WALL]} c={info.facade} />
      <Block p={[cx + s * (half + 0.35 + winW / 2), sill / 2, z]} s={[winW, sill, VENUE_WALL]} c={info.facade} />
      <mesh position={[cx + s * (half + 0.35 + winW / 2), (sill + head) / 2, z]}>
        <boxGeometry args={[winW, head - sill, 0.03]} />
        <meshPhysicalMaterial color="#bcd6de" transparent opacity={0.18} roughness={0.05} depthWrite={false} />
      </mesh>
    </group>)}
    <Block p={[cx + 0, (head + h) / 2, z]} s={[b.x1 - b.x0 - 2 * pier, h - head, VENUE_WALL]} c={info.facade} />
    {/* 入口の上（ドアより上で窓の高さまで） */}
    <Block p={[cx, (BOUTIQUE_DOOR.height + head) / 2, z]} s={[BOUTIQUE_DOOR.width, head - BOUTIQUE_DOOR.height, VENUE_WALL]} c={info.facade} />
  </>;
}

function Exterior({ id }: { id: BoutiqueId }) {
  const b = BOUTIQUES[id], info = BOUTIQUE_INFO[id], w = b.x1 - b.x0, d = b.z1 - b.z0, cx = (b.x0 + b.x1) / 2;
  const sign = useMemo(() => signTexture(id), [id]);
  useEffect(() => () => sign.dispose(), [sign]);
  const body = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ color: info.facade, roughness: 0.75 }), none = new THREE.MeshBasicMaterial({ visible: false });
    return [m, m, m, m, m, none];
  }, [info.facade]);
  useEffect(() => () => body.forEach((m) => m.dispose()), [body]);
  return <group>
    <mesh position={[cx, info.height / 2, (b.z0 + b.z1) / 2]} material={body} castShadow receiveShadow><boxGeometry args={[w, info.height, d]} /></mesh>
    <Front id={id} />
    <VenueDoor kind={id} frame={info.frame} />
    {/* 看板 */}
    <mesh position={[cx, 3.0 + (info.height - 3.0) / 2 + 0.05, b.z0 - 0.02]} rotation-y={Math.PI}>
      <planeGeometry args={[w - 1.4, Math.min(1.5, info.height - 3.3)]} />
      <meshStandardMaterial map={sign} emissiveMap={sign} emissive="#ffffff" emissiveIntensity={0.3} />
    </mesh>
    {/* 店ごとの入口まわり：高級店は金の縁と赤じゅうたん、デザイナーズは木のひさし、カジュアルとファストは布のテント */}
    {id === 'maison' && <>
      <Block p={[cx, 3.02, b.z0 - 0.05]} s={[w - 0.8, 0.06, 0.1]} c="#b89a5a" metal={0.8} rough={0.3} />
      <Block p={[cx, 0.012, b.z0 - 1.4]} s={[2.4, 0.02, 2.6]} c="#6d1f2a" />
      {[-1, 1].map((s) => <group key={s} position={[cx + s * 1.7, 0, b.z0 - 0.6]}>
        <mesh position={[0, 0.35, 0]} castShadow><cylinderGeometry args={[0.28, 0.22, 0.7, 20]} /><meshStandardMaterial color="#1b1a1c" roughness={0.3} /></mesh>
        <mesh position={[0, 0.95, 0]} castShadow><sphereGeometry args={[0.36, 18, 14]} /><meshStandardMaterial color="#2f5a3a" roughness={0.9} /></mesh>
      </group>)}
    </>}
    {id === 'atelier' && <Block p={[cx, 3.0, b.z0 - 0.6]} s={[w - 1, 0.12, 1.2]} c="#6e5640" />}
    {(id === 'urban' || id === 'daily') && <mesh position={[cx, 3.0, b.z0 - 0.7]} rotation-x={-0.35} castShadow>
      <boxGeometry args={[w - 1, 0.06, 1.5]} /><meshStandardMaterial color={id === 'daily' ? '#d6332f' : '#2f6d8e'} roughness={0.9} />
    </mesh>}
    <Block p={[cx, 0.006, b.z0 - 1.6]} s={[w + 1, 0.012, 3.2]} c="#cfcabd" />
  </group>;
}

/** 町の南の通りに並ぶ4店舗（civic site 基準） */
export function BoutiqueBuildings() {
  return <group name="boutiques">{BOUTIQUE_IDS.map((id) => <Exterior key={id} id={id} />)}</group>;
}

/** ハンガーにかかった服（ラックの横棒にそって並べる） */
function Hanging({ colors, along, z0, len }: { colors: string[]; along: 'x' | 'z'; z0: number; len: number }) {
  const n = Math.max(6, colors.length * 2);
  return <>{Array.from({ length: n }, (_, i) => {
    const t = -len / 2 + (i + 0.5) * (len / n);
    const pos: [number, number, number] = along === 'z' ? [z0, 1.15, t] : [t, 1.15, z0];
    return <mesh key={i} position={pos} rotation-y={along === 'z' ? Math.PI / 2 : 0} castShadow>
      <boxGeometry args={[0.48, 0.66, 0.05]} /><meshStandardMaterial color={colors[i % colors.length]} roughness={0.95} />
    </mesh>;
  })}</>;
}

/** 店内（店の中央が原点）。左右の壁ぎわにラック、中央に平台、奥にレジ・試着室・鏡 */
export function BoutiqueInterior({ id }: { id: BoutiqueId }) {
  const info = BOUTIQUE_INFO[id], items = garmentsOf(id), d = BOUTIQUES[id].z1 - BOUTIQUES[id].z0;
  const tops = items.filter((g) => g.slot === 'top').map((g) => g.color), bottoms = items.filter((g) => g.slot !== 'top').map((g) => g.color);
  const lux = id === 'maison';
  const metal = lux ? '#b89a5a' : id === 'atelier' ? '#4a3a2b' : '#7d8589';
  return <>
    {/* ラック（左右） */}
    {[-1, 1].map((s) => <group key={s} position={[s * 3.9, 0, 0.6]}>
      <Block p={[0, 1.55, 0]} s={[0.04, 0.04, 4.8]} c={metal} metal={0.8} rough={0.3} />
      {[-2.4, 2.4].map((z) => <Block key={z} p={[0, 0.78, z]} s={[0.05, 1.56, 0.05]} c={metal} metal={0.8} rough={0.3} />)}
      <Hanging colors={s < 0 ? tops : bottoms.length ? bottoms : tops} along="z" z0={0} len={lux ? 3.2 : 4.4} />
    </group>)}
    {/* 中央の平台：たたんだ服を積む */}
    <Block p={[0, 0.42, -0.4]} s={[1.8, 0.84, 1.1]} c={lux ? '#1b1a1c' : id === 'atelier' ? '#b99a76' : '#f2f0ea'} />
    {items.slice(0, lux ? 3 : 6).map((g, i) => <Block key={g.id} p={[-0.6 + (i % 3) * 0.6, 0.9 + Math.floor(i / 3) * 0.001, -0.65 + Math.floor(i / 3) * 0.5]} s={[0.42, 0.1 + (lux ? 0 : 0.06), 0.34]} c={g.color} rough={0.95} />)}
    {/* レジ */}
    <Block p={[-1.4, 0.5, 3.75]} s={[3, 1, 0.8]} c={lux ? '#1b1a1c' : info.trim} />
    <Block p={[-1.4, 1.03, 3.75]} s={[3.1, 0.06, 0.9]} c={lux ? '#d9bd7a' : '#f4f2ec'} metal={lux ? 0.7 : 0} />
    <Block p={[-0.6, 1.2, 3.85]} s={[0.4, 0.28, 0.06]} c="#25313a" />
    {/* 試着室：カーテンのボックスと鏡 */}
    <group position={[3.35, 0, 3.6]}>
      <Block p={[0, 2.25, 0]} s={[2, 0.1, 1.1]} c={info.trim} />
      {[-1, 1].map((s) => <Block key={s} p={[s * 0.98, 1.1, 0]} s={[0.04, 2.2, 1.1]} c={info.wall} />)}
      <mesh position={[0, 1.15, -0.52]}><boxGeometry args={[1.9, 2.1, 0.03]} /><meshStandardMaterial color={lux ? '#6d1f2a' : id === 'daily' ? '#d6332f' : '#c9b48f'} roughness={1} /></mesh>
    </group>
    <mesh position={[1.6, 1.1, d / 2 - 0.2]} rotation-y={Math.PI}><planeGeometry args={[0.8, 1.9]} /><meshStandardMaterial color="#dfe8ec" metalness={0.9} roughness={0.05} /></mesh>
    {/* ショーウィンドウの台とマネキン（通りの方を向く） */}
    {[-1, 1].map((s, i) => <group key={s}>
      <Block p={[s * 3.3, 0.15, -3.8]} s={[2.4, 0.3, 0.9]} c={lux ? '#1b1a1c' : info.wall} />
      <Mannequin outfit={shopLook(id, i * 2)} x={s * 3.8} z={-3.8} yaw={0} />
      <Mannequin outfit={shopLook(id, i * 2 + 1)} x={s * 2.8} z={-3.8} yaw={s * 0.3} />
    </group>)}
    {lux && [-2, 0, 2].map((z) => <mesh key={z} position={[0, 3.4, z]}><cylinderGeometry args={[0.35, 0.35, 0.05, 24]} /><meshStandardMaterial color="#fff4d6" emissive="#ffe9b0" emissiveIntensity={0.8} /></mesh>)}
  </>;
}
