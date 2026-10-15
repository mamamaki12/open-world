import { useMemo } from 'react';
import * as THREE from 'three';
import { getFurniture, getOpening, furnitureFootprint } from '../catalog';
import { GRID, WALL_HEIGHT, WALL_THICKNESS, floorY } from '../building/dimensions';
import { stairHoles, wallLength, wallOutsideSide } from '../building/rules';
import type { House } from '../building/types';
import { useGame } from '../state/store';
import { useInteraction } from '../state/interaction';
import { Floor } from './parts/Floor';
import { Furniture, FurnitureModel } from './parts/Furniture';
import { Roof } from './parts/Roof';
import { Stair, StairModel } from './parts/Stair';
import { Wall } from './parts/Wall';

export function HouseView() {
  const house = useGame((s) => s.house);
  const activeLevel = useGame((s) => s.activeLevel);
  const showAll = useGame((s) => s.showAll);
  const tool = useGame((s) => s.tool);
  const walking = useGame((s) => s.mode === 'walk');

  // 歩きモードでは家全体を見せる
  const visible = (level: number) => walking || showAll || level <= activeLevel;
  // 今の階の屋根は、中を作る道具（床・壁・ドア・窓・階段・家具）を持っている間だけ隠す。
  // 選択・削除・屋根ツールでは見せる（置いた屋根を選んで直せるように）
  const insideTool = tool !== 'roof' && tool !== 'select' && tool !== 'erase';
  const roofVisible = (level: number) =>
    walking || showAll || level < activeLevel || (level === activeLevel && !insideTool);

  const openingsByWall = useMemo(() => {
    const m = new Map<string, House['openings']>();
    for (const o of house.openings) m.set(o.wallId, [...(m.get(o.wallId) ?? []), o]);
    return m;
  }, [house.openings]);

  return (
    <group name="house">
      {house.floors.filter((f) => visible(f.level)).map((f) => (
        <Floor key={f.id} floor={f} holes={stairHoles(house, f.level)} stairwells={stairHoles(house, f.level + 1)} />
      ))}
      {house.walls.filter((w) => visible(w.level)).map((w) => (
        <Wall key={w.id} wall={w} openings={openingsByWall.get(w.id) ?? []} outside={wallOutsideSide(house, w)} />
      ))}
      {house.stairs.filter((s) => visible(s.level)).map((s) => (
        <Stair key={s.id} stair={s} />
      ))}
      {house.furniture.filter((f) => visible(f.level)).map((f) => (
        <Furniture key={f.id} item={f} />
      ))}
      {house.roofs.filter((r) => roofVisible(r.level)).map((r) => (
        <Roof key={r.id} roof={r} />
      ))}
      <PreviewView />
    </group>
  );
}

const okMat = new THREE.MeshBasicMaterial({ color: '#3d8bff', transparent: true, opacity: 0.35, depthWrite: false });
const badMat = new THREE.MeshBasicMaterial({ color: '#ff4a3d', transparent: true, opacity: 0.4, depthWrite: false });

/** 置く前の半透明のプレビュー */
function PreviewView() {
  const preview = useInteraction((s) => s.preview);
  const stairRot = useInteraction((s) => s.stairRot);
  const level = useGame((s) => s.activeLevel);
  const defaults = useGame((s) => s.defaults);
  const house = useGame((s) => s.house);
  const tool = useGame((s) => s.tool);
  if (!preview) return null;
  const y = floorY(level);

  switch (preview.kind) {
    case 'rect': {
      const { rect } = preview;
      const w = (rect.x1 - rect.x0) * GRID;
      const d = (rect.z1 - rect.z0) * GRID;
      const h = preview.tool === 'roof' ? 0.1 : 0.05;
      const py = preview.tool === 'roof' ? y + WALL_HEIGHT + h / 2 : y + h / 2;
      return (
        <mesh position={[rect.x0 * GRID + w / 2, py, rect.z0 * GRID + d / 2]} material={preview.valid ? okMat : badMat}>
          <boxGeometry args={[w, h, d]} />
        </mesh>
      );
    }
    case 'wall': {
      const len = Math.max(Math.hypot(preview.x1 - preview.x0, preview.z1 - preview.z0) * GRID, 0.05);
      const cx = ((preview.x0 + preview.x1) / 2) * GRID;
      const cz = ((preview.z0 + preview.z1) / 2) * GRID;
      const angle = -Math.atan2(preview.z1 - preview.z0, preview.x1 - preview.x0);
      return (
        <mesh position={[cx, y + WALL_HEIGHT / 2, cz]} rotation={[0, angle, 0]} material={preview.valid ? okMat : badMat}>
          <boxGeometry args={[len + WALL_THICKNESS, WALL_HEIGHT, WALL_THICKNESS + 0.02]} />
        </mesh>
      );
    }
    case 'stair':
      return (
        <group>
          <StairModel stair={{ level, x: preview.x, z: preview.z, rot: stairRot, finish: defaults.stairFinish }} ghost />
          {!preview.valid && (
            <mesh position={[(preview.x + 0.5) * GRID, y + 0.05, (preview.z + 0.5) * GRID]} material={badMat}>
              <boxGeometry args={[GRID, 0.1, GRID]} />
            </mesh>
          )}
        </group>
      );
    case 'furniture': {
      const def = getFurniture(defaults.furnitureType);
      const fp = furnitureFootprint(def);
      return (
        <group position={[preview.x, y, preview.z]} rotation={[0, (defaults.furnitureRotation * Math.PI) / 180, 0]}>
          <FurnitureModel def={def} color={def.colors[0]} />
          <mesh position={[0, 0.01, 0]} material={okMat}>
            <boxGeometry args={[fp.w, 0.02, fp.d]} />
          </mesh>
        </group>
      );
    }
    case 'opening': {
      const wall = house.walls.find((w) => w.id === preview.wallId);
      if (!wall) return null;
      const type = tool === 'door' ? defaults.doorType : defaults.windowType;
      const def = getOpening(type);
      const angle = -Math.atan2(wall.z1 - wall.z0, wall.x1 - wall.x0);
      const len = wallLength(wall);
      const offset = Math.min(preview.offset, len);
      return (
        <group position={[wall.x0 * GRID, floorY(wall.level), wall.z0 * GRID]} rotation={[0, angle, 0]}>
          <mesh position={[offset, def.sill + def.height / 2, 0]} material={preview.valid ? okMat : badMat}>
            <boxGeometry args={[def.width, def.height, WALL_THICKNESS + 0.06]} />
          </mesh>
        </group>
      );
    }
  }
}
