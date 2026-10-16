import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { TUNER } from '../building/tuner';
import { VENUE_DOORS } from '../building/venues';
import { OpenFrontBox, PlinthRing, VenueDoor } from './VenueShell';

function Box({p,s,c,metal=0}:{p:[number,number,number];s:[number,number,number];c:string;metal?:number}){
  return <mesh position={p} castShadow receiveShadow><boxGeometry args={s}/><meshStandardMaterial color={c} roughness={.55} metalness={metal}/></mesh>;
}
/** 閉まったシャッター（横じまの波板） */
function Shutter({x,width,height}:{x:number;width:number;height:number}){
  const z=TUNER.z0-.1;
  return <group position={[x,0,z]}>
    <Box p={[0,height/2,0]} s={[width,height,.04]} c="#a9adb1" metal={.5}/>
    {Array.from({length:Math.floor(height/.18)},(_,i)=><Box key={i} p={[0,.09+i*.18,-.03]} s={[width-.04,.03,.02]} c="#8d9196" metal={.5}/>)}
    <Box p={[0,height+.2,-.06]} s={[width+.3,.4,.14]} c="#26292d"/>
    {[-1,1].map(s=><Box key={s} p={[s*(width/2+.08),height/2,-.03]} s={[.12,height,.1]} c="#26292d"/>)}
  </group>;
}
/** 車のカスタムショップの外観。黒い倉庫風の建物に黄色の差し色、両脇は作業場のシャッター。 */
export function TunerBuilding(){
  const t=TUNER,door=VENUE_DOORS.tuner,x=(t.x0+t.x1)/2;
  const sign=useMemo(()=>{
    const c=document.createElement('canvas');c.width=1536;c.height=256;const g=c.getContext('2d')!;
    g.fillStyle='#16181b';g.fillRect(0,0,1536,256);g.fillStyle='#f2c200';g.fillRect(0,214,1536,18);
    g.textAlign='center';g.fillStyle='#f2c200';g.font='italic bold 112px sans-serif';g.fillText('STANCE GARAGE',768,128);
    g.fillStyle='#fff';g.font='40px sans-serif';g.fillText('カーカスタム / 塗装・エンジン・ホイール・足回り・エアロ',768,192);
    const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;return tex;
  },[]);
  useEffect(()=>()=>sign.dispose(),[sign]);
  return <group name="tuner">
    <OpenFrontBox kind="tuner" height={t.height} color="#2b2e33" roughness={.7}/>
    <PlinthRing kind="tuner" height={.25} margin={.06} color="#1b1d20"/>
    <Box p={[x,t.height+.12,(t.z0+t.z1)/2]} s={[t.x1-t.x0+.4,.24,t.z1-t.z0+.4]} c="#16181b"/>
    <mesh position={[x,4.45,t.z0-.1]} rotation-y={Math.PI}><planeGeometry args={[14,2.2]}/><meshBasicMaterial map={sign} toneMapped={false}/></mesh>
    <Shutter x={t.x0+3.6} width={5} height={3.2}/>
    <Shutter x={t.x1-3.6} width={5} height={3.2}/>
    <VenueDoor kind="tuner" frame="#f2c200"/>
    <Box p={[door.x,door.height+.04,t.z0-.06]} s={[door.width+.3,.08,.14]} c="#f2c200"/>
    {/* 正面の舗装と黄色の縁石 */}
    <Box p={[x,-.02,t.z0-1.4]} s={[t.x1-t.x0+1,.05,2.8]} c="#4b4f53"/>
    {[t.x0+3.6,t.x1-3.6].map(xx=><Box key={xx} p={[xx,.02,t.z0-1.4]} s={[5,.012,.1]} c="#e0b400"/>)}
    <Box p={[t.x1+.15,1.4,t.z0+.6]} s={[.12,2.8,1]} c="#f2c200"/>
  </group>;
}
