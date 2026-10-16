import * as THREE from 'three';

/** 椅子の脚の隙間でも外形を狙えば選べる。手前の壁などは通り越さない。 */
export function aimFurnitureTarget(house:THREE.Object3D|undefined, ray:THREE.Ray, maxDistance:number) {
  let best:THREE.Intersection|undefined;
  house?.traverse(object=>{
    if(object.userData.partRef?.kind!=='furniture')return;
    let p:THREE.Object3D|null=object;while(p){if(!p.visible)return;p=p.parent;}
    const box=new THREE.Box3().setFromObject(object),point=ray.intersectBox(box,new THREE.Vector3());
    if(!point)return;
    const distance=ray.origin.distanceTo(point);
    if(distance<=maxDistance&&(!best||distance<best.distance))best={distance,point,object};
  });
  return best;
}
