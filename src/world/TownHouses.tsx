// 町に最初から建っているほかの住人の家（src/building/townHouses.ts）を描く。
// 家は部品がとても多い（マンションは数千個）ので、いちど見えない場所で普通の家と同じ部品で組み立ててから、
// 素材ごとに1つのメッシュへまとめて描く。まとめるのは1フレームに1軒ずつ
import { useMemo, useState } from 'react';
import * as THREE from 'three';
import { createPortal, useFrame } from '@react-three/fiber';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { TOWN_HOUSE_PLOTS, townHouseAt } from '../building/townHouses';
import { plotX, plotZ } from '../economy/town';
import { HouseParts } from './HouseView';

interface BakedPart { geometry: THREE.BufferGeometry; material: THREE.Material }
const baked = new Map<string, BakedPart[]>();

const KEEP = ['position', 'normal', 'uv'];

/** 組み立てた家の部品を、素材ごとに1つのジオメトリへまとめる */
function bake(root: THREE.Object3D): BakedPart[] {
  root.updateMatrixWorld(true);
  const buckets = new Map<THREE.Material, THREE.BufferGeometry[]>();
  root.traverseVisible((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || (mesh as THREE.InstancedMesh).isInstancedMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const g = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
    g.applyMatrix4(mesh.matrixWorld);
    if (!g.attributes.normal) g.computeVertexNormals();
    const count = g.attributes.position.count;
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(count * 2), 2));
    for (const name of Object.keys(g.attributes)) if (!KEEP.includes(name)) g.deleteAttribute(name);
    const groups = Array.isArray(mesh.material) && g.groups.length ? g.groups : [{ start: 0, count, materialIndex: 0 }];
    for (const grp of groups) {
      const mat = mats[grp.materialIndex ?? 0];
      if (!mat || !mat.visible) continue;
      const part = new THREE.BufferGeometry();
      for (const name of KEEP) {
        const a = g.attributes[name] as THREE.BufferAttribute;
        part.setAttribute(name, new THREE.BufferAttribute((a.array as Float32Array).slice(grp.start * a.itemSize, (grp.start + Math.min(grp.count, count - grp.start)) * a.itemSize), a.itemSize));
      }
      const list = buckets.get(mat) ?? [];
      list.push(part);
      buckets.set(mat, list);
    }
    g.dispose();
  });
  const out: BakedPart[] = [];
  for (const [material, list] of buckets) {
    const geometry = mergeGeometries(list, false);
    list.forEach((p) => p.dispose());
    if (geometry) {
      geometry.computeBoundingSphere();
      out.push({ geometry, material });
    }
  }
  return out;
}

/** 見えない場所で1軒を組み立て、次のフレームでまとめる */
function Baker({ id, onDone }: { id: string; onDone: (id: string) => void }) {
  const scene = useMemo(() => new THREE.Scene(), []);
  const plot = Number(Object.keys(TOWN_HOUSE_PLOTS).find((p) => TOWN_HOUSE_PLOTS[Number(p)] === id));
  const house = townHouseAt(plot);
  const [frames, setFrames] = useState(0);
  useFrame(() => {
    if (frames < 1) { setFrames(frames + 1); return; }
    if (!baked.has(id)) baked.set(id, bake(scene));
    onDone(id);
  });
  if (!house) return null;
  return createPortal(<HouseParts house={house} showRoofs />, scene);
}

/** 持ち主のいない区画（自分の土地・売り土地を除く）に建っている家 */
export function TownHouses({ shiftX, shiftZ, skip }: { shiftX: number; shiftZ: number; skip: Set<number> }) {
  const [, setVersion] = useState(0);
  const designs = useMemo(() => [...new Set(Object.values(TOWN_HOUSE_PLOTS))], []);
  const next = designs.find((d) => !baked.has(d));
  return (
    <group name="town-houses">
      {next && <Baker key={next} id={next} onDone={() => setVersion((v) => v + 1)} />}
      {Object.entries(TOWN_HOUSE_PLOTS).map(([p, id]) => {
        const plot = Number(p);
        const parts = baked.get(id);
        if (skip.has(plot) || !parts) return null;
        return (
          <group key={plot} position={[plotX(plot) + shiftX, 0, plotZ(plot) + shiftZ]}>
            {parts.map((part, i) => <mesh key={i} geometry={part.geometry} material={part.material} castShadow receiveShadow />)}
          </group>
        );
      })}
    </group>
  );
}
