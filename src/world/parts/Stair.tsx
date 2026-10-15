import * as THREE from 'three';
import { GRID, STAIR_RAIL_HEIGHT, STAIR_RISERS, STAIR_WIDTH, STORY_HEIGHT, floorY } from '../../building/dimensions';
import { stairLocalRails, stairPlan } from '../../building/stairs';
import type { StairPart } from '../../building/types';
import { finishMaterial, plainMaterial } from '../materials';
import { usePart } from './usePart';

type StairModelPart = Pick<StairPart, 'level' | 'x' | 'z' | 'rot' | 'finish' | 'rail' | 'shape'>;
export function StairModel({ stair, ghost = false }: { stair: StairModelPart; ghost?: boolean }) {
  return <group position={[(stair.x + 0.5) * GRID, floorY(stair.level), (stair.z + 0.5) * GRID]} rotation={[0, stair.rot * Math.PI / 2, 0]}>
    <StairBody stair={stair} ghost={ghost} />
  </group>;
}
function StairBody({ stair, ghost, highlight = 'none' }: { stair: StairModelPart; ghost: boolean; highlight?: 'none' | 'selected' | 'hover' | 'erase' }) {
  const plan = stairPlan(stair.shape);
  const tread = finishMaterial(stair.finish, highlight), riser = plainMaterial('#eee9df', highlight), rail = plainMaterial('#72553b', highlight);
  return <group>
    {plan.flights.map((f, flight) => {
      const count = Math.max(1, Math.round(STAIR_RISERS * (f.top - f.bottom)));
      const run = f.length * GRID / count, rise = (f.top - f.bottom) * STORY_HEIGHT / count;
      const length = f.length * GRID, height = (f.top - f.bottom) * STORY_HEIGHT;
      return <group key={flight} position={[(f.x - 0.5) * GRID, f.bottom * STORY_HEIGHT, (f.z - 0.5) * GRID]} rotation-y={f.dir * Math.PI / 2}>
        {Array.from({ length: count }, (_, i) => <group key={i}>
          <mesh position={[0, (i + 1) * rise - 0.02, run * (i + 0.5)]} material={tread} castShadow={!ghost} receiveShadow><boxGeometry args={[STAIR_WIDTH, 0.04, run + 0.02]} /></mesh>
          <mesh position={[0, (i + 0.5) * rise - 0.02, run * i + 0.01]} material={riser} castShadow={!ghost}><boxGeometry args={[STAIR_WIDTH, rise - 0.04, 0.02]} /></mesh>
        </group>)}
        {[-1, 1].map(side => <mesh key={side} position={[side * (STAIR_WIDTH / 2 + 0.02), height / 2 - 0.12, length / 2]} rotation-x={-Math.atan2(height, length)} material={tread} castShadow={!ghost}>
          <boxGeometry args={[0.035, 0.25, Math.hypot(height, length)]} />
        </mesh>)}
      </group>;
    })}
    {plan.landings.map((l, i) => <mesh key={i} position={[((l.x0 + l.x1) / 2 - 0.5) * GRID, l.height * STORY_HEIGHT - 0.06, ((l.z0 + l.z1) / 2 - 0.5) * GRID]} material={tread} castShadow={!ghost} receiveShadow>
      <boxGeometry args={[(l.x1 - l.x0) * GRID, 0.12, (l.z1 - l.z0) * GRID]} />
    </mesh>)}
    {stairLocalRails(stair).map((r, i) => {
      const a = new THREE.Vector3((r.ax - 0.5) * GRID, r.bottom * STORY_HEIGHT + STAIR_RAIL_HEIGHT, (r.az - 0.5) * GRID);
      const b = new THREE.Vector3((r.bx - 0.5) * GRID, r.top * STORY_HEIGHT + STAIR_RAIL_HEIGHT, (r.bz - 0.5) * GRID);
      const vector = b.clone().sub(a), middle = a.clone().add(b).multiplyScalar(0.5);
      const rotation = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), vector.clone().normalize());
      return <group key={i}>
        <mesh position={middle} quaternion={rotation} material={rail}><cylinderGeometry args={[0.025, 0.025, vector.length(), 8]} /></mesh>
        {[0.08, 0.5, 0.92].map(t => <mesh key={t} position={a.clone().lerp(b, t).add(new THREE.Vector3(0, -STAIR_RAIL_HEIGHT / 2, 0))} material={rail}>
          <cylinderGeometry args={[0.018, 0.018, STAIR_RAIL_HEIGHT, 8]} />
        </mesh>)}
      </group>;
    })}
  </group>;
}
export function Stair({ stair }: { stair: StairPart }) {
  const { highlight, handlers } = usePart({ kind: 'stair', id: stair.id });
  return <group position={[(stair.x + 0.5) * GRID, floorY(stair.level), (stair.z + 0.5) * GRID]} rotation-y={stair.rot * Math.PI / 2} {...handlers}>
    <StairBody stair={stair} ghost={false} highlight={highlight} />
  </group>;
}

