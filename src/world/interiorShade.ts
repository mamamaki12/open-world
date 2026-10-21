import * as THREE from 'three';
import type { House,PartRef } from '../building/types';
import { floorY } from '../building/dimensions';
import { indoorSurface } from '../building/roomLighting';

/** One interpolated value, no per-fragment room searches, lights or shadow maps. */
export const interiorShadeEnabled={value:0};
export const interiorRegions=new Map<THREE.Group,House>();
export function shadeInteriorMaterial(m:THREE.Material) {
  if (!(m instanceof THREE.MeshStandardMaterial)||m.userData.interiorShade) return;
  m.userData.interiorShade=true;
  m.onBeforeCompile=shader=>{
    shader.uniforms.interiorShadeEnabled=interiorShadeEnabled;
    shader.vertexShader=shader.vertexShader.replace('#include <common>',
      '#include <common>\nattribute float indoorCoverage; varying float vIndoorCoverage;')
      .replace('#include <begin_vertex>','#include <begin_vertex>\nvIndoorCoverage=indoorCoverage;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',
      '#include <common>\nvarying float vIndoorCoverage; uniform float interiorShadeEnabled;')
      .replace('#include <lights_fragment_begin>',THREE.ShaderChunk.lights_fragment_begin.replace(
        'getDirectionalLightInfo( directionalLight, directLight );',
        'getDirectionalLightInfo( directionalLight, directLight );\ndirectLight.color*=mix(1.0,0.06,vIndoorCoverage*interiorShadeEnabled);'))
      .replace('#include <lights_fragment_end>',`
        float indoorSky=mix(1.0,0.06,vIndoorCoverage*interiorShadeEnabled);
        #if defined(RE_IndirectDiffuse)
          irradiance*=indoorSky; iblIrradiance*=indoorSky;
        #endif
        #if defined(RE_IndirectSpecular)
          radiance*=indoorSky; clearcoatRadiance*=indoorSky;
        #endif
        #include <lights_fragment_end>`);
  };
  m.customProgramCacheKey=()=> 'interior-shade-v1';
  m.needsUpdate=true;
}

/** Evaluate only on an assembly/edit. Baked geometry retains the attribute. */
export function markInteriorSurfaces(root:THREE.Group,house:House) {
  const levels=new Map<string,number>();
  for(const [kind,items] of Object.entries({floor:house.floors,wall:house.walls,stair:house.stairs,roof:house.roofs,furniture:house.furniture}))
    for(const p of items)levels.set(kind+':'+p.id,p.level);
  for(const o of house.openings){const w=house.walls.find(w=>w.id===o.wallId);if(w)levels.set('opening:'+o.id,w.level);}
  const hints=new WeakMap<THREE.Mesh,number|undefined>();
  markCoveredSurfaces(root,(x,y,z,mesh)=>{
    if(!hints.has(mesh)){
      let node:THREE.Object3D|null=mesh,part:PartRef|undefined;
      while(node&&node!==root&&!part){part=node.userData.partRef;node=node.parent;}
      hints.set(mesh,part?levels.get(part.kind+':'+part.id):undefined);
    }
    let level=hints.get(mesh);if(level!==undefined&&y<floorY(level)-.06)level--;
    return indoorSurface(house,x,y,z,level);
  });
}
export function markCoveredSurfaces(root:THREE.Group,covered:(x:number,y:number,z:number,mesh:THREE.Mesh)=>boolean) {
  root.updateWorldMatrix(true,true);
  const inverse=root.matrixWorld.clone().invert(),matrix=new THREE.Matrix4(),normalMatrix=new THREE.Matrix3();
  const p=new THREE.Vector3(),n=new THREE.Vector3();
  root.traverse(o=>{
    const mesh=o as THREE.Mesh;if(!mesh.isMesh||!mesh.geometry?.attributes.position)return;
    const g=mesh.geometry,positions=g.attributes.position,normals=g.attributes.normal;
    matrix.multiplyMatrices(inverse,mesh.matrixWorld);normalMatrix.getNormalMatrix(matrix);
    const coverage=new Float32Array(positions.count);
    for(let i=0;i<positions.count;i++){
      p.fromBufferAttribute(positions,i).applyMatrix4(matrix);
      if(normals){n.fromBufferAttribute(normals,i).applyMatrix3(normalMatrix).normalize();p.addScaledVector(n,.025);}
      coverage[i]=covered(p.x,p.y,p.z,mesh)?1:0;
    }
    g.setAttribute('indoorCoverage',new THREE.BufferAttribute(coverage,1));
    for(const mat of Array.isArray(mesh.material)?mesh.material:[mesh.material])shadeInteriorMaterial(mat);
  });
}
