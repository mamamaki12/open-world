import { useMemo } from 'react';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { roofShape } from '../../building/roof';
import type { RoofPart } from '../../building/types';
import { finishMaterial } from '../materials';
import { slabGeometry } from '../geometry';
import { usePart } from './usePart';

export function Roof({ roof }: { roof: RoofPart }) {
  const { highlight, handlers } = usePart({ kind: 'roof', id: roof.id });
  const { planes, gables } = useMemo(() => {
    const shape = roofShape(roof);
    const merge = (slabs: typeof shape.planes) => {
      if (!slabs.length) return null;
      const parts = slabs.map(slabGeometry);
      const g = mergeGeometries(parts)!;
      parts.forEach((p) => p.dispose());
      return g;
    };
    return { planes: merge(shape.planes), gables: merge(shape.gables) };
  }, [roof.x0, roof.z0, roof.x1, roof.z1, roof.level, roof.type, roof.axis, roof.flip, roof.pitch, roof.overhang]);

  return (
    <group {...handlers}>
      {planes && <mesh geometry={planes} material={finishMaterial(roof.finish, highlight)} castShadow receiveShadow />}
      {gables && <mesh geometry={gables} material={finishMaterial(roof.gableFinish, highlight)} castShadow receiveShadow />}
    </group>
  );
}
