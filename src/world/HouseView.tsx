import { BuildingDetail } from './BuildingDetail';
import { houseEnvelope, isInteriorPart } from './buildingLod';
import { DistantHouse } from './DistantHouse';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { markInteriorSurfaces,interiorRegions } from './interiorShade';
import { hasRoomCeiling } from '../building/roomLighting';
import * as THREE from 'three';
import { getFurniture, getOpening, furnitureFootprint } from '../catalog';
import { GRID, MAX_LEVEL, WALL_HEIGHT, WALL_THICKNESS, floorY } from '../building/dimensions';
import { furnitureBaseY, stairHoles, wallBaseY, wallHeight, wallLength, wallOutsideSide } from '../building/rules';
import type { House } from '../building/types';
import { useGame } from '../state/store';
import { useInteraction } from '../state/interaction';
import { Floor } from './parts/Floor';
import { Furniture, FurnitureModel } from './parts/Furniture';
import { Roof } from './parts/Roof';
import { Stair, StairModel } from './parts/Stair';
import { Wall } from './parts/Wall';
import { mountedTransform } from '../building/mounts';
import { HouseScope } from './HouseScope';
import type { ActivateHouse } from './HouseScope';

export function HouseView() {
  const house = useGame((s) => s.house);
  const tool = useGame((s) => s.tool);
  const walking = useGame((s) => s.mode === 'walk');
  const editingFurniture = useGame((s) => s.selection?.kind === 'furniture');

  // 家はいつも全部見せる。屋根だけは、建築モードで中を作る道具（床・壁・ドア・窓・階段・家具）を
  // 持っている間は隠して、壁の上や2階を触れるようにする。選択・削除・屋根ツールでは見せる
  const insideTool = tool !== 'roof' && tool !== 'select' && tool !== 'erase';
  const showRoofs = walking || (!insideTool && !editingFurniture);

  return (
    <>
      <group name="house">
        <BuildingDetail bounds={houseEnvelope(house).bounds} forceFull={!walking || tool !== 'select' || editingFurniture}>{tier => tier === 'distant' ? <DistantHouse house={house}/> : <HouseParts house={house} showRoofs={showRoofs} exteriorOnly={tier === 'exterior'}/>}</BuildingDetail>
      </group>
      {/* プレビューは家の外に置く（マウスの下の面を調べるときに当たらないように） */}
      <PreviewView />
    </>
  );
}

/** 家の部品をまとめて描く（いまの土地の家と、町に建っているほかの土地の家で使う） */
export function HouseParts({ house, showRoofs = true, activate, exteriorOnly = false }: { house: House; showRoofs?: boolean; activate?: ActivateHouse; exteriorOnly?: boolean }) {
  const root=useRef<THREE.Group>(null);
  useLayoutEffect(()=>{const group=root.current;if(!group)return;markInteriorSurfaces(group,house);interiorRegions.set(group,house);return()=>{interiorRegions.delete(group);};},[house,showRoofs,exteriorOnly]);
  const openingsByWall = useMemo(() => {
    const m = new Map<string, House['openings']>();
    for (const o of house.openings) m.set(o.wallId, [...(m.get(o.wallId) ?? []), o]);
    return m;
  }, [house.openings]);

  return (
    <HouseScope.Provider value={{ house, activate }}>
      <group ref={root}>
      {house.floors.map((f) => (
        <Floor key={f.id} floor={f} holes={stairHoles(house, f.level)} stairwells={stairHoles(house, f.level + 1)} roofs={house.roofs.filter((r) => r.level === f.level)} />
      ))}
      {house.walls.filter(w => !exteriorOnly || !isInteriorPart(house, {kind:'wall',id:w.id})).map((w) => (
        <Wall key={w.id} wall={w} openings={openingsByWall.get(w.id) ?? []} outside={wallOutsideSide(house, w)} />
      ))}
      {house.stairs.filter(s => !exteriorOnly || !isInteriorPart(house, {kind:'stair',id:s.id})).map((s) => (
        <Stair key={s.id} stair={s} />
      ))}
      {house.furniture.filter(f => !exteriorOnly || !isInteriorPart(house, {kind:'furniture',id:f.id})).map((f) => (
        <Furniture key={f.id} item={f} />
      ))}
      {showRoofs && house.roofs.map((r) => (
        <Roof key={r.id} roof={r} />
      ))}
      </group>
    </HouseScope.Provider>
  );
}

const okMat = new THREE.MeshBasicMaterial({ color: '#3d8bff', transparent: true, opacity: 0.35, depthWrite: false });
const badMat = new THREE.MeshBasicMaterial({ color: '#ff4a3d', transparent: true, opacity: 0.4, depthWrite: false });
const eraseMat = new THREE.MeshBasicMaterial({ color: '#ff4a3d', transparent: true, opacity: 0.18, depthWrite: false });

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
    case 'nameplate': {
      const def = getFurniture(preview.type ?? 'nameplate'), transform = mountedTransform(house, preview.mount, def.id);
      if (!transform) return null;
      return <group position={[transform.x, transform.y, transform.z]} rotation={[0, transform.rotation * Math.PI / 180, 0]}>
        <FurnitureModel def={def} color={def.id === 'nameplate' ? '#f2efe8' : def.colors[0]} label={defaults.nameplateText} highlight="hover" />
      </group>;
    }
    case 'rect': {
      const { rect } = preview;
      const w = (rect.x1 - rect.x0) * GRID;
      const d = (rect.z1 - rect.z0) * GRID;
      if (preview.tool === 'erase') {
        // まとめて消す範囲：地面から最上階の上までの赤い箱
        const top = floorY(MAX_LEVEL + 1) + 0.5;
        return (
          <mesh position={[rect.x0 * GRID + w / 2, top / 2, rect.z0 * GRID + d / 2]} material={eraseMat}>
            <boxGeometry args={[w, top, d]} />
          </mesh>
        );
      }
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
      const h = wallHeight({ height: defaults.wallHeight });
      return (
        <mesh position={[cx, wallBaseY({ level, height: defaults.wallHeight }) + h / 2, cz]} rotation={[0, angle, 0]} material={preview.valid ? okMat : badMat}>
          <boxGeometry args={[len + WALL_THICKNESS, h, WALL_THICKNESS + 0.02]} />
        </mesh>
      );
    }
    case 'stair':
      return (
        <group>
          <StairModel stair={{ level, x: preview.x, z: preview.z, rot: stairRot, shape: defaults.stairShape, finish: defaults.stairFinish, rail: defaults.stairRail }} ghost />
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
        <group position={[preview.x, furnitureBaseY(house, { level, type: defaults.furnitureType, x: preview.x, z: preview.z }), preview.z]} rotation={[0, (defaults.furnitureRotation * Math.PI) / 180, 0]}>
          <FurnitureModel def={def} color={def.colors[0]} label={defaults.nameplateText} />
          <mesh position={[0, 0.01, 0]} material={def.ceiling&&!hasRoomCeiling(house,level,preview.x,preview.z)?badMat:okMat}>
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
        <group position={[wall.x0 * GRID, wallBaseY(wall), wall.z0 * GRID]} rotation={[0, angle, 0]}>
          <mesh position={[offset, def.sill + def.height / 2, 0]} material={preview.valid ? okMat : badMat}>
            <boxGeometry args={[def.width, def.height, WALL_THICKNESS + 0.06]} />
          </mesh>
        </group>
      );
    }
  }
}


