// 美容室の外観：白い外壁に木のひさし、ガラス窓、回るサインポール
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SALON, SALON_NAME } from '../building/salon';
import { VENUE_DOORS } from '../building/venues';
import { OpenFrontBox, VenueDoor } from './VenueShell';

function signTexture() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = '#f6f3ee'; g.fillRect(0, 0, 1024, 256);
  g.textAlign = 'center'; g.fillStyle = '#5a4130'; g.font = '500 92px Georgia, serif'; g.fillText(SALON_NAME, 512, 140, 960);
  g.font = '34px sans-serif'; g.fillText('CUT · COLOR · PERM', 512, 212, 960);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function poleTexture() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 64, 256);
  const colors = ['#c8262c', '#ffffff', '#1f4fa0', '#ffffff'];
  for (let i = -8; i < 16; i++) { g.fillStyle = colors[((i % 4) + 4) % 4]; g.beginPath(); g.moveTo(0, i * 32); g.lineTo(64, i * 32 - 64); g.lineTo(64, i * 32 - 32); g.lineTo(0, i * 32 + 32); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 2); return t;
}

function Pole({ x, z }: { x: number; z: number }) {
  const tex = useMemo(poleTexture, []), ref = useRef<THREE.Mesh>(null);
  useEffect(() => () => tex.dispose(), [tex]);
  useFrame((_, dt) => { tex.offset.y -= dt * 0.25; });
  return <group position={[x, 0, z]}>
    <mesh position={[0, 1.6, 0]} ref={ref}><cylinderGeometry args={[0.1, 0.1, 0.9, 20]} /><meshStandardMaterial map={tex} emissiveMap={tex} emissive="#ffffff" emissiveIntensity={0.25} /></mesh>
    {[1.12, 2.08].map((y) => <mesh key={y} position={[0, y, 0]}><cylinderGeometry args={[0.13, 0.13, 0.08, 20]} /><meshStandardMaterial color="#c9ccd0" metalness={0.8} roughness={0.25} /></mesh>)}
    <mesh position={[0, 2.2, 0]}><sphereGeometry args={[0.12, 16, 10]} /><meshStandardMaterial color="#c9ccd0" metalness={0.8} roughness={0.25} /></mesh>
    <mesh position={[0, 0.55, 0]}><cylinderGeometry args={[0.03, 0.03, 1.1, 8]} /><meshStandardMaterial color="#8a8d90" metalness={0.7} /></mesh>
  </group>;
}

export function SalonBuilding() {
  const b = SALON, d = VENUE_DOORS.salon, cx = (b.x0 + b.x1) / 2, w = b.x1 - b.x0;
  const sign = useMemo(signTexture, []);
  useEffect(() => () => sign.dispose(), [sign]);
  const winW = (w - d.width) / 2 - 1.2;
  return <group name="salon">
    <OpenFrontBox kind="salon" height={b.height} color="#f6f3ee" roughness={0.85} />
    <VenueDoor kind="salon" frame="#5a4130" />
    {/* 窓（外から店内の明かりが見える色） */}
    {[-1, 1].map((s) => <group key={s} position={[cx + s * (d.width / 2 + 0.6 + winW / 2), 0, b.z0 - 0.015]}>
      <mesh position={[0, 1.65, 0]}><planeGeometry args={[winW, 1.9]} /><meshStandardMaterial color="#d9c9a8" emissive="#f4dcae" emissiveIntensity={0.35} roughness={0.1} side={THREE.DoubleSide} /></mesh>
    </group>)}
    {/* 木のひさしと看板 */}
    <mesh position={[cx, 3.05, b.z0 - 0.55]} castShadow><boxGeometry args={[w - 0.6, 0.1, 1.1]} /><meshStandardMaterial color="#8a6545" roughness={0.8} /></mesh>
    <mesh position={[cx, 3.75, b.z0 - 0.02]} rotation-y={Math.PI}><planeGeometry args={[w - 2, 0.9]} /><meshStandardMaterial map={sign} emissiveMap={sign} emissive="#ffffff" emissiveIntensity={0.3} /></mesh>
    <Pole x={b.x0 + 0.5} z={b.z0 - 0.45} />
    <mesh position={[cx, 0.006, b.z0 - 1.6]} receiveShadow><boxGeometry args={[w + 1, 0.012, 3.2]} /><meshStandardMaterial color="#cfcabd" /></mesh>
  </group>;
}
