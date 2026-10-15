import { useMemo } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { getOpening } from '../../catalog';
import { GRID, WALL_HEIGHT, WALL_THICKNESS, floorY } from '../../building/dimensions';
import { canPlaceOpening, newId, snapOpeningOffset, wallLength } from '../../building/rules';
import type { OpeningPart, WallPart } from '../../building/types';
import { useGame } from '../../state/store';
import { useInteraction } from '../../state/interaction';
import { finishMaterial } from '../materials';
import { wallGeometry } from '../geometry';
import { usePart } from './usePart';
import { Opening } from './Opening';

interface Props {
  wall: WallPart;
  openings: OpeningPart[];
  outside: 1 | -1 | 0 | 2;
}

export function Wall({ wall, openings, outside }: Props) {
  const { highlight, handlers } = usePart({ kind: 'wall', id: wall.id });
  const tool = useGame((s) => s.tool);
  const length = wallLength(wall);
  const angle = -Math.atan2(wall.z1 - wall.z0, wall.x1 - wall.x0);

  const holesKey = openings.map((o) => `${o.type}@${o.offset}`).join(',');
  const geometry = useMemo(() => {
    const holes = openings.map((o) => {
      const def = getOpening(o.type);
      return { lo: o.offset - def.width / 2, hi: o.offset + def.width / 2, bottom: def.sill, top: def.sill + def.height };
    });
    // 端は厚みの半分だけ伸ばして角をふさぐ（わずかに短くして面のちらつきを防ぐ）
    return wallGeometry(length, WALL_HEIGHT, WALL_THICKNESS, holes, WALL_THICKNESS / 2 - 0.002);
  }, [length, holesKey]);

  const ext = finishMaterial(wall.exterior, highlight);
  const int = finishMaterial(wall.interior, highlight);
  const materials =
    outside === 1 ? [ext, int, int] : outside === -1 ? [int, ext, int] : outside === 0 ? [int, int, int] : [ext, ext, ext];

  const openingTool = tool === 'door' || tool === 'window';
  const openingHandlers = openingTool
    ? {
        onPointerMove: (e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          const { defaults, house } = useGame.getState();
          const type = tool === 'door' ? defaults.doorType : defaults.windowType;
          const def = getOpening(type);
          const dx = e.point.x - wall.x0 * GRID;
          const dz = e.point.z - wall.z0 * GRID;
          const raw = dx * Math.cos(-angle) + dz * Math.sin(-angle);
          const offset = snapOpeningOffset(length, raw, def.width);
          const valid = canPlaceOpening(house, wall.id, type, offset) === null;
          useInteraction.getState().setPreview({ kind: 'opening', wallId: wall.id, offset, valid });
        },
        onPointerOut: () => {
          const p = useInteraction.getState().preview;
          if (p?.kind === 'opening' && p.wallId === wall.id) useInteraction.getState().setPreview(null);
        },
        onClick: (e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          const p = useInteraction.getState().preview;
          if (p?.kind !== 'opening' || p.wallId !== wall.id) return;
          const s = useGame.getState();
          const type = tool === 'door' ? s.defaults.doorType : s.defaults.windowType;
          const err = canPlaceOpening(s.house, wall.id, type, p.offset);
          if (err) {
            s.notify(err);
            return;
          }
          const opening: OpeningPart = {
            id: newId('opening'),
            wallId: wall.id,
            kind: tool,
            type,
            offset: p.offset,
            sashColor: s.defaults.sashColor,
            panelColor: s.defaults.panelColor,
          };
          s.commit({ ...s.house, openings: [...s.house.openings, opening] });
          useInteraction.getState().setPreview({ ...p, valid: false });
        },
      }
    : {};

  return (
    <group position={[wall.x0 * GRID, floorY(wall.level), wall.z0 * GRID]} rotation={[0, angle, 0]}>
      <mesh geometry={geometry} material={materials} castShadow receiveShadow {...handlers} {...openingHandlers} />
      {openings.map((o) => (
        <Opening key={o.id} opening={o} outside={outside === -1 ? -1 : 1} />
      ))}
    </group>
  );
}
