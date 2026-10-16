import { createContext, useContext, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useTouchDevice } from '../ui/useTouchDevice';
import { buildingTier, distanceToBuilding } from './buildingLod';
import type { BuildingBounds, BuildingTier } from './buildingLod';
const DesktopDetail=createContext(false);
export const useDesktopBuildingDetail=()=>useContext(DesktopDetail);
export function BuildingDetailProvider({children}:{children:ReactNode}) {
  const touch=useTouchDevice();
  // Development-only A/B comparison uses the exact same camera, DPR and shadows.
  const baseline=import.meta.env.DEV&&new URLSearchParams(window.location.search).get('buildingDetail')==='full';
  return <DesktopDetail.Provider value={!touch&&!baseline}>{children}</DesktopDetail.Provider>;
}
export function BuildingDetail({bounds,forceFull=false,name,children}:{bounds:BuildingBounds;forceFull?:boolean;name?:string;children:(tier:BuildingTier)=>ReactNode}) {
  const enabled=useContext(DesktopDetail),{camera}=useThree(),root=useRef<THREE.Group>(null),point=useMemo(()=>new THREE.Vector3(),[]);
  const [tier,setTier]=useState<BuildingTier>('distant'),current=useRef(tier),elapsed=useRef(0);
  const update=()=>{
    if(!root.current||!enabled||forceFull)return;
    root.current.updateWorldMatrix(true,false);camera.getWorldPosition(point);root.current.worldToLocal(point);
    const next=buildingTier(distanceToBuilding(point,bounds),current.current);
    if(next!==current.current){current.current=next;setTier(next);}
  };
  useLayoutEffect(update,[bounds,enabled,forceFull,camera]);
  useFrame((_,dt)=>{if(!enabled||forceFull)return;elapsed.current+=dt;if(elapsed.current<.2)return;elapsed.current=0;update();});
  const effective=enabled&&!forceFull?tier:'near';
  return <group ref={root} name={name} userData={{buildingDetail:effective,desktopLOD:enabled}}>{children(effective)}</group>;
}

