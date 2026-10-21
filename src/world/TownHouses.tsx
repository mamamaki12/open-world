import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { createPortal, useFrame, useThree } from '@react-three/fiber';
import { TOWN_HOUSE_PLOTS, townHouseAt } from '../building/townHouses';
import { plotX, plotZ } from '../economy/town';
import { HouseParts } from './HouseView';
import { useGame } from '../state/store';
import { VISIT_READ_ONLY, useVisit } from './visit';
import type { ActivateHouse } from './HouseScope';
import { bakeHouse } from './bakeHouse';
import type { BakedHouse } from './bakeHouse';
import { BuildingDetail, useDesktopBuildingDetail } from './BuildingDetail';
import { distanceToBuilding, houseEnvelope } from './buildingLod';
import { DistantHouse } from './DistantHouse';
import { useVehicles } from '../state/vehicles';
import { useTouchDevice } from '../ui/useTouchDevice';
import { furnitureDef } from '../catalog';
import { furnitureBaseY } from '../building/rules';
import { mountedTransform } from '../building/mounts';
import { PlacedLightSource } from './PlacedLightSource';
const readOnly:ActivateHouse=e=>{e.stopPropagation();useGame.getState().notify(VISIT_READ_ONLY);};
const baked=new Map<string,BakedHouse>();
function Baker({id,onDone,desktop}:{id:string;onDone:(id:string)=>void;desktop:boolean}){
 const scene=useMemo(()=>new THREE.Scene(),[]),plot=Number(Object.keys(TOWN_HOUSE_PLOTS).find(p=>TOWN_HOUSE_PLOTS[Number(p)]===id)),house=townHouseAt(plot);
 const [frames,setFrames]=useState(0),key=(desktop?'pc:':'full:')+id;
 useFrame(()=>{if(frames<1){setFrames(frames+1);return;}if(house&&!baked.has(key))baked.set(key,bakeHouse(scene,house,desktop));onDone(id);});
 return house?createPortal(<HouseParts house={house} showRoofs/>,scene):null;
}
export function TownHouses({shiftX,shiftZ,skip}:{shiftX:number;shiftZ:number;skip:Set<number>}){
 const desktop=useDesktopBuildingDetail(),prefix=desktop?'pc:':'full:';
 const [,setVersion]=useState(0),visiting=useVisit(v=>v.plot),designs=useMemo(()=>[...new Set(Object.values(TOWN_HOUSE_PLOTS))],[]);
 const camera=useThree(s=>s.camera),touch=useTouchDevice(),inVehicle=useVehicles(s=>!!(s.driving||s.riding));
 const [wanted,setWanted]=useState<string[]>(()=>desktop?[]:designs),elapsed=useRef(0),point=useMemo(()=>new THREE.Vector3(),[]);
 const refresh=()=>{
  if(!desktop){setWanted(old=>old===designs?old:designs);return;}
  if(inVehicle)return;
  const needed=new Set<string>();
  for(const [p,id] of Object.entries(TOWN_HOUSE_PLOTS)){
   const plot=Number(p),house=townHouseAt(plot);if(skip.has(plot)||!house)continue;
   point.set(camera.position.x-plotX(plot)-shiftX,camera.position.y,camera.position.z-plotZ(plot)-shiftZ);
   if(distanceToBuilding(point,houseEnvelope(house).bounds)<(touch?40:60))needed.add(id);
  }
  const ids=designs.filter(id=>needed.has(id));setWanted(old=>old.join('|')===ids.join('|')?old:ids);
 };
 useLayoutEffect(refresh,[camera,desktop,inVehicle,touch,shiftX,shiftZ,skip]);
 useFrame((_,dt)=>{elapsed.current+=dt;if(elapsed.current<.5)return;elapsed.current=0;refresh();});
 const next=!inVehicle?wanted.find(d=>!baked.has(prefix+d)):undefined;
 return <group name="town-houses" userData={{baking:!!next}}>
  {next&&<Baker key={prefix+next} id={next} desktop={desktop} onDone={()=>setVersion(v=>v+1)}/>}
  {Object.entries(TOWN_HOUSE_PLOTS).map(([p,id])=>{
   const plot=Number(p),house=townHouseAt(plot);if(skip.has(plot)||!house)return null;
   const parts=baked.get(prefix+id);if(!desktop&&!parts&&visiting!==plot)return null;
   return <group key={plot} position={[plotX(plot)+shiftX,0,plotZ(plot)+shiftZ]}>
    <BuildingDetail name={'town-house-'+plot} bounds={houseEnvelope(house).bounds} forceFull={visiting===plot}>{tier=>{
      if(visiting===plot)return <HouseParts house={house} showRoofs activate={readOnly}/>;
      // Keep the baked meshes alive while driving across a distance boundary.
      // Visibility changes avoid rebuilding/uploading the same geometry on every pass.
      return <>
       <group visible={tier==='distant'||!parts}><DistantHouse house={house}/></group>
       {parts&&<group dispose={null}>
        <group visible={tier==='near'} userData={{houseVariant:'full'}}>{parts.full.map((part,i)=><mesh key={i} geometry={part.geometry} material={part.material} castShadow receiveShadow/>)}
          {house.furniture.map(f=>{const def=furnitureDef(f);if(!def.light)return null;const t=f.wallMount?mountedTransform(house,f.wallMount,f.type):null;return <group key={f.id} position={[t?.x??f.x,t?.y??furnitureBaseY(house,f),t?.z??f.z]} rotation-y={(t?.rotation??f.rotation)*Math.PI/180}><PlacedLightSource light={def.light}/></group>;})}
        </group>
        <group visible={tier==='exterior'} userData={{houseVariant:'exterior'}}>{parts.exterior.map((part,i)=><mesh key={i} geometry={part.geometry} material={part.material} castShadow receiveShadow/>)}</group>
       </group>}
      </>;
    }}</BuildingDetail>
   </group>;
  })}
 </group>;
}

