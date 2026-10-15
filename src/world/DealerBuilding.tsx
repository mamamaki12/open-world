import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { CARS } from '../catalog/cars';
import { DEALER } from '../building/dealer';
import { CarModel } from './CarModel';
function Sign(){
  const texture=useMemo(()=>{
    const canvas=document.createElement('canvas');canvas.width=1536;canvas.height=256;
    const g=canvas.getContext('2d')!;g.fillStyle='#11212b';g.fillRect(0,0,1536,256);
    g.textAlign='center';g.fillStyle='#e7c985';g.font='bold 104px Georgia';g.fillText('AVENUE MOTORS',768,125);
    g.fillStyle='#fff';g.font='42px sans-serif';g.fillText('カーディーラー / 10 MODELS / 入口で F',768,210);
    const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;return t;
  },[]);useEffect(()=>()=>texture.dispose(),[texture]);
  return <mesh position={[(DEALER.x0+DEALER.x1)/2,4.45,DEALER.z0-.13]} rotation-y={Math.PI}><planeGeometry args={[16,2.1]}/><meshBasicMaterial map={texture} side={THREE.DoubleSide} toneMapped={false}/></mesh>;
}
function Box({p,s,c}:{p:[number,number,number];s:[number,number,number];c:string}){
  return <mesh position={p} castShadow receiveShadow><boxGeometry args={s}/><meshStandardMaterial color={c} roughness={.4} metalness={.25}/></mesh>;
}
export function DealerBuilding(){
  const d=DEALER,x=(d.x0+d.x1)/2,z=(d.z0+d.z1)/2;
  return <group name="dealer">
    <Box p={[x,-.035,z+5]} s={[23,.06,30]} c="#777e83"/>
    <Box p={[x,.12,z]} s={[18,.24,12]} c="#e6e5dd"/>
    <Box p={[x,5.1,z]} s={[18.6,.26,12.4]} c="#14252f"/>
    <Box p={[x,2.65,d.z1]} s={[18,5.2,.2]} c="#e5e6e2"/>
    <Box p={[x,4.4,d.z0]} s={[18,1.4,.25]} c="#11212b"/>
    {[d.x0,d.x1].map(xx=><Box key={xx} p={[xx,2.6,z]} s={[.18,5.2,12]} c="#273e49"/>)}
    {[-8,-4,-1.5,1.5,4,8].map(dx=><Box key={dx} p={[x+dx,1.95,d.z0]} s={[.06,3.5,.12]} c="#314b59"/>)}
    <mesh position={[x,1.9,d.z0]}><boxGeometry args={[17.8,3.5,.035]}/><meshPhysicalMaterial color="#a0cbd9" transparent opacity={.15} roughness={.08} metalness={.1} depthWrite={false}/></mesh>
    {[-1,1].map(s=><Box key={s} p={[x+s*.27,1.2,d.z0-.12]} s={[.035,.6,.05]} c="#d9dee2"/>)}
    <Box p={[x,.018,d.z0-1.3]} s={[3,.03,1.3]} c="#223843"/>
    <Sign/>
    {[0,4,6].map((n,i)=><group key={n} position={[x-5.7+i*5.7,.25,z+.3]} rotation-y={Math.PI*.85}>
      <CarModel def={CARS[n]} color={['#e4e7e4','#275882','#bc283a'][i]}/>
    </group>)}
    {Array.from({length:10},(_,i)=>{const px=d.x0+1.8+(i%5)*3.4,pz=d.z1+4+Math.floor(i/5)*6.4;return <group key={i}>
      {[-1,1].map(s=><Box key={s} p={[px+s*1.55,.005,pz]} s={[.06,.012,5.5]} c="#f1ede0"/>)}
      <Box p={[px,.09,pz+2.2]} s={[1.1,.17,.16]} c="#bfc2bc"/>
    </group>;})}
    {[d.x0-.8,d.x1+.8].map(xx=><group key={xx}><Box p={[xx,1,d.z0-1]} s={[.12,2,.12]} c="#162f3d"/><Box p={[xx,2,d.z0-1]} s={[.7,.08,.7]} c="#ecd99c"/></group>)}
  </group>;
}
