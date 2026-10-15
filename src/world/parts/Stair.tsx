import { GRID, STAIR_LENGTH, STAIR_RAIL_HEIGHT, STAIR_RISERS, STAIR_WIDTH, STORY_HEIGHT, floorY } from '../../building/dimensions';
import { stairRailXs } from '../../building/rules';
import type { StairPart } from '../../building/types';
import { finishMaterial, plainMaterial } from '../materials';
import { usePart } from './usePart';

/** 直階段。ローカル座標で +Z に向かって上る。幅1マス × 長さ4マス */
export function StairModel({ stair, ghost = false }: { stair: Pick<StairPart, 'level' | 'x' | 'z' | 'rot' | 'finish' | 'rail'>; ghost?: boolean }) {
  return (
    <group
      position={[(stair.x + 0.5) * GRID, floorY(stair.level), (stair.z + 0.5) * GRID]}
      rotation={[0, (stair.rot * Math.PI) / 2, 0]}
    >
      <StairBody finish={stair.finish} rail={stair.rail} ghost={ghost} />
    </group>
  );
}

function StairBody({ finish, rail: railSide, ghost, highlight = 'none' }: { finish: StairPart['finish']; rail: StairPart['rail']; ghost: boolean; highlight?: 'none' | 'selected' | 'hover' | 'erase' }) {
  const width = STAIR_WIDTH;
  const run = (STAIR_LENGTH * GRID) / STAIR_RISERS;
  const rise = STORY_HEIGHT / STAIR_RISERS;
  const z0 = -GRID / 2;
  const tread = finishMaterial(finish, highlight);
  const riser = plainMaterial('#f2f1ee', highlight);
  const rail = plainMaterial('#6b5546', highlight);
  const steps = [];
  for (let i = 0; i < STAIR_RISERS; i++) {
    const top = (i + 1) * rise;
    steps.push(
      <group key={i}>
        <mesh position={[0, top - 0.02, z0 + run * (i + 0.5)]} material={tread} castShadow={!ghost} receiveShadow>
          <boxGeometry args={[width, 0.04, run + 0.02]} />
        </mesh>
        <mesh position={[0, top - rise / 2 - 0.02, z0 + run * i + 0.01]} material={riser} castShadow={!ghost} receiveShadow>
          <boxGeometry args={[width, rise - 0.04, 0.02]} />
        </mesh>
      </group>,
    );
  }
  // 側板（ささら桁）と手すり
  const len = STAIR_LENGTH * GRID;
  const slope = Math.atan2(STORY_HEIGHT, len);
  const diag = Math.hypot(STORY_HEIGHT, len);
  return (
    <group>
      {steps}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * (width / 2 + 0.02), STORY_HEIGHT / 2 - 0.12, z0 + len / 2]}
          rotation={[-slope, 0, 0]}
          material={tread}
          castShadow={!ghost}
        >
          <boxGeometry args={[0.035, 0.25, diag]} />
        </mesh>
      ))}
      {stairRailXs(railSide).map((x) => (
        <mesh key={x} position={[x, STORY_HEIGHT / 2 + STAIR_RAIL_HEIGHT, z0 + len / 2]} rotation={[Math.PI / 2 - slope, 0, 0]} material={rail}>
          <cylinderGeometry args={[0.02, 0.02, diag, 8]} />
        </mesh>
      ))}
    </group>
  );
}

export function Stair({ stair }: { stair: StairPart }) {
  const { highlight, handlers } = usePart({ kind: 'stair', id: stair.id });
  return (
    <group
      position={[(stair.x + 0.5) * GRID, floorY(stair.level), (stair.z + 0.5) * GRID]}
      rotation={[0, (stair.rot * Math.PI) / 2, 0]}
      {...handlers}
    >
      <StairBody finish={stair.finish} rail={stair.rail} ghost={false} highlight={highlight} />
    </group>
  );
}
