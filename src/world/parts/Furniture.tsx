import { useEffect, useMemo } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { getFurniture } from '../../catalog';
import type { FurnitureDef, Paint } from '../../catalog';
import { furnitureBaseY } from '../../building/rules';
import { floorY } from '../../building/dimensions';
import type { FurniturePart } from '../../building/types';
import { useGame } from '../../state/store';
import { useInteraction } from '../../state/interaction';
import { plainMaterial } from '../materials';
import type { Highlight } from '../materials';
import { usePart } from './usePart';

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

export function FurnitureModel({ def, color, label, highlight = 'none' }: { def: FurnitureDef; color: string; label?: string; highlight?: Highlight }) {
  return (
    <>
      {def.label && label && <LabelPlane text={label} plate={color} size={def.label.size} pos={def.label.pos} />}
      {def.parts.map((p, i) => {
        const paint = p.paint === 'main' ? { color, roughness: 0.7 } : PAINT[p.paint];
        const mat = plainMaterial(paint.color, highlight, { roughness: paint.roughness, metalness: paint.metalness });
        return (
          <mesh key={i} position={p.pos} scale={p.shape === 'sphere' ? p.size : [1, 1, 1]} material={mat} castShadow receiveShadow>
            {p.shape === 'box' && <boxGeometry args={p.size} />}
            {p.shape === 'cylinder' && <cylinderGeometry args={[p.size[0] / 2, p.size[0] / 2.4, p.size[1], 20]} />}
            {p.shape === 'sphere' && <sphereGeometry args={[0.5, 20, 14]} />}
          </mesh>
        );
      })}
    </>
  );
}

export function Furniture({ item }: { item: FurniturePart }) {
  const { highlight, handlers } = usePart({ kind: 'furniture', id: item.id });
  const def = getFurniture(item.type);
  const tool = useGame((s) => s.tool);
  const baseY = useGame((s) => furnitureBaseY(s.house, item));

  // 選択中の家具はドラッグで動かせる
  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    const game = useGame.getState();
    if (tool !== 'select' || game.mode !== 'build' || e.button !== 0) return;
    e.stopPropagation();
    game.select({ kind: 'furniture', id: item.id });
    const point = e.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -floorY(item.level)), new THREE.Vector3());
    if (!point) return;
    game.beginDrag();
    useInteraction.getState().setFurnitureDrag({ id: item.id, dx: point.x - item.x, dz: point.z - item.z, startX: e.clientX, startY: e.clientY });
  };

  return (
    <group
      position={[item.x, baseY, item.z]}
      rotation={[0, (item.rotation * Math.PI) / 180, 0]}
      {...handlers}
      onPointerDown={onPointerDown}
    >
      <FurnitureModel def={def} color={item.color} label={item.label} highlight={highlight} />
    </group>
  );
}


