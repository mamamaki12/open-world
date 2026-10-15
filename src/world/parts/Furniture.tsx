import type { ThreeEvent } from '@react-three/fiber';
import { getFurniture } from '../../catalog';
import type { FurnitureDef, Paint } from '../../catalog';
import { furnitureBaseY } from '../../building/rules';
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

export function FurnitureModel({ def, color, highlight = 'none' }: { def: FurnitureDef; color: string; highlight?: Highlight }) {
  return (
    <>
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
  const { highlight, handlers, selected } = usePart({ kind: 'furniture', id: item.id });
  const def = getFurniture(item.type);
  const tool = useGame((s) => s.tool);
  const baseY = useGame((s) => furnitureBaseY(s.house, item));

  // 選択中の家具はドラッグで動かせる
  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (tool !== 'select' || !selected || e.button !== 0) return;
    e.stopPropagation();
    useGame.getState().beginDrag();
    useInteraction.getState().setFurnitureDrag({ id: item.id, dx: e.point.x - item.x, dz: e.point.z - item.z });
  };

  return (
    <group
      position={[item.x, baseY, item.z]}
      rotation={[0, (item.rotation * Math.PI) / 180, 0]}
      {...handlers}
      onPointerDown={onPointerDown}
    >
      <FurnitureModel def={def} color={item.color} highlight={highlight} />
    </group>
  );
}

