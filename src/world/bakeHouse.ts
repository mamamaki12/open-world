import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { House, PartRef } from '../building/types';
import { isInteriorPart } from './buildingLod';
export interface BakedPart {geometry:THREE.BufferGeometry;material:THREE.Material}
export interface BakedHouse {full:BakedPart[];exterior:BakedPart[]}
const KEEP=['position','normal','uv'];
/** Bake full and exterior-only variants from one assembly, without mounting a second house. */
export function bakeHouse(root:THREE.Object3D,house:House,includeExterior=true):BakedHouse {
  root.updateMatrixWorld(true);
  const full=new Map<THREE.Material,THREE.BufferGeometry[]>(),exterior=new Map<THREE.Material,THREE.BufferGeometry[]>();
  const classification=new Map<string,boolean>();
  root.traverseVisible(o=>{
    const mesh=o as THREE.Mesh;if(!mesh.isMesh||(mesh as THREE.InstancedMesh).isInstancedMesh)return;
    let part:PartRef|undefined,parent:THREE.Object3D|null=o;
    while(parent&&!part){part=parent.userData.partRef;parent=parent.parent;}
    const key=part?part.kind+':'+part.id:'';let inside=classification.get(key);if(inside===undefined){inside=includeExterior&&isInteriorPart(house,part);classification.set(key,inside);}
    const mats=Array.isArray(mesh.material)?mesh.material:[mesh.material];
    const g=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();g.applyMatrix4(mesh.matrixWorld);
    if(!g.attributes.normal)g.computeVertexNormals();const count=g.attributes.position.count;
    if(!g.attributes.uv)g.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(count*2),2));
    const groups=Array.isArray(mesh.material)&&g.groups.length?g.groups:[{start:0,count,materialIndex:0}];
    for(const grp of groups){
      const mat=mats[grp.materialIndex??0];if(!mat||!mat.visible)continue;
      const piece=new THREE.BufferGeometry();
      for(const name of KEEP){const a=g.attributes[name] as THREE.BufferAttribute;piece.setAttribute(name,new THREE.BufferAttribute((a.array as Float32Array).slice(grp.start*a.itemSize,(grp.start+Math.min(grp.count,count-grp.start))*a.itemSize),a.itemSize));}
      const list=full.get(mat)??[];list.push(piece);full.set(mat,list);
      if(includeExterior&&!inside){const list=exterior.get(mat)??[];list.push(piece.clone());exterior.set(mat,list);}
    }
    g.dispose();
  });
  const merge=(buckets:Map<THREE.Material,THREE.BufferGeometry[]>):BakedPart[]=>[...buckets].flatMap(([material,list])=>{const geometry=mergeGeometries(list,false);list.forEach(p=>p.dispose());if(!geometry)return [];geometry.computeBoundingSphere();return [{geometry,material}];});
  return {full:merge(full),exterior:merge(exterior)};
}

