import { useMemo } from 'react';
import { SLAB_THICKNESS, WALL_HEIGHT, floorY } from '../../building/dimensions';
import type { Rect } from '../../building/rules';
import type { FloorPart } from '../../building/types';
import { finishMaterial, plainMaterial } from '../materials';
import { floorBodyGeometry, floorStrips, floorTopGeometry } from '../geometry';
import { useGame } from '../../state/store';
import { usePart } from './usePart';

/**
 * 床。1階は基礎（コンクリート）の上、2階はスラブの上。階段の穴は開けておく。
 * roofs：この階の壁に載った屋根の範囲。天井はその下にだけ張る
 */
export function Floor({ floor, holes, stairwells, roofs }: { floor: FloorPart; holes: Rect[]; stairwells: Rect[]; roofs: Rect[] }) {
  const { highlight, handlers } = usePart({ kind: 'floor', id: floor.id });
  // 天井の影は歩きモードだけ（上から見下ろす建築モードで部屋が暗くならないように）
  const walking = useGame((s) => s.mode === 'walk');
  const key = (rs: Rect[]) => rs.map((h) => `${h.x0},${h.z0},${h.x1},${h.z1}`).join('|');
  const holesKey = key(holes);
  const wellsKey = key(stairwells);
  const roofsKey = key(roofs);
  const { top, body, ceiling } = useMemo(() => {
    const strips = floorStrips(floor, holes);
    const y = floorY(floor.level);
    const bottom = floor.level === 0 ? 0 : y - SLAB_THICKNESS;
    // 天井：下向きの面だけなので、上から見下ろすときは見えない。屋根のない所には張らず、階段の上は吹き抜けにする
    const ceilingY = y + WALL_HEIGHT - 0.012;
    return {
      top: floorTopGeometry(strips, y + 0.003),
      body: floorBodyGeometry(strips, bottom, y),
      ceiling: floorTopGeometry(floorStrips(floor, stairwells, roofs), ceilingY, true),
    };
  }, [floor.x0, floor.z0, floor.x1, floor.z1, floor.level, holesKey, wellsKey, roofsKey]);

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
      {ceiling && <mesh geometry={ceiling} material={plainMaterial('#f4f3ef', 'none', { roughness: 0.95 })} castShadow={walking} receiveShadow />}
    </group>
  );
}

