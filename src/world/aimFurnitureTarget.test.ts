import {expect,it} from 'vitest';
import * as THREE from 'three';
import {aimFurnitureTarget} from './aimFurnitureTarget';
it('selects the outline of furniture without reaching through an occluder',()=>{
  const house=new THREE.Group(),chair=new THREE.Group();chair.userData.partRef={kind:'furniture',id:'chair'};
  for(const x of [-.4,.4]){const leg=new THREE.Mesh(new THREE.BoxGeometry(.1,1,.1));leg.position.set(x,.5,-3);chair.add(leg);}
  house.add(chair);house.updateMatrixWorld(true);
  const ray=new THREE.Ray(new THREE.Vector3(0,.5,0),new THREE.Vector3(0,0,-1));
  expect(aimFurnitureTarget(house,ray,7)?.object).toBe(chair);
  expect(aimFurnitureTarget(house,ray,2)).toBeUndefined();
});
