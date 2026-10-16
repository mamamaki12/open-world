import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { MutableRefObject } from 'react';
import type { Rig } from './Avatar';
import { tailoredLimb } from './avatarGeometry';

/** One continuous surface across elbow/knee, deformed by the existing IK rig. */
export function TailoredLimb({rig,index,leg,style,cloth,skin,wide=false}:{rig:MutableRefObject<Rig>;index:number;leg?:boolean;style:string;cloth:THREE.Material;skin:THREE.Material;wide?:boolean}) {
  const mesh=useMemo(()=>{
    const upper=new THREE.Bone(),joint=new THREE.Bone();
    joint.position.y=leg?-.43:-.27;upper.add(joint);
    const m=new THREE.SkinnedMesh(tailoredLimb(!!leg,style,wide),[cloth,skin]);
    m.add(upper);m.bind(new THREE.Skeleton([upper,joint]));m.castShadow=true;m.receiveShadow=true;
    // Skinned bounds must follow the bent limb, not its straight bind pose.
    m.frustumCulled=false;
    return m;
  },[leg,style,wide,cloth,skin]);
  useEffect(()=>()=>mesh.skeleton.dispose(),[mesh]);
  useFrame(()=>{const source=(leg?rig.current.knee:rig.current.elbow)[index];if(source)mesh.skeleton.bones[1].quaternion.copy(source.quaternion);});
  return <primitive object={mesh} dispose={null}/>;
}
