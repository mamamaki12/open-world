import { useEffect, useMemo, useRef } from 'react';
import type { Ref } from 'react';
import { furnitureLightSources } from '../furnitureLights';
import * as THREE from 'three';
import { furnitureDef, hasMovingParts } from '../../catalog';
import type { FurnitureDef, FurniturePiece, Paint } from '../../catalog';
import { furnitureBaseY } from '../../building/rules';
import { mountedTransform } from '../../building/mounts';
import type { FurniturePart } from '../../building/types';
import { useDoors } from '../../state/doors';
import { useGame } from '../../state/store';
import { plainMaterial } from '../materials';
import type { Highlight } from '../materials';
import { usePart } from './usePart';
import { useHouseData } from '../HouseScope';

const PAINT: Record<Exclude<Paint, 'main'>, { color: string; roughness?: number; metalness?: number }> = {
  wood: { color: '#7a5535', roughness: 0.6 },
  white: { color: '#f2f0eb', roughness: 0.8 },
  black: { color: '#18191b', roughness: 0.3 },
  dark: { color: '#333436', roughness: 0.8 },
  accent: { color: '#7b4b3a', roughness: 0.8 },
  counter: { color: '#e6e3dc', roughness: 0.25 },
  steel: { color: '#b5b9bd', roughness: 0.3, metalness: 0.8 },
  water: { color: '#4cb4dc', roughness: 0.08, metalness: 0.1 },
  green: { color: '#4f7a45', roughness: 0.9 },
  soil: { color: '#5a4232', roughness: 1 },
  stone: { color: '#c9c5bb', roughness: 0.9 },
  terracotta: { color: '#b8613f', roughness: 0.85 },
};

/** 表札の文字を描いたテクスチャ。板の色が暗ければ白い字、明るければ黒い字 */
function LabelPlane({ text, plate, size, pos }: { text: string; plate: string; size: [number, number]; pos: [number, number, number] }) {
  const texture = useMemo(() => {
    const w = 512;
    const h = Math.round((w * size[1]) / size[0]);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const c = new THREE.Color(plate);
      const dark = c.r * 0.3 + c.g * 0.59 + c.b * 0.11 < 0.5;
      ctx.fillStyle = dark ? '#f4efe4' : '#1d1b19';
      const fit = (px: number) => `bold ${px}px "Hiragino Mincho ProN", "Yu Mincho", "Noto Serif JP", serif`;
      let px = h * 0.72;
      ctx.font = fit(px);
      // 長い名前は板の幅に収まるまで小さくする
      const width = ctx.measureText(text).width;
      if (width > w * 0.9) px *= (w * 0.9) / width;
      ctx.font = fit(px);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, w / 2, h / 2 + px * 0.04);
    }
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, [text, plate, size[0], size[1]]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh position={pos}>
      <planeGeometry args={size} />
      <meshBasicMaterial map={texture} transparent toneMapped={false} />
    </mesh>
  );
}

/** 引き出し・扉の取っ手（部品の手前の面の中央、扉は軸と反対の端） */
function Handle({ p, mat }: { p: FurniturePiece; mat: THREE.Material }) {
  const w = Math.min(0.12, p.size[0] * 0.4);
  const x = p.move === 'door-l' ? p.size[0] / 2 - 0.05 : p.move === 'door-r' ? -p.size[0] / 2 + 0.05 : 0;
  const vertical = p.move !== 'drawer';
  return (
    <mesh position={[x, 0, p.size[2] / 2 + 0.012]} material={mat} castShadow>
      <boxGeometry args={vertical ? [0.015, Math.min(0.14, p.size[1] * 0.4), 0.02] : [w, 0.015, 0.02]} />
    </mesh>
  );
}

