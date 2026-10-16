import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { CARS } from '../catalog/cars';
import { DEALER, DEALER_BAY, DEALER_BAYS, DEALER_LOT } from '../building/dealer';
import { CarModel } from './CarModel';
import { VenueDoor } from './VenueShell';
import { VENUE_DOORS } from '../building/venues';
function Sign(){
  const texture=useMemo(()=>{
    const canvas=document.createElement('canvas');canvas.width=1536;canvas.height=256;
    const g=canvas.getContext('2d')!;g.fillStyle='#11212b';g.fillRect(0,0,1536,256);
    g.textAlign='center';g.fillStyle='#e7c985';g.font='bold 104px Georgia';g.fillText('AVENUE MOTORS',768,125);
    g.fillStyle='#fff';g.font='42px sans-serif';g.fillText('カーディーラー / 10 MODELS / 横に駐車場',768,210);
    const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;return t;
  },[]);useEffect(()=>()=>texture.dispose(),[texture]);
  return <mesh position={[(DEALER.x0+DEALER.x1)/2,4.45,DEALER.z0-.13]} rotation-y={Math.PI}><planeGeometry args={[16,2.1]}/><meshBasicMaterial map={texture} side={THREE.DoubleSide} toneMapped={false}/></mesh>;
}
function Box({p,s,c}:{p:[number,number,number];s:[number,number,number];c:string}){
  return <mesh position={p} castShadow receiveShadow><boxGeometry args={s}/><meshStandardMaterial color={c} roughness={.4} metalness={.25}/></mesh>;
}
/** 駐車場の入口の「P」看板 */
function ParkingSign({x,z}:{x:number;z:number}){
  const texture=useMemo(()=>{const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d')!;
    g.fillStyle='#1d4f9c';g.fillRect(0,0,256,256);g.fillStyle='#fff';g.font='bold 200px sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText('P',128,140);
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;},[]);
  useEffect(()=>()=>texture.dispose(),[texture]);
  return <group position={[x,0,z]}><Box p={[0,1.2,0]} s={[.1,2.4,.1]} c="#5f666b"/>
    <mesh position={[0,2.5,-.06]} rotation-y={Math.PI}><planeGeometry args={[.8,.8]}/><meshBasicMaterial map={texture} toneMapped={false}/></mesh>
    <mesh position={[0,2.5,.06]}><planeGeometry args={[.8,.8]}/><meshBasicMaterial map={texture} toneMapped={false}/></mesh></group>;
}
function Glass({x,y,w,h}:{x:number;y:number;w:number;h:number}){
  return <mesh position={[x,y,DEALER.z0]}><boxGeometry args={[w,h,.035]}/><meshPhysicalMaterial color="#a0cbd9" transparent opacity={.15} roughness={.08} metalness={.1} depthWrite={false}/></mesh>;
}
export function DealerBuilding(){
  const d=DEALER,lot=DEALER_LOT,x=(d.x0+d.x1)/2,z=(d.z0+d.z1)/2,door=VENUE_DOORS.dealer,x0g=x-8.9,x1g=x+8.9;
  return <group name="dealer">
    <Box p={[x,-.035,z+5]} s={[23,.06,30]} c="#777e83"/>
    <Box p={[x,.015,z]} s={[18,.03,12]} c="#e6e5dd"/>
    <Box p={[x,5.1,z]} s={[18.6,.26,12.4]} c="#14252f"/>
    <Box p={[x,2.65,d.z1]} s={[18,5.2,.2]} c="#e5e6e2"/>
    <Box p={[x,4.4,d.z0]} s={[18,1.4,.25]} c="#11212b"/>
    {[d.x0,d.x1].map(xx=><Box key={xx} p={[xx,2.6,z]} s={[.18,5.2,12]} c="#273e49"/>)}
    {[-8,-4,-1.5,1.5,4,8].map(dx=><Box key={dx} p={[x+dx,1.95,d.z0]} s={[.06,3.5,.12]} c="#314b59"/>)}
    {/* 正面のガラス。入口の部分だけあけて、両引きの戸を入れる */}
    {[[x0g,door.x-door.width/2],[door.x+door.width/2,x1g]].map(([a,b])=><Glass key={a} x={(a+b)/2} y={1.9} w={b-a} h={3.5}/>)}
    <Glass x={door.x} y={(door.height+3.65)/2} w={door.width} h={3.65-door.height}/>
    <Box p={[door.x,door.height+.03,d.z0]} s={[door.width,.06,.14]} c="#314b59"/>
    <VenueDoor kind="dealer" frame="#314b59"/>
    <Box p={[x,.018,d.z0-1.3]} s={[3,.03,1.3]} c="#223843"/>
    <Sign/>
    {/* 展示車は鼻先を道路（正面のガラス）へ向け、少し入口側へ振る */}
    {[0,4,6].map((n,i)=><group key={n} position={[x-5.7+i*5.7,.25,z+.3]} rotation-y={[-.28,0,.28][i]}>
      <CarModel def={CARS[n]} color={['#e4e7e4','#275882','#bc283a'][i]}/>
    </group>)}
    {/* 店の横の駐車場（納車スペース）。表の道路から見える */}
    <Box p={[(lot.x0+lot.x1)/2,-.02,(lot.z0+lot.z1)/2-2]} s={[lot.x1-lot.x0+1,.06,lot.z1-lot.z0+4]} c="#5d6368"/>
    {DEALER_BAYS.map((b,i)=><group key={i} position={[b.x,0,b.z]}>
      <Box p={[0,.02,DEALER_BAY.width/2]} s={[DEALER_BAY.depth,.012,.08]} c="#f1ede0"/>
      {i%5===0&&<Box p={[0,.02,-DEALER_BAY.width/2]} s={[DEALER_BAY.depth,.012,.08]} c="#f1ede0"/>}
      <Box p={[i<5?-2.35:2.35,.09,0]} s={[.16,.17,1.1]} c="#bfc2bc"/>
    </group>)}
    <ParkingSign x={lot.x1-.6} z={lot.z0-1}/>
    {[d.x0-.8,d.x1+.8].map(xx=><group key={xx}><Box p={[xx,1,d.z0-1]} s={[.12,2,.12]} c="#162f3d"/><Box p={[xx,2,d.z0-1]} s={[.7,.08,.7]} c="#ecd99c"/></group>)}
  </group>;
}
