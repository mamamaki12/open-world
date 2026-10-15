import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { ESTATE } from '../building/landmarks';

function printed(draw: (ctx: CanvasRenderingContext2D) => void, width = 1024, height = 384) {
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4;
  return texture;
}
function propertyWindow() {
  return printed(ctx => {
    ctx.fillStyle = '#eef0e8'; ctx.fillRect(0, 0, 1024, 768);
    for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) {
      const x = 24 + col * 334, y = 20 + row * 250;
      ctx.fillStyle = '#fff'; ctx.fillRect(x, y, 308, 230);
      ctx.fillStyle = row === 0 ? '#c75136' : '#247c80'; ctx.fillRect(x, y, 308, 32);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 22px sans-serif'; ctx.fillText(row === 0 ? 'おすすめ物件' : '入居者募集中', x + 12, y + 24);
      ctx.fillStyle = '#e4e9e9'; ctx.fillRect(x + 12, y + 45, 128, 100);
      ctx.strokeStyle = '#718282'; ctx.lineWidth = 3;
      ctx.strokeRect(x + 20, y + 55, 110, 80); ctx.strokeRect(x + 20, y + 55, 60, 38);
      ctx.beginPath(); ctx.moveTo(x + 80, y + 55); ctx.lineTo(x + 80, y + 135); ctx.stroke();
      ctx.fillStyle = '#263e42'; ctx.font = 'bold 29px sans-serif'; ctx.fillText(['1LDK', '2LDK', '3LDK'][col], x + 154, y + 80);
      ctx.font = '21px sans-serif'; ctx.fillText('駅徒歩 ' + (3 + col * 2) + '分', x + 154, y + 116);
      ctx.fillStyle = '#b7442e'; ctx.font = 'bold 33px sans-serif'; ctx.fillText((5.8 + col + row * 0.6).toFixed(1) + '万円', x + 18, y + 194);
      ctx.fillStyle = '#647579'; ctx.font = '18px sans-serif'; ctx.fillText('お気軽にご相談ください', x + 16, y + 220);
    }
  }, 1024, 768);
}

export function EstateBuilding() {
  const sign = useMemo(() => printed(ctx => {
    ctx.fillStyle = '#1d6469'; ctx.fillRect(0, 0, 1024, 384);
    ctx.fillStyle = '#e8c981'; ctx.font = 'bold 44px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('MACHI REAL ESTATE', 512, 74);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 112px "Yu Gothic", sans-serif'; ctx.fillText('まちの不動産', 512, 216);
    ctx.font = '34px sans-serif'; ctx.fillText('売買・賃貸・住まいのご相談', 512, 310);
  }), []);
  const listings = useMemo(propertyWindow, []);
  useEffect(() => () => { sign.dispose(); listings.dispose(); }, [sign, listings]);
  const cx = ESTATE.door.x, front = ESTATE.z0, width = ESTATE.x1 - ESTATE.x0;
  return <group name="estate">
    <mesh position={[cx, ESTATE.height / 2, (front + ESTATE.z1) / 2]} castShadow receiveShadow>
      <boxGeometry args={[width, ESTATE.height, ESTATE.z1 - front]} /><meshStandardMaterial color="#e8e3d7" roughness={0.85} />
    </mesh>
    <mesh position={[cx, 0.15, (front + ESTATE.z1) / 2]} receiveShadow>
      <boxGeometry args={[width + 0.12, 0.3, ESTATE.z1 - front + 0.1]} /><meshStandardMaterial color="#827c70" />
    </mesh>
    <mesh position={[cx, 3.7, front - 0.08]} rotation-y={Math.PI}>
      <planeGeometry args={[9.7, 1.25]} /><meshStandardMaterial map={sign} emissiveMap={sign} emissive="#ffffff" emissiveIntensity={0.25} />
    </mesh>
    {[-1, 1].map(side => <group key={side} position={[cx + side * 3.25, 0, front]}>
      <mesh position={[0, 1.55, -0.07]}><boxGeometry args={[3.55, 2.65, 0.08]} /><meshStandardMaterial color="#a8cad0" metalness={0.4} roughness={0.15} /></mesh>
      <mesh position={[0, 1.48, -0.13]} rotation-y={Math.PI}><planeGeometry args={[3.1, 2.28]} /><meshBasicMaterial map={listings} toneMapped={false} /></mesh>
      {[-1.82, 1.82].map(x => <mesh key={x} position={[x, 1.55, -0.15]}><boxGeometry args={[0.08, 2.8, 0.1]} /><meshStandardMaterial color="#505a5a" metalness={0.7} /></mesh>)}
      <mesh position={[0, 0.28, -0.16]}><boxGeometry args={[3.7, 0.28, 0.12]} /><meshStandardMaterial color="#d3cbbc" /></mesh>
    </group>)}
    <mesh position={[cx, 1.3, front - 0.1]}><boxGeometry args={[2.15, 2.6, 0.1]} /><meshStandardMaterial color="#5c858a" metalness={0.45} roughness={0.15} /></mesh>
    {[-1.08, 0, 1.08].map(x => <mesh key={x} position={[cx + x, 1.3, front - 0.18]}><boxGeometry args={[0.06, 2.6, 0.08]} /><meshStandardMaterial color="#445052" metalness={0.6} /></mesh>)}
    {[-0.14, 0.14].map(x => <mesh key={x} position={[cx + x, 1.15, front - 0.27]}><boxGeometry args={[0.04, 0.5, 0.08]} /><meshStandardMaterial color="#e3e0cf" metalness={0.8} /></mesh>)}
    <mesh position={[cx, 2.96, front - 0.5]} rotation-x={-0.12} castShadow><boxGeometry args={[10.2, 0.16, 1.2]} /><meshStandardMaterial color="#1d6469" /></mesh>
    <mesh position={[cx, 2.82, front - 1.05]}><boxGeometry args={[10.2, 0.24, 0.08]} /><meshStandardMaterial color="#174c51" /></mesh>
    <mesh position={[cx, 0.012, front - 0.65]} rotation-x={-Math.PI / 2}><planeGeometry args={[1.8, 0.9]} /><meshStandardMaterial color="#233b3d" /></mesh>
    <mesh position={[cx, 0.005, front - 1.6]} rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[11, 3.2]} /><meshStandardMaterial color="#c8c3b8" /></mesh>
    {[-1, 1].map(side => <group key={side} position={[cx + side * 4.6, 0, front - 0.35]}>
      <mesh position={[0, 0.3, 0]} castShadow><cylinderGeometry args={[0.23, 0.18, 0.6, 16]} /><meshStandardMaterial color="#62574a" /></mesh>
      <mesh position={[0, 0.9, 0]} scale={[0.8, 1.5, 0.8]}><sphereGeometry args={[0.38, 14, 10]} /><meshStandardMaterial color="#3a6647" /></mesh>
    </group>)}
    <mesh position={[ESTATE.x1 - 0.15, 3.4, front + 0.5]} rotation-y={Math.PI / 2}><boxGeometry args={[1, 1.7, 0.16]} /><meshStandardMaterial color="#1d6469" /></mesh>
  </group>;
}
