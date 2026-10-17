// 証券取引所の外観（石の柱と流れる株価の電光掲示）と、店内の大きな相場ボード。値は実際の相場（useStocks）
import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { EXCHANGE } from '../building/exchange';
import { INSTRUMENTS, changePct } from '../economy/stocks';
import type { Quotes } from '../economy/stocks';
import { refreshQuotes, useStocks } from '../state/stocks';
import { OpenFrontBox, PlinthRing, VenueDoor } from './VenueShell';

const fmt = (n: number) => n.toLocaleString('ja-JP', { maximumFractionDigits: n > 1000 ? 0 : 2 });
const tint = (p: number) => (p > 0 ? '#ff5a4e' : p < 0 ? '#36d68e' : '#e8e8e8');
function canvasTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function rows(q: Quotes | null) {
  return INSTRUMENTS.map(i => { const x = q?.quotes[i.symbol]; return { name: i.name, price: x ? fmt(x.price) : '—', pct: x ? changePct(x) : 0, has: !!x }; });
}
/** 相場を最初に1回と、5分ごとに読み直す */
function useLiveQuotes() {
  const quotes = useStocks(s => s.quotes);
  useEffect(() => { void refreshQuotes(); const id = setInterval(() => void refreshQuotes(), 300_000); return () => clearInterval(id); }, []);
  return quotes;
}
function useTicker(quotes: Quotes | null) {
  const tex = useMemo(() => canvasTexture(2048, 96, g => {
    g.fillStyle = '#05080c'; g.fillRect(0, 0, 2048, 96); g.font = 'bold 52px sans-serif'; g.textBaseline = 'middle';
    let x = 20;
    for (const r of rows(quotes)) {
      g.fillStyle = '#f2c94c'; g.fillText(r.name, x, 50); x += g.measureText(r.name).width + 16;
      const v = `${r.price} ${r.has ? (r.pct >= 0 ? '▲' : '▼') + Math.abs(r.pct).toFixed(2) + '%' : ''}`;
      g.fillStyle = tint(r.pct); g.fillText(v, x, 50); x += g.measureText(v).width + 60;
    }
  }), [quotes]);
  useEffect(() => { tex.wrapS = THREE.RepeatWrapping; tex.repeat.set(.5, 1); return () => tex.dispose(); }, [tex]);
  useFrame((_, dt) => { tex.offset.x = (tex.offset.x + dt * .03) % 1; });
  return tex;
}

export function ExchangeBuilding() {
  const quotes = useLiveQuotes(), ticker = useTicker(quotes);
  const sign = useMemo(() => canvasTexture(1024, 256, g => {
    g.fillStyle = '#e9e4d8'; g.fillRect(0, 0, 1024, 256); g.fillStyle = '#1e3a5f'; g.textAlign = 'center';
    g.font = 'bold 40px serif'; g.fillText('MACHI STOCK EXCHANGE', 512, 70);
    g.font = 'bold 104px "Yu Mincho", serif'; g.fillText('まち証券取引所', 512, 190);
  }), []);
  useEffect(() => () => sign.dispose(), [sign]);
  const b = EXCHANGE, cx = (b.x0 + b.x1) / 2, w = b.x1 - b.x0, front = b.z0;
  return <group name="exchange">
    <OpenFrontBox kind="exchange" height={b.height} color="#e3ddd0" roughness={0.9} />
    <PlinthRing kind="exchange" height={0.45} margin={0.1} color="#b9b1a2" />
    {/* 三角屋根の破風と石の柱 */}
    <mesh position={[cx, b.height + 0.05, front - 0.3]} castShadow><boxGeometry args={[w + 0.6, 0.4, 0.8]} /><meshStandardMaterial color="#d8d1c2" /></mesh>
    {[-4.2, -2.6, 2.6, 4.2].map(x => <group key={x} position={[cx + x, 0, front - 0.55]}>
      <mesh position={[0, 0.15, 0]}><boxGeometry args={[0.8, 0.3, 0.8]} /><meshStandardMaterial color="#cfc7b6" /></mesh>
      <mesh position={[0, 3.3, 0]} castShadow><cylinderGeometry args={[0.28, 0.32, 6, 20]} /><meshStandardMaterial color="#efe9dc" roughness={0.7} /></mesh>
      <mesh position={[0, 6.4, 0]}><boxGeometry args={[0.8, 0.25, 0.8]} /><meshStandardMaterial color="#cfc7b6" /></mesh>
    </group>)}
    <mesh position={[cx, 6.75, front - 0.55]}><boxGeometry args={[w + 0.2, 0.5, 1.1]} /><meshStandardMaterial color="#d8d1c2" /></mesh>
    <mesh position={[cx, 5.45, front - 0.03]} rotation-y={Math.PI}><planeGeometry args={[6.4, 1.6]} /><meshStandardMaterial map={sign} /></mesh>
    {/* 流れる株価の電光掲示 */}
    <mesh position={[cx, 3.95, front - 0.04]} rotation-y={Math.PI}><planeGeometry args={[w - 0.6, 0.55]} /><meshBasicMaterial map={ticker} toneMapped={false} /></mesh>
    <mesh position={[cx, 3.95, front - 0.02]}><boxGeometry args={[w - 0.4, 0.7, 0.03]} /><meshStandardMaterial color="#1a1d22" /></mesh>
    <VenueDoor kind="exchange" frame="#2b3a4c" />
    <mesh position={[cx, 0.005, front - 1.8]} rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[w, 3]} /><meshStandardMaterial color="#cbc4b6" /></mesh>
  </group>;
}

