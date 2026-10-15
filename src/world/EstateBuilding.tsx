import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { ESTATE } from '../building/landmarks';

export function EstateBuilding() {
  const sign = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#154d58'; ctx.fillRect(0, 0, 1024, 256);
    ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 100px "Yu Gothic", sans-serif';
    ctx.fillText('まちの不動産', 512, 100);
    ctx.font = '40px "Yu Gothic", sans-serif';
    ctx.fillText('土地・売買・賃貸・工事のご相談', 512, 200);
    const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);
  useEffect(() => () => sign.dispose(), [sign]);
  const cx = (ESTATE.x0 + ESTATE.x1) / 2;
  return (
    <group name="estate">
      <mesh position={[cx, ESTATE.height / 2, (ESTATE.z0 + ESTATE.z1) / 2]} castShadow receiveShadow>
        <boxGeometry args={[ESTATE.x1 - ESTATE.x0, ESTATE.height, ESTATE.z1 - ESTATE.z0]} />
        <meshStandardMaterial color="#e6dfd1" roughness={0.85} />
      </mesh>
      <mesh position={[cx, 3.4, ESTATE.z0 - 0.03]} rotation-y={Math.PI}>
        <planeGeometry args={[8.6, 2.15]} />
        <meshBasicMaterial map={sign} toneMapped={false} />
      </mesh>
      <mesh position={[ESTATE.door.x, 1.2, ESTATE.z0 - 0.04]}>
        <boxGeometry args={[ESTATE.door.width, 2.4, 0.06]} />
        <meshStandardMaterial color="#335c6a" metalness={0.3} roughness={0.25} />
      </mesh>
      <mesh position={[ESTATE.door.x + 0.7, 1.1, ESTATE.z0 - 0.1]}>
        <boxGeometry args={[0.06, 0.4, 0.08]} /><meshStandardMaterial color="#d9d3bb" metalness={0.8} />
      </mesh>
      <mesh position={[cx, 2.7, ESTATE.z0 - 0.65]} castShadow>
        <boxGeometry args={[9, 0.16, 1.4]} /><meshStandardMaterial color="#154d58" />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[cx, 0.005, ESTATE.z0 - 1.6]} receiveShadow>
        <planeGeometry args={[11, 3.2]} /><meshStandardMaterial color="#c9c2b5" />
      </mesh>
    </group>
  );
}