function Piece({ p, color, highlight, open, glow }: { p: FurniturePiece; color: string; highlight: Highlight; open: boolean; glow?: string }) {
  const paint = p.paint === 'main' ? { color, roughness: 0.7 } : PAINT[p.paint];
  const mat = plainMaterial(paint.color, highlight, { roughness: paint.roughness, metalness: paint.metalness, emissive: p.glow ? glow : undefined });
  const mesh = (pos: [number, number, number]) => (
    <mesh position={pos} scale={p.shape === 'sphere' ? p.size : [1, 1, 1]} material={mat} castShadow receiveShadow>
      {p.shape === 'box' && <boxGeometry args={p.size} />}
      {p.shape === 'cylinder' && <cylinderGeometry args={[p.size[0] / 2, p.size[0] / 2.4, p.size[1], 20]} />}
      {p.shape === 'sphere' && <sphereGeometry args={[0.5, 20, 14]} />}
    </mesh>
  );
  if (!p.move) return mesh(p.pos);
  const handle = <Handle p={p} mat={plainMaterial(PAINT.steel.color, highlight, { roughness: 0.3, metalness: 0.8 })} />;
  if (p.move === 'drawer') {
    // 手前（+Z）へ奥行きの 3/4 だけ引き出す
    const out = open ? p.size[2] * 0.75 : 0;
    return <group position={[p.pos[0], p.pos[1], p.pos[2] + out]}>{mesh([0, 0, 0])}{handle}</group>;
  }
  // 扉：縦の辺（左なら -X 側）を軸に手前へ 100° 開く
  const side = p.move === 'door-l' ? -1 : 1;
  const angle = open ? side * (100 * Math.PI) / 180 : 0;
  return (
    <group position={[p.pos[0] + (side * p.size[0]) / 2, p.pos[1], p.pos[2]]} rotation={[0, angle, 0]}>
      <group position={[(-side * p.size[0]) / 2, 0, 0]}>{mesh([0, 0, 0])}{handle}</group>
    </group>
  );
}

export function FurnitureModel({ def, color, label, highlight = 'none', open = false, lightRef }: { def: FurnitureDef; color: string; label?: string; highlight?: Highlight; open?: boolean; lightRef?: Ref<THREE.Group> }) {
  return (
    <>
      {def.light && <group ref={lightRef} position={def.light.position} />}
      {def.label && label && <LabelPlane text={label} plate={color} size={def.label.size} pos={def.label.pos} />}
      {def.parts.map((p, i) => (
        <Piece key={i} p={open && def.id === 'garage-shutter' && i >= 3 ? { ...p, pos: [p.pos[0], p.pos[1] + 2.55, p.pos[2]] } : p} color={color} highlight={highlight} open={open} glow={def.light?.color} />
      ))}
    </>
  );
}

export function Furniture({ item }: { item: FurniturePart }) {
  const { highlight, handlers } = usePart({ kind: 'furniture', id: item.id });
  const def = furnitureDef(item);
  const lightRef = useRef<THREE.Group>(null);
  useEffect(() => {
    const source = lightRef.current;
    if (!source || !def.light) return;
    furnitureLightSources.set(source, def.light);
    return () => { furnitureLightSources.delete(source); };
  }, [def, !!item.wallMount]);
  const tool = useGame((s) => s.tool);
  const house = useHouseData();
  const shutterOpen = useDoors(s => (item.type === 'garage-shutter' || hasMovingParts(def)) && item.id in s.open);
  const baseY = furnitureBaseY(house, item);
  const mounted = item.wallMount ? mountedTransform(house, item.wallMount, item.type) : null;

  return (
    <group
      position={[mounted?.x ?? item.x, mounted?.y ?? baseY, mounted?.z ?? item.z]}
      rotation={[0, ((mounted?.rotation ?? item.rotation) * Math.PI) / 180, 0]}
      {...handlers}
    >
      {mounted ? <group position={[0,1.6,0]} rotation={[0,0,(item.rotation-mounted.rotation)*Math.PI/180]}><group position={[0,-1.6,0]}><FurnitureModel def={def} color={item.color} label={item.label} highlight={highlight} open={shutterOpen} lightRef={lightRef}/></group></group> : <FurnitureModel def={def} color={item.color} label={item.label} highlight={highlight} open={shutterOpen} lightRef={lightRef}/> }
      {item.type === 'nameplate' && (tool === 'select' || tool === 'erase') && (
        <mesh position={[0, 1.6, 0.025]}>
          <boxGeometry args={[0.46, 0.28, 0.055]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}