/** 店内：奥の壁の相場ボード、受付カウンター、モニターの並ぶ机。座標は店の中央が原点 */
export function ExchangeInterior() {
  const quotes = useStocks(s => s.quotes), d = EXCHANGE.z1 - EXCHANGE.z0, w = EXCHANGE.x1 - EXCHANGE.x0;
  const board = useMemo(() => canvasTexture(1536, 768, g => {
    g.fillStyle = '#05080c'; g.fillRect(0, 0, 1536, 768);
    g.fillStyle = '#f2c94c'; g.font = 'bold 54px sans-serif'; g.fillText('MARKET BOARD · 実際の相場', 40, 74);
    rows(quotes).forEach((r, i) => {
      const y = 150 + i * 66;
      g.fillStyle = '#e8e8e8'; g.font = 'bold 46px sans-serif'; g.textAlign = 'left'; g.fillText(r.name, 40, y);
      g.textAlign = 'right'; g.fillText(r.price, 1100, y);
      g.fillStyle = tint(r.pct); g.fillText(r.has ? `${r.pct >= 0 ? '▲' : '▼'} ${Math.abs(r.pct).toFixed(2)}%` : '', 1490, y);
    });
    if (quotes) { g.textAlign = 'left'; g.fillStyle = '#7b8796'; g.font = '30px sans-serif'; g.fillText(new Date(quotes.updated * 1000).toLocaleString('ja-JP') + ' 更新', 40, 750); }
  }), [quotes]);
  useEffect(() => () => board.dispose(), [board]);
  const box = (p: [number, number, number], s: [number, number, number], c: string) => <mesh position={p} castShadow receiveShadow><boxGeometry args={s} /><meshStandardMaterial color={c} roughness={0.6} /></mesh>;
  return <>
    <mesh position={[0, 2.7, d / 2 - 0.22]} rotation-y={Math.PI}><planeGeometry args={[w - 1.6, (w - 1.6) / 2]} /><meshBasicMaterial map={board} toneMapped={false} /></mesh>
    {box([0, 2.7, d / 2 - 0.18], [w - 1.4, (w - 1.6) / 2 + 0.2, 0.05], '#15181d')}
    {box([0, 0.55, 1.8], [4, 1.1, 0.8], '#1e4d8c')}{box([0, 1.13, 1.8], [4.2, 0.07, 0.95], '#e9e4d8')}
    {[-3.5, 3.5].map(x => <group key={x}>
      {box([x, 0.74, -1], [1.4, 0.06, 0.8], '#6b5a48')}{box([x, 0.37, -1], [1.3, 0.72, 0.7], '#4a3f34')}
      {box([x, 1.05, -0.8], [0.9, 0.55, 0.04], '#111418')}
      <mesh position={[x, 1.05, -0.825]} rotation-y={Math.PI}><planeGeometry args={[0.84, 0.48]} /><meshBasicMaterial map={board} toneMapped={false} /></mesh>
    </group>)}
  </>;
}
