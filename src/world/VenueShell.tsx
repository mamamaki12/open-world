// 店の建物の外箱と入口の引き戸。正面に本当の開口があり、扉を開けると中の売り場がそのまま見えて歩いて入れる
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { VENUES, VENUE_DOORS, VENUE_WALL, venueDoorId } from '../building/venues';
import type { Venue } from '../building/venues';
import { isDoorOpen } from '../state/doors';

function Block({p,s,color,roughness=.8}:{p:[number,number,number];s:[number,number,number];color:string;roughness?:number}){
  return <mesh position={p} castShadow receiveShadow><boxGeometry args={s}/><meshStandardMaterial color={color} roughness={roughness}/></mesh>;
}

/** 建物の箱。正面(-Z)の面だけ描かず、入口の穴をあけた正面の壁を別に置く。 */
export function OpenFrontBox({kind,height,color,roughness=.8}:{kind:Venue;height:number;color:string;roughness?:number}){
  const b=VENUES[kind],d=VENUE_DOORS[kind],w=b.x1-b.x0,depth=b.z1-b.z0;
  const materials=useMemo(()=>{
    const m=new THREE.MeshStandardMaterial({color,roughness}),none=new THREE.MeshBasicMaterial({visible:false});
    return [m,m,m,m,m,none];
  },[color,roughness]);
  useEffect(()=>()=>materials.forEach(m=>m.dispose()),[materials]);
  const left=d.x-d.width/2-b.x0,right=b.x1-(d.x+d.width/2),zc=b.z0+VENUE_WALL/2;
  return <>
    <mesh position={[(b.x0+b.x1)/2,height/2,(b.z0+b.z1)/2]} material={materials} castShadow receiveShadow><boxGeometry args={[w,height,depth]}/></mesh>
    <Block p={[b.x0+left/2,height/2,zc]} s={[left,height,VENUE_WALL]} color={color} roughness={roughness}/>
    <Block p={[b.x1-right/2,height/2,zc]} s={[right,height,VENUE_WALL]} color={color} roughness={roughness}/>
    <Block p={[d.x,(height+d.height)/2,zc]} s={[d.width,height-d.height,VENUE_WALL]} color={color} roughness={roughness}/>
  </>;
}

/** 建物の足元の台座。入口の前だけ切り欠いて、床と地面をつなげる。 */
export function PlinthRing({kind,height,margin,color}:{kind:Venue;height:number;margin:number;color:string}){
  const b=VENUES[kind],d=VENUE_DOORS[kind],t=margin*2,x0=b.x0-margin,x1=b.x1+margin,z1=b.z1+margin;
  const l=d.x-d.width/2-x0,r=x1-(d.x+d.width/2);
  return <>
    <Block p={[x0+l/2,height/2,b.z0]} s={[l,height,t]} color={color}/>
    <Block p={[x1-r/2,height/2,b.z0]} s={[r,height,t]} color={color}/>
    <Block p={[(x0+x1)/2,height/2,b.z1]} s={[x1-x0,height,t]} color={color}/>
    {[b.x0,b.x1].map(x=><Block key={x} p={[x,height/2,(b.z0+z1)/2]} s={[t,height,z1-b.z0]} color={color}/>)}
  </>;
}

/** 入口の両引きのガラス戸。F で開け閉めすると左右の壁の中へすべる。 */
export function VenueDoor({kind,frame}:{kind:Venue;frame:string}){
  const d=VENUE_DOORS[kind],z=VENUES[kind].z0+VENUE_WALL/2,leaf=d.width/2;
  const leaves=useRef<(THREE.Group|null)[]>([]),amount=useRef(0);
  useFrame((_,dt)=>{
    const target=isDoorOpen(venueDoorId(kind))?1:0;
    amount.current+=(target-amount.current)*Math.min(1,dt*6);
    leaves.current.forEach((g,i)=>{if(g)g.position.x=(i?1:-1)*(leaf/2+amount.current*leaf*.96);});
  });
  return <group position={[d.x,0,z]}>
    {[-1,1].map((side,i)=><group key={side} ref={g=>{leaves.current[i]=g;}} position={[side*leaf/2,0,0]}>
      <mesh position={[0,d.height/2,0]}><boxGeometry args={[leaf-.06,d.height-.06,.03]}/><meshPhysicalMaterial color="#a9cfd9" transparent opacity={.3} roughness={.05} metalness={.1} depthWrite={false}/></mesh>
      {[[0,.03,leaf,.06],[0,d.height-.03,leaf,.06],[-leaf/2+.03,d.height/2,.06,d.height],[leaf/2-.03,d.height/2,.06,d.height]].map(([x,y,w,h],k)=>
        <mesh key={k} position={[x,y,0]}><boxGeometry args={[w,h,.07]}/><meshStandardMaterial color={frame} metalness={.7} roughness={.3}/></mesh>)}
      <mesh position={[-side*(leaf/2-.16),1.1,0]}><boxGeometry args={[.035,.7,.12]}/><meshStandardMaterial color="#e6e3d8" metalness={.85} roughness={.2}/></mesh>
    </group>)}
  </group>;
}
