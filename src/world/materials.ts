// 仕上げ（素材＋色）から Three.js のマテリアルを作る。同じ組み合わせは使い回す。
import * as THREE from 'three';
import { getMaterial } from '../catalog';
import type { Finish } from '../building/types';
import { patternTexture } from './textures';

export type Highlight = 'none' | 'selected' | 'hover' | 'erase';

const HIGHLIGHT_EMISSIVE: Record<Highlight, string> = {
  none: '#000000',
  selected: '#2a6cff',
  hover: '#3a7a3a',
  erase: '#c0302a',
};

const cache = new Map<string, THREE.MeshStandardMaterial>();

function applyHighlight(m: THREE.MeshStandardMaterial, h: Highlight) {
  m.emissive = new THREE.Color(HIGHLIGHT_EMISSIVE[h]);
  m.emissiveIntensity = h === 'none' ? 0 : 0.35;
}

export function finishMaterial(finish: Finish, highlight: Highlight = 'none'): THREE.MeshStandardMaterial {
  const key = `${finish.material}|${finish.color}|${highlight}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const def = getMaterial(finish.material);
  const tex = patternTexture(def.pattern);
  const m = new THREE.MeshStandardMaterial({
    color: new THREE.Color(finish.color),
    map: tex,
    bumpMap: tex,
    bumpScale: def.bump * 40,
    roughness: def.roughness,
    metalness: def.metalness,
    side: THREE.DoubleSide,
  });
  applyHighlight(m, highlight);
  cache.set(key, m);
  return m;
}

export function plainMaterial(
  color: string,
  highlight: Highlight = 'none',
  opts: { roughness?: number; metalness?: number } = {},
): THREE.MeshStandardMaterial {
  const key = `plain|${color}|${highlight}|${opts.roughness ?? 0.6}|${opts.metalness ?? 0}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const m = new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    roughness: opts.roughness ?? 0.6,
    metalness: opts.metalness ?? 0,
  });
  applyHighlight(m, highlight);
  cache.set(key, m);
  return m;
}

let glass: THREE.MeshPhysicalMaterial | null = null;
export function glassMaterial(): THREE.MeshPhysicalMaterial {
  if (glass) return glass;
  glass = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#a9c4d6'),
    roughness: 0.05,
    metalness: 0,
    transparent: true,
    opacity: 0.35,
    envMapIntensity: 1.5,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  return glass;
}
