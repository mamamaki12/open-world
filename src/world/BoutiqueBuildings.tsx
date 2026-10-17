import { VenueExteriorDetail } from './VenueDetail';
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
  return <group name="boutiques">{BOUTIQUE_IDS.map((id) => <VenueExteriorDetail key={id} kind={id}><Exterior id={id} /></VenueExteriorDetail>)}</group>;
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
    <BoutiqueDecor id={id} />
    {lux && [-2, 0, 2].map((z) => <mesh key={z} position={[0, 3.4, z]}><cylinderGeometry args={[0.35, 0.35, 0.05, 24]} /><meshStandardMaterial color="#fff4d6" emissive="#ffe9b0" emissiveIntensity={0.8} /></mesh>)}
  </>;
}

const DECOR: Record<BoutiqueId, { rug: string; shelf: string; light: 'disk' | 'globe' | 'track' | 'panel'; plant: boolean }> = {
  maison: { rug: '#2a2326', shelf: '#1b1a1c', light: 'disk', plant: true },
  atelier: { rug: '#8a7a64', shelf: '#7a5d43', light: 'globe', plant: true },
  urban: { rug: '#3b4a52', shelf: '#41484c', light: 'track', plant: false },
  daily: { rug: '#e9e6df', shelf: '#f5f5f2', light: 'panel', plant: false },
};

/** たたんだ服の山（色ちがいを重ねる） */
function Stack({ x, y, z, colors, n = 3 }: { x: number; y: number; z: number; colors: string[]; n?: number }) {
  return <>{Array.from({ length: n }, (_, i) => <mesh key={i} position={[x, y + 0.035 + i * 0.07, z]}><boxGeometry args={[0.34, 0.065, 0.28]} /><meshStandardMaterial color={colors[(i + Math.round(x * 7 + z * 3)) % colors.length]} roughness={0.95} /></mesh>)}</>;
}

/** 靴（左右ひと組） */
function Shoes({ x, y, z, c }: { x: number; y: number; z: number; c: string }) {
  return <>{[-1, 1].map((s) => <group key={s} position={[x + s * 0.07, y, z]}>
    <mesh position={[0, 0.03, 0]}><boxGeometry args={[0.1, 0.06, 0.26]} /><meshStandardMaterial color={c} roughness={0.5} /></mesh>
    <mesh position={[0, 0.075, -0.06]}><boxGeometry args={[0.09, 0.05, 0.12]} /><meshStandardMaterial color={c} roughness={0.5} /></mesh>
    <mesh position={[0, 0.005, 0]}><boxGeometry args={[0.105, 0.012, 0.27]} /><meshStandardMaterial color="#f1efe8" /></mesh>
  </group>)}</>;
}

/** 鉢植えの観葉植物 */
export function Plant({ x, z, h = 1.2, pot = '#e8e4da' }: { x: number; z: number; h?: number; pot?: string }) {
  return <group position={[x, 0, z]}>
    <mesh position={[0, 0.2, 0]} castShadow><cylinderGeometry args={[0.22, 0.17, 0.4, 20]} /><meshStandardMaterial color={pot} roughness={0.6} /></mesh>
    <mesh position={[0, 0.4 + h * 0.2, 0]}><cylinderGeometry args={[0.02, 0.025, h * 0.4, 6]} /><meshStandardMaterial color="#5d4630" /></mesh>
    {[0, 1, 2, 3, 4].map((i) => <mesh key={i} position={[Math.cos(i * 1.3) * 0.16, 0.4 + h * (0.42 + (i % 3) * 0.16), Math.sin(i * 1.3) * 0.16]} castShadow><sphereGeometry args={[0.2 + (i % 2) * 0.06, 10, 8]} /><meshStandardMaterial color={i % 2 ? '#3f7a45' : '#2f6a3a'} roughness={0.9} /></mesh>)}
  </group>;
}

