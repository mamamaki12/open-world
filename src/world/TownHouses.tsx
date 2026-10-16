import { useMemo, useState } from 'react';
import * as THREE from 'three';
import { createPortal, useFrame } from '@react-three/fiber';
import { TOWN_HOUSE_PLOTS, townHouseAt } from '../building/townHouses';
import { plotX, plotZ } from '../economy/town';
import { HouseParts } from './HouseView';
import { useGame } from '../state/store';
import { VISIT_READ_ONLY, useVisit } from './visit';
import type { ActivateHouse } from './HouseScope';
import { bakeHouse } from './bakeHouse';
import type { BakedHouse } from './bakeHouse';
import { BuildingDetail, useDesktopBuildingDetail } from './BuildingDetail';
import { houseEnvelope } from './buildingLod';
import { DistantHouse } from './DistantHouse';
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
 const [,setVersion]=useState(0),visiting=useVisit(v=>v.plot),designs=useMemo(()=>[...new Set(Object.values(TOWN_HOUSE_PLOTS))],[]),next=designs.find(d=>!baked.has(prefix+d));
 return <group name="town-houses" userData={{baking:!!next}}>
  {next&&<Baker key={prefix+next} id={next} desktop={desktop} onDone={()=>setVersion(v=>v+1)}/>}
  {Object.entries(TOWN_HOUSE_PLOTS).map(([p,id])=>{
   const plot=Number(p),house=townHouseAt(plot);if(skip.has(plot)||!house)return null;
   const parts=baked.get(prefix+id);if(!desktop&&!parts&&visiting!==plot)return null;
   return <group key={plot} position={[plotX(plot)+shiftX,0,plotZ(plot)+shiftZ]}>
    <BuildingDetail name={'town-house-'+plot} bounds={houseEnvelope(house).bounds} forceFull={visiting===plot}>{tier=>{
      if(visiting===plot)return <HouseParts house={house} showRoofs activate={readOnly}/>;
      if(tier==='distant')return <DistantHouse house={house}/>;
      const variant=tier==='near'?parts?.full:parts?.exterior;
      return variant?<group dispose={null}>{variant.map((part,i)=><mesh key={i} geometry={part.geometry} material={part.material} castShadow receiveShadow/>)}</group>:<DistantHouse house={house}/>;
    }}</BuildingDetail>
   </group>;
  })}
 </group>;
}

