// カジノと不動産屋の店内の飾り（床・壁・照明・家具）。原点は各店の中央、入口は -Z。
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { Plant } from './BoutiqueBuildings';

type V3 = [number, number, number];
function Box({ p, s, c, metal = 0, rough, emissive }: { p: V3; s: V3; c: string; metal?: number; rough?: number; emissive?: string }) {
  return <mesh position={p} castShadow receiveShadow><boxGeometry args={s} /><meshStandardMaterial color={c} roughness={rough ?? (metal ? 0.28 : 0.65)} metalness={metal} emissive={emissive ?? '#000'} /></mesh>;
}
function useCanvas(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, repeat?: [number, number]) {
  const t = useMemo(() => {
    const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')!);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    if (repeat) { tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(...repeat); }
    return tex;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => t.dispose(), [t]);
  return t;
}
/** 壁に貼る看板（+Z 向き。rot で向きを変える） */
function Sign({ p, w, h, rot = 0, text, color, bg, font }: { p: V3; w: number; h: number; rot?: number; text: string; color: string; bg?: string; font: string }) {
  const t = useCanvas(1024, 256, (g) => {
    if (bg) { g.fillStyle = bg; g.fillRect(0, 0, 1024, 256); }
    g.fillStyle = color; g.shadowColor = color; g.shadowBlur = 24; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = font; g.fillText(text, 512, 132, 980);
  });
  return <mesh position={p} rotation-y={rot}><planeGeometry args={[w, h]} /><meshBasicMaterial map={t} transparent={!bg} toneMapped={false} /></mesh>;
}

const GOLD = '#c9a03c';
function Stool({ x, z }: { x: number; z: number }) {
  return <group position={[x, 0, z]}>
    <mesh position={[0, 0.4, 0]}><cylinderGeometry args={[0.03, 0.03, 0.8, 8]} /><meshStandardMaterial color={GOLD} metalness={0.85} roughness={0.3} /></mesh>
    <mesh position={[0, 0.02, 0]}><cylinderGeometry args={[0.2, 0.22, 0.04, 20]} /><meshStandardMaterial color={GOLD} metalness={0.85} roughness={0.3} /></mesh>
    <mesh position={[0, 0.82, 0]} castShadow><cylinderGeometry args={[0.2, 0.18, 0.1, 20]} /><meshStandardMaterial color="#6d1f2a" roughness={0.6} /></mesh>
  </group>;
}
function ArmChair({ x, z, rot }: { x: number; z: number; rot: number }) {
  return <group position={[x, 0, z]} rotation-y={rot}>
    <Box p={[0, 0.25, 0]} s={[0.6, 0.5, 0.6]} c="#4a1820" /><Box p={[0, 0.7, 0.26]} s={[0.6, 0.55, 0.1]} c="#4a1820" />
  </group>;
}
/** 壁ぞいのスロット（向きは rot） */
function Slot({ x, z, rot, c }: { x: number; z: number; rot: number; c: string }) {
  return <group position={[x, 0, z]} rotation-y={rot}>
    <Box p={[0, 0.9, 0]} s={[1, 1.8, 0.9]} c={c} /><Box p={[0, 1.3, 0.46]} s={[0.8, 0.6, 0.03]} c="#141a20" emissive="#20304a" />
    {[-1, 0, 1].map((i) => <Box key={i} p={[i * 0.22, 1.3, 0.48]} s={[0.2, 0.42, 0.02]} c="#f2e6b8" emissive="#3a3220" />)}
    <Box p={[0, 1.95, 0.1]} s={[1, 0.3, 0.7]} c="#1a1216" emissive={c} />
    <Box p={[0, 0.98, 0.5]} s={[0.8, 0.06, 0.25]} c="#2a2428" />
    <Stool x={0} z={0.95} />
  </group>;
}

export function CasinoDecor() {
  const carpet = useCanvas(256, 256, (g) => {
    g.fillStyle = '#5a1522'; g.fillRect(0, 0, 256, 256);
    g.strokeStyle = '#b8892f'; g.lineWidth = 6;
    g.beginPath(); g.moveTo(128, 8); g.lineTo(248, 128); g.lineTo(128, 248); g.lineTo(8, 128); g.closePath(); g.stroke();
    g.fillStyle = '#2b0a12'; g.beginPath(); g.arc(128, 128, 34, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#d4a645'; [[0, 0], [256, 0], [0, 256], [256, 256], [128, 128]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 12, 0, Math.PI * 2); g.fill(); });
  }, [12, 7]);
  return <>
    {/* 柄のカーペット */}
    <mesh position={[0, 0.014, 0]} rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[23.6, 13.6]} /><meshStandardMaterial map={carpet} roughness={1} /></mesh>
    {/* 腰壁と金の見切り、壁の照明 */}
    {[-1, 1].map((s) => <group key={s}>
      <Box p={[s * 11.76, 0.55, 0]} s={[0.06, 1.1, 13.6]} c="#3a1d17" />
      <Box p={[s * 11.74, 1.13, 0]} s={[0.08, 0.06, 13.6]} c={GOLD} metal={0.85} />
      {[-5, -1.5, 1.5, 5].map((z) => <group key={z} position={[s * 11.72, 3.2, z]}>
        <Box p={[0, 0, 0]} s={[0.08, 0.4, 0.2]} c={GOLD} metal={0.85} />
        <mesh position={[-s * 0.12, 0.25, 0]}><sphereGeometry args={[0.12, 12, 10]} /><meshStandardMaterial color="#fff1c8" emissive="#ffd890" emissiveIntensity={1.4} /></mesh>
      </group>)}
    </group>)}
    <Box p={[0, 0.55, 6.76]} s={[23.6, 1.1, 0.06]} c="#3a1d17" />
    <Box p={[0, 1.13, 6.74]} s={[23.6, 0.06, 0.08]} c={GOLD} metal={0.85} />
    {/* 天井：金の格天井と埋め込みの灯り */}
    {[-9, -6, -3, 3, 6, 9].map((x) => <Box key={'bx' + x} p={[x, 6.28, 0]} s={[0.12, 0.1, 13.6]} c={GOLD} metal={0.8} />)}
    {[-4.5, 4.5].map((z) => <Box key={'bz' + z} p={[0, 6.28, z]} s={[23.6, 0.1, 0.12]} c={GOLD} metal={0.8} />)}
    {[-10.5, -7.5, -4.5, 4.5, 7.5, 10.5].flatMap((x) => [-5.7, 0, 5.7].map((z) => <mesh key={x + ',' + z} position={[x, 6.32, z]} rotation-x={Math.PI / 2}><circleGeometry args={[0.18, 16]} /><meshBasicMaterial color="#ffe8b0" side={THREE.DoubleSide} /></mesh>))}
    {/* 入口の壁の内側を暗い色でおおい、看板を貼る */}
    {[-1, 1].map((s) => <Box key={'fw' + s} p={[s * 7.05, 3.2, -6.7]} s={[9.7, 6.4, 0.04]} c="#352c30" />)}
    <Box p={[0, 4.9, -6.7]} s={[4.4, 3, 0.04]} c="#352c30" />
    <Sign p={[-6, 3.6, -6.66]} w={5} h={1.25} text="★ JACKPOT ★" color="#ffcf4a" font="bold 150px Georgia, serif" />
    <Sign p={[6, 3.6, -6.66]} w={5} h={1.25} text="RACE BOOK" color="#7fe0ff" font="bold 150px sans-serif" />
    {/* 左の壁ぞいのスロット */}
    {[-1.2, 0, 1.2].map((z, i) => <Slot key={z} x={-11.3} z={z} rot={Math.PI / 2} c={['#7a1d2c', '#1d4a7a', '#6a4a12'][i]} />)}
    {/* 右奥のポーカー台 */}
    <group position={[9.8, 0, 0]}>
      <mesh position={[0, 0.4, 0]}><cylinderGeometry args={[0.25, 0.4, 0.8, 20]} /><meshStandardMaterial color="#3a2218" /></mesh>
      <mesh position={[0, 0.84, 0]} castShadow><cylinderGeometry args={[0.95, 0.95, 0.08, 40]} /><meshStandardMaterial color="#5a3424" roughness={0.5} /></mesh>
      <mesh position={[0, 0.885, 0]}><cylinderGeometry args={[0.82, 0.82, 0.02, 40]} /><meshStandardMaterial color="#135a44" roughness={0.9} /></mesh>
      {Array.from({ length: 5 }, (_, i) => { const a = i * Math.PI * 2 / 5; return <group key={i}>
        <ArmChair x={Math.sin(a) * 1.3} z={Math.cos(a) * 1.3} rot={a} />
        {[0, 1, 2].map((k) => <mesh key={k} position={[Math.sin(a) * 0.6, 0.905 + k * 0.022, Math.cos(a) * 0.6]}><cylinderGeometry args={[0.05, 0.05, 0.02, 14]} /><meshStandardMaterial color={['#c92b2b', '#1d1d1d', '#e9e2cf'][k]} /></mesh>)}
      </group>; })}
      <Sign p={[0, 2.6, 0]} w={2} h={0.5} rot={-Math.PI / 2} text="POKER" color="#ffd36a" font="bold 160px Georgia, serif" />
    </group>
    {/* 左奥の両替所（格子つき） */}
    <group position={[-10.2, 0, 6.1]}>
      <Box p={[0, 0.6, -0.5]} s={[3.2, 1.2, 0.4]} c="#3a1d17" /><Box p={[0, 1.23, -0.5]} s={[3.3, 0.06, 0.5]} c="#e7d7a8" />
      {Array.from({ length: 13 }, (_, i) => <Box key={i} p={[-1.5 + i * 0.25, 1.95, -0.62]} s={[0.025, 1.4, 0.025]} c={GOLD} metal={0.85} />)}
      <Box p={[0, 2.68, -0.62]} s={[3.2, 0.08, 0.06]} c={GOLD} metal={0.85} />
      <Sign p={[0, 3.05, -0.66]} w={2.6} h={0.55} rot={Math.PI} text="CASHIER · 両替" color="#ffe2a0" bg="#2a0f14" font="bold 120px sans-serif" />
    </group>
    {/* 右奥のラウンジ */}
    <group position={[10, 0, 6.3]}>
      <Box p={[0, 0.22, 0]} s={[3, 0.44, 0.8]} c="#2a2a3a" /><Box p={[0, 0.7, 0.3]} s={[3, 0.6, 0.2]} c="#2a2a3a" />
      {[-1, 0, 1].map((i) => <Box key={i} p={[i * 0.95, 0.5, -0.05]} s={[0.85, 0.14, 0.6]} c="#3d3d54" />)}
      <Box p={[0, 0.2, -1]} s={[1.2, 0.4, 0.6]} c="#1b1a1c" metal={0.3} />
      <mesh position={[0, 0.48, -1]}><cylinderGeometry args={[0.06, 0.04, 0.16, 12]} /><meshPhysicalMaterial color="#c9e3ea" transparent opacity={0.5} /></mesh>
    </group>
    {/* バーのスツール（真ん中はあける） */}
    {[-2.6, -1.8, 1.8, 2.6].map((x) => <Stool key={x} x={x} z={2.95} />)}
    {/* 入口わきの植物 */}
    {[-1, 1].map((s) => <Plant key={s} x={s * 11.2} z={-6.2} h={1.8} pot="#2a1a14" />)}
    {[-1, 1].map((s) => <Plant key={'d' + s} x={s * 3} z={-6.3} h={1.4} pot="#2a1a14" />)}
  </>;
}

const LISTINGS = [
  { name: '駅前の平屋', price: '¥12,800,000', roof: '#7a4a2a', wall: '#f1e4c8' },
  { name: '南向き 2階建て', price: '¥24,500,000', roof: '#3d4a5a', wall: '#ffffff' },
  { name: '郊外の土地', price: '¥5,000,000', roof: '', wall: '#a7c48a' },
  { name: '都心のデザイナーズ', price: '¥48,000,000', roof: '#222222', wall: '#d8d8d2' },
  { name: '庭つき 4LDK', price: '¥31,000,000', roof: '#8a2f2a', wall: '#efe6d6' },
  { name: '川ぞいの土地', price: '¥7,200,000', roof: '', wall: '#9bbf9a' },
];

export function EstateDecor() {
  const board = useCanvas(1024, 512, (g) => {
    g.fillStyle = '#f7f4ea'; g.fillRect(0, 0, 1024, 512);
    g.fillStyle = '#286e6b'; g.fillRect(0, 0, 1024, 64);
    g.fillStyle = '#fff'; g.font = 'bold 40px sans-serif'; g.textAlign = 'center'; g.fillText('おすすめ物件', 512, 46);
    LISTINGS.forEach((l, i) => {
      const x = 22 + (i % 3) * 334, y = 84 + Math.floor(i / 3) * 214;
      g.fillStyle = '#fff'; g.fillRect(x, y, 310, 196); g.strokeStyle = '#c9c3b2'; g.lineWidth = 3; g.strokeRect(x, y, 310, 196);
      g.fillStyle = '#cfe4ef'; g.fillRect(x + 10, y + 10, 290, 110);
      g.fillStyle = '#8fb479'; g.fillRect(x + 10, y + 100, 290, 20);
      if (l.roof) {
        g.fillStyle = l.wall; g.fillRect(x + 100, y + 55, 110, 50);
        g.fillStyle = l.roof; g.beginPath(); g.moveTo(x + 90, y + 58); g.lineTo(x + 155, y + 22); g.lineTo(x + 220, y + 58); g.fill();
        g.fillStyle = '#6b8fa6'; g.fillRect(x + 115, y + 68, 22, 18); g.fillRect(x + 172, y + 68, 22, 18);
      } else { g.fillStyle = l.wall; g.fillRect(x + 30, y + 75, 250, 30); g.strokeStyle = '#fff'; g.setLineDash([8, 6]); g.strokeRect(x + 60, y + 78, 190, 24); g.setLineDash([]); }
      g.fillStyle = '#333'; g.font = 'bold 26px sans-serif'; g.fillText(l.name, x + 155, y + 152);
      g.fillStyle = '#c0392b'; g.font = 'bold 28px sans-serif'; g.fillText(l.price, x + 155, y + 184);
    });
  });
  return <>
    {/* 奥の壁の物件ボード */}
    <mesh position={[-2.9, 1.65, 3.78]} rotation-y={Math.PI}><planeGeometry args={[2.4, 1.2]} /><meshStandardMaterial map={board} roughness={0.8} /></mesh>
    {/* 入口左の待合ソファと雑誌の台 */}
    <group position={[-3.4, 0, -3.45]}>
      <Box p={[0, 0.22, 0]} s={[1.9, 0.44, 0.7]} c="#4f7f7c" /><Box p={[0, 0.65, -0.28]} s={[1.9, 0.5, 0.16]} c="#4f7f7c" />
      {[-1, 1].map((s) => <Box key={s} p={[s * 0.9, 0.5, 0]} s={[0.12, 0.3, 0.7]} c="#3f6b68" />)}
      <Box p={[0, 0.2, 0.75]} s={[0.9, 0.4, 0.45]} c="#e9dbc2" />
      {[0, 1].map((i) => <Box key={i} p={[-0.15 + i * 0.3, 0.41 + i * 0.012, 0.75]} s={[0.24, 0.012, 0.32]} c={i ? '#c0392b' : '#286e6b'} />)}
    </group>
    {/* 入口右の家の模型 */}
    <group position={[3.4, 0, -3.3]}>
      <Box p={[0, 0.45, 0]} s={[0.9, 0.9, 0.9]} c="#faf9f2" />
      <mesh position={[0, 0.93, 0]}><boxGeometry args={[0.86, 0.04, 0.86]} /><meshStandardMaterial color="#8fb479" /></mesh>
      <Box p={[0, 1.08, 0]} s={[0.42, 0.26, 0.32]} c="#f1e4c8" />
      <mesh position={[0, 1.29, 0]} rotation-y={Math.PI / 4}><coneGeometry args={[0.34, 0.18, 4]} /><meshStandardMaterial color="#8a2f2a" /></mesh>
      <mesh position={[0, 1.3, 0]}><boxGeometry args={[0.92, 0.82, 0.92]} /><meshPhysicalMaterial color="#e6f2f5" transparent opacity={0.15} depthWrite={false} /></mesh>
    </group>
    {[-1, 1].map((s) => <Plant key={s} x={s * 4.45} z={3.45} h={1.3} />)}
  </>;
}