/** 壁の棚・靴棚・小物ケース・ラグ・照明・ロゴ壁。通路をふさがない壁ぎわと天井に足す */
function BoutiqueDecor({ id }: { id: BoutiqueId }) {
  const info = BOUTIQUE_INFO[id], dec = DECOR[id], items = garmentsOf(id), h = info.height;
  const colors = items.map((g) => g.color);
  const shoes = items.filter((g) => g.slot === 'shoes').map((g) => g.color);
  const shoeColors = shoes.length ? shoes : ['#2b2b2b', '#e9e5dc', '#7a4a2a'];
  const sign = useMemo(() => signTexture(id), [id]);
  useEffect(() => () => sign.dispose(), [sign]);
  const lux = id === 'maison';
  const ceil = Math.min(h, 4.2) - 0.1;
  return <>
    {/* 床のラグ（中央の平台の下） */}
    <mesh position={[0, 0.012, -0.4]} rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[3.2, 2.4]} /><meshStandardMaterial color={dec.rug} roughness={1} /></mesh>
    {/* 左右の壁の棚：下の段にたたんだ服、上の段に靴 */}
    {[-1, 1].map((s) => <group key={s} position={[s * 4.48, 0, 0.6]}>
      {[2.0, 2.6].map((y) => <Block key={y} p={[0, y, 0]} s={[0.32, 0.04, 4.4]} c={dec.shelf} />)}
      {[-2.2, 2.2].map((z) => <Block key={z} p={[0, 2.3, z]} s={[0.32, 0.64, 0.04]} c={dec.shelf} />)}
      {[-1.6, -0.8, 0, 0.8, 1.6].map((z, i) => <group key={z}>
        <Stack x={0} y={2.02} z={z} colors={colors} n={lux ? 2 : 3} />
        <group rotation-y={s * Math.PI / 2}><Shoes x={-z * s} y={2.62} z={0} c={shoeColors[i % shoeColors.length]} /></group>
      </group>)}
    </group>)}
    {/* 小物のガラスケース（レジと平台のあいだ・右寄り） */}
    <group position={[1.3, 0, 1.9]}>
      <Block p={[0, 0.4, 0]} s={[1.0, 0.8, 0.5]} c={dec.shelf} />
      <mesh position={[0, 1.02, 0]}><boxGeometry args={[1.0, 0.44, 0.5]} /><meshPhysicalMaterial color="#d8ecf2" transparent opacity={0.22} roughness={0.05} depthWrite={false} /></mesh>
      {[-0.3, 0, 0.3].map((x, i) => <mesh key={x} position={[x, 0.86, 0]}>{i === 1 ? <torusGeometry args={[0.07, 0.018, 8, 20]} /> : <boxGeometry args={[0.18, 0.1, 0.12]} />}<meshStandardMaterial color={i === 1 ? '#d4af37' : colors[i % colors.length]} metalness={i === 1 ? 0.9 : 0} roughness={0.35} /></mesh>)}
    </group>
    {/* 奥の壁のロゴ（レジの上） */}
    <mesh position={[-1.4, 2.55, 4.28]} rotation-y={Math.PI}><planeGeometry args={[2.8, 0.7]} /><meshBasicMaterial map={sign} toneMapped={false} /></mesh>
    {/* レジ横の紙袋 */}
    {[0, 1].map((i) => <group key={i} position={[-3.3 + i * 0.32, 0, 3.55]}>
      <Block p={[0, 0.2, 0]} s={[0.28, 0.4, 0.14]} c={lux ? '#1b1a1c' : info.sign} />
      <mesh position={[0, 0.44, 0]}><torusGeometry args={[0.07, 0.008, 6, 16, Math.PI]} /><meshStandardMaterial color={info.signText} /></mesh>
    </group>)}
    {/* 入口わきの植物 */}
    {dec.plant && [-1, 1].map((s) => <Plant key={s} x={s * 4.25} z={-2.65} h={1.1} pot={lux ? '#1b1a1c' : '#d9cdb8'} />)}
    {/* 天井の照明（店ごとに形を変える） */}
    {dec.light === 'globe' && [-1.6, 1.6].flatMap((x) => [-1, 1.4].map((z) => <group key={x + ',' + z} position={[x, ceil, z]}>
      <mesh position={[0, -0.5, 0]}><cylinderGeometry args={[0.006, 0.006, 1, 4]} /><meshBasicMaterial color="#333" /></mesh>
      <mesh position={[0, -1.05, 0]}><sphereGeometry args={[0.16, 16, 12]} /><meshStandardMaterial color="#fff3dc" emissive="#ffdca0" emissiveIntensity={1.2} /></mesh>
    </group>))}
    {dec.light === 'track' && [-1.8, 1.8].map((x) => <group key={x} position={[x, ceil, 0.6]}>
      <Block p={[0, 0, 0]} s={[0.06, 0.05, 5]} c="#1d2124" />
      {[-2, -1, 0, 1, 2].map((z) => <mesh key={z} position={[x > 0 ? 0.08 : -0.08, -0.12, z]} rotation-z={x > 0 ? 0.6 : -0.6}><cylinderGeometry args={[0.06, 0.08, 0.2, 12]} /><meshStandardMaterial color="#1d2124" emissive="#fff6e0" emissiveIntensity={0.15} /></mesh>)}
    </group>)}
    {dec.light === 'panel' && [-1.5, 1.5].flatMap((x) => [-1.6, 1.6].map((z) => <mesh key={x + ',' + z} position={[x, ceil, z]} rotation-x={Math.PI / 2}><planeGeometry args={[1.2, 0.6]} /><meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.9} side={THREE.DoubleSide} /></mesh>))}
    {dec.light === 'disk' && <mesh position={[0, ceil - 0.6, -0.4]}><torusGeometry args={[0.6, 0.03, 8, 40]} /><meshStandardMaterial color="#d9bd7a" metalness={0.9} roughness={0.2} emissive="#5a4520" /></mesh>}
    {lux && <Block p={[0, 0.84 + 0.01, -0.4]} s={[1.84, 0.02, 1.14]} c="#d9bd7a" metal={0.8} rough={0.25} />}
  </>;
}
