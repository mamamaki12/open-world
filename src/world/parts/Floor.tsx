import { useMemo } from 'react';
import { SLAB_THICKNESS, floorY } from '../../building/dimensions';
import type { Rect } from '../../building/rules';
import type { FloorPart } from '../../building/types';
import { finishMaterial, plainMaterial } from '../materials';
import { floorBodyGeometry, floorStrips, floorTopGeometry } from '../geometry';
import { usePart } from './usePart';

/** 床。1階は基礎（コンクリート）の上、2階はスラブの上。階段の穴は開けておく */
export function Floor({ floor, holes }: { floor: FloorPart; holes: Rect[] }) {
  const { highlight, handlers } = usePart({ kind: 'floor', id: floor.id });
  const holesKey = holes.map((h) => `${h.x0},${h.z0},${h.x1},${h.z1}`).join('|');
  const { top, body } = useMemo(() => {
    const strips = floorStrips(floor, holes);
    const y = floorY(floor.level);
    const bottom = floor.level === 0 ? 0 : y - SLAB_THICKNESS;
    return { top: floorTopGeometry(strips, y + 0.003), body: floorBodyGeometry(strips, bottom, y) };
  }, [floor.x0, floor.z0, floor.x1, floor.z1, floor.level, holesKey]);

  const bodyColor = floor.level === 0 ? '#a7a49d' : '#f2f1ee';
  return (
    <group {...handlers}>
      {top && <mesh geometry={top} material={finishMaterial(floor.finish, highlight)} receiveShadow />}
      {body && (
        <mesh
          geometry={body}
          material={plainMaterial(bodyColor, highlight, { roughness: 0.9 })}
          castShadow={floor.level > 0}
          receiveShadow
        />
      )}
    </group>
  );
}

