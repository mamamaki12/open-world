import { useContext, useEffect, useMemo } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { getOpening, getFurniture } from '../../catalog';
import { GRID, WALL_THICKNESS } from '../../building/dimensions';
import { canPlaceOpening, newId, snapOpeningOffset, wallBaseY, wallHeight, wallLength, wallOutsideSide } from '../../building/rules';
import type { OpeningPart, WallPart } from '../../building/types';
import { useGame } from '../../state/store';
import { useInteraction } from '../../state/interaction';
import { finishMaterial } from '../materials';
import { wallGeometry } from '../geometry';
import { aimBuilding } from '../aimMode';
import { usePart } from './usePart';
import { Opening } from './Opening';
import { nameplateMount, mountedTransform } from '../../building/mounts';
import { HouseScope, useHouseData } from '../HouseScope';

interface Props {
  wall: WallPart;
  openings: OpeningPart[];
  outside: 1 | -1 | 0 | 2;
}

export function Wall({ wall, openings, outside }: Props) {
  const { highlight, handlers } = usePart({ kind: 'wall', id: wall.id });
  const tool = useGame((s) => s.tool);
  const foreign = !!useContext(HouseScope).activate;
  const placingNameplate = useGame((s) => s.tool === 'furniture' && !!getFurniture(s.defaults.furnitureType).mount);
  const house = useHouseData();
  const length = wallLength(wall);
  const height = wallHeight(wall);
  const angle = -Math.atan2(wall.z1 - wall.z0, wall.x1 - wall.x0);

  const holesKey = openings.map((o) => `${o.type}@${o.offset}`).join(',');
  // 床の形が途中で変わる長い壁も、1マスごとに内外を判定する。
  const segments = useMemo(() => {
    const count = Math.max(1, Math.ceil(length / GRID));
    return Array.from({ length: count }, (_, i) => {
      const start = i * GRID;
      const end = Math.min(length, (i + 1) * GRID);
      const dx = (wall.x1 - wall.x0) / (length / GRID);
      const dz = (wall.z1 - wall.z0) / (length / GRID);
      const part = { ...wall, x0: wall.x0 + dx * start / GRID, z0: wall.z0 + dz * start / GRID,
        x1: wall.x0 + dx * end / GRID, z1: wall.z0 + dz * end / GRID };
      const extend = WALL_THICKNESS / 2 - 0.002;
      const lo = i === 0 ? -extend : 0;
      const hi = end - start + (i === count - 1 ? extend : 0);
      const holes = openings.map((o) => {
        const def = getOpening(o.type);
        return { lo: Math.max(lo, o.offset - def.width / 2 - start),
          hi: Math.min(hi, o.offset + def.width / 2 - start), bottom: def.sill, top: def.sill + def.height };
      }).filter((h) => h.hi > h.lo);
      return { start, outside: wallOutsideSide(house, part),
        geometry: wallGeometry(end - start, height, WALL_THICKNESS, holes, 0, lo, hi) };
    });
  }, [length, height, holesKey, wall, house.floors, house.walls]);
  useEffect(() => () => segments.forEach((segment) => segment.geometry.dispose()), [segments]);

  const ext = finishMaterial(wall.exterior, highlight);
  const int = finishMaterial(wall.interior, highlight);
  const materialsFor = (side: Props['outside']) =>
    side === 1 ? [ext, int, ext] : side === -1 ? [int, ext, ext] : side === 0 ? [int, int, int] : [ext, ext, ext];

  const openingTool = !foreign && (tool === 'door' || tool === 'window');
  /** 壁の上の点に、いまのドア・窓を付けるとしたときのプレビュー */
  const previewAt = (point: { x: number; z: number }) => {
    const { defaults, house } = useGame.getState();
    const type = tool === 'door' ? defaults.doorType : defaults.windowType;
    const def = getOpening(type);
    const dx = point.x - wall.x0 * GRID;
    const dz = point.z - wall.z0 * GRID;
    const raw = dx * Math.cos(-angle) + dz * Math.sin(-angle);
    const offset = snapOpeningOffset(length, raw, def.width);
    const valid = canPlaceOpening(house, wall.id, type, offset) === null;
    const preview = { kind: 'opening' as const, wallId: wall.id, offset, valid };
    useInteraction.getState().setPreview(preview);
    return preview;
  };
  const openingHandlers = openingTool
    ? {
        onPointerMove: (e: ThreeEvent<PointerEvent>) => {
          if (aimBuilding()) return;
          e.stopPropagation();
          previewAt(e.point);
        },
        onPointerOut: () => {
          const p = useInteraction.getState().preview;
          if (p?.kind === 'opening' && p.wallId === wall.id) useInteraction.getState().setPreview(null);
        },
        onClick: (e: ThreeEvent<MouseEvent>) => {
          if (aimBuilding()) return;
          e.stopPropagation();
          if (e.delta > 8) return; // カメラを動かしたドラッグの終わり
          // 指でタップしたときは、事前にカーソルを当てていないので、ここで位置を決める
          const p = previewAt(e.point);
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
            ...(tool === 'window' ? { sash: s.defaults.sashType } : {}),
            panelColor: s.defaults.panelColor,
          };
          s.commit({ ...s.house, openings: [...s.house.openings, opening] });
          useInteraction.getState().setPreview({ ...p, valid: false });
        },
      }
    : {};

  const previewNameplate = (e: ThreeEvent<PointerEvent | MouseEvent>) => {
    const game = useGame.getState();
    const mount = nameplateMount(game.house, wall, e.point, e.ray.origin, game.defaults.furnitureType);
    useInteraction.getState().setPreview(mount ? { kind: 'nameplate', mount, type: game.defaults.furnitureType } : null);
    return mount;
  };
  const nameplateHandlers = placingNameplate && !foreign ? {
    onPointerMove: (e: ThreeEvent<PointerEvent>) => {
          if (aimBuilding()) return; e.stopPropagation(); previewNameplate(e); },
    onPointerOut: () => {
      const p = useInteraction.getState().preview;
      if (p?.kind === 'nameplate' && p.mount.wallId === wall.id) useInteraction.getState().setPreview(null);
    },
    onClick: (e: ThreeEvent<MouseEvent>) => {
          if (aimBuilding()) return;
      e.stopPropagation();
      if (e.delta > 12) return;
      const game = useGame.getState();
      const wallMount = previewNameplate(e);
      if (!wallMount) return game.notify('窓・ドアを避けて壁面に取り付けてください');
      const def = getFurniture(game.defaults.furnitureType), transform = mountedTransform(game.house, wallMount, def.id)!;
      const item = { id: newId('furniture'), type: def.id, level: wall.level, x: transform.x, z: transform.z,
        rotation: transform.rotation, color: def.id === 'nameplate' ? '#f2efe8' : def.colors[0], ...(def.label ? { label: game.defaults.nameplateText } : {}), wallMount };
      game.commit({ ...game.house, furniture: [...game.house.furniture, item] });
      useInteraction.setState({ ignorePartClickUntil: Date.now() + 100 });
      game.setTool('select'); game.select({ kind: 'furniture', id: item.id });
      useInteraction.getState().setPreview(null);
    },
  } : {};

  return (
    <group position={[wall.x0 * GRID, wallBaseY(wall), wall.z0 * GRID]} rotation={[0, angle, 0]}>
      {segments.map((segment, i) => (
        <mesh key={i} position={[segment.start, 0, 0]} geometry={segment.geometry}
          material={materialsFor(segment.outside)} castShadow receiveShadow {...handlers} {...openingHandlers} {...nameplateHandlers} />
      ))}
      {openings.map((o) => (
        <Opening key={o.id} opening={o} outside={outside === -1 ? -1 : 1} />
      ))}
    </group>
  );
}

