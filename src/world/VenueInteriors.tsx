import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useVenue } from '../state/venue';
import { VENUES, VENUE_ACTIONS } from '../building/venues';
import { useCurrentPlot } from '../state/economy';
import { CIVIC_SITE, plotX, plotZ } from '../economy/town';
function Box({p,s,c,metal=0}:{p:[number,number,number];s:[number,number,number];c:string;metal?:number}){
  return <mesh position={p} castShadow receiveShadow><boxGeometry args={s}/><meshStandardMaterial color={c} roughness={metal ? .28:.65} metalness={metal}/></mesh>;
}
function Round({p,r,h,c}:{p:[number,number,number];r:number;h:number;c:string}){
  return <mesh position={p} castShadow><cylinderGeometry args={[r,r,h,36]}/><meshStandardMaterial color={c} roughness={.45} metalness={.25}/></mesh>;
}
function Label({text,p,w=3,h=.55,color='#edd8a3'}:{text:string;p:[number,number,number];w?:number;h?:number;color?:string}){
  const texture=useMemo(()=>{const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=256;
    const g=canvas.getContext('2d')!;g.fillStyle=color;g.textAlign='center';g.textBaseline='middle';g.font='bold 82px sans-serif';g.fillText(text,512,128,980);
    const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;return t;},[text,color]);
  useEffect(()=>()=>texture.dispose(),[texture]);
  return <mesh position={p} rotation-y={Math.PI}><planeGeometry args={[w,h]}/><meshBasicMaterial map={texture} transparent side={THREE.DoubleSide} toneMapped={false}/></mesh>;
}
function Chair({x,z,rot=0}:{x:number;z:number;rot?:number}){
  return <group position={[x,0,z]} rotation-y={rot}><Box p={[0,.47,0]} s={[.52,.12,.52]} c="#5b3534"/><Box p={[0,.85,.22]} s={[.52,.65,.1]} c="#5b3534"/>{[-1,1].flatMap(a=>[-1,1].map(b=><Box key={a+','+b} p={[a*.2,.23,b*.2]} s={[.035,.46,.035]} c="#a69264" metal={.65}/>))}</group>;
}
function RouletteTable({x}:{x:number}){
  return <group position={[x,0,1]}><Box p={[0,.65,0]} s={[3.3,1.3,2.1]} c="#4c3024"/><Box p={[0,1.32,0]} s={[3.3,.08,2.1]} c="#155442"/><Round p={[-.9,1.4,0]} r={.6} h={.12} c="#bfa16a"/>
    <Round p={[-.9,1.48,0]} r={.45} h={.05} c="#272323"/>
    {Array.from({length:24},(_,i)=><mesh key={i} position={[-.9+Math.sin(i*Math.PI/12)*.34,1.51,Math.cos(i*Math.PI/12)*.34]} rotation-y={i*Math.PI/12}><boxGeometry args={[.07,.02,.15]}/><meshStandardMaterial color={i%2?'#a82432':'#eee3bb'}/></mesh>)}
    {Array.from({length:12},(_,i)=><Box key={i} p={[.1+(i%4)*.31,1.375,-.45+Math.floor(i/4)*.31]} s={[.29,.018,.29]} c={i%2?'#9c2331':'#202a28'}/>)}
    {[-1,0,1].map(i=><Chair key={i} x={i*.85} z={-1.6}/>)}</group>;
}
function CasinoInterior(){
  return <>
    <Box p={[0,.025,0]} s={[3,.04,12]} c="#662534"/>
    {[-1,1].flatMap(side=>[-3,3].map(z=><group key={side+','+z}><Round p={[side*10,2.7,z]} r={.24} h={5.4} c="#bda065"/><Round p={[side*10,.12,z]} r={.38} h={.24} c="#e1cf9e"/></group>))}
    {[-3,3].map(z=><group key={z}><Round p={[0,4.9,z]} r={.035} h={1.8} c="#c2a369"/><mesh position={[0,4.1,z]} rotation-x={Math.PI/2}><torusGeometry args={[1.1,.06,10,48]}/><meshStandardMaterial color="#d1b777" metalness={.85} roughness={.2}/></mesh>
      {Array.from({length:14},(_,i)=><group key={i} position={[Math.cos(i*Math.PI/7),3.9,z+Math.sin(i*Math.PI/7)]}><mesh><octahedronGeometry args={[.14]}/><meshPhysicalMaterial color="#f9e8bb" metalness={.3} roughness={.08} clearcoat={1}/></mesh><mesh position={[0,.22,0]}><sphereGeometry args={[.065,10,8]}/><meshBasicMaterial color="#ffe4a0"/></mesh></group>)}</group>)}
    <RouletteTable x={-6}/><RouletteTable x={6}/>
    {[-8,-6,-4,4,6,8].map(x=><group key={x} position={[x,0,-4.7]}><Box p={[0,.9,0]} s={[1.15,1.8,1.1]} c="#552031"/><Box p={[0,1.3,-.57]} s={[.93,.65,.04]} c="#172128"/>
      {[-1,0,1].map(i=><Box key={i} p={[i*.25,1.3,-.6]} s={[.22,.45,.02]} c="#e9dba4"/>)}
      <Label text="777" p={[0,1.32,-.63]} w={.8} h={.35}/><Label text="GRAND" p={[0,1.85,-.57]} w={1} h={.3}/></group>)}
    <Box p={[0,.63,4]} s={[6,1.25,1.2]} c="#443028"/><Box p={[0,1.29,4]} s={[6.2,.12,1.35]} c="#dac8a2"/>
    <Label text="GRAND STRIP · BAR & LOUNGE" p={[0,2.8,6.7]} w={8} h={.7}/>
    {Array.from({length:17},(_,i)=><Round key={i} p={[-2.6+i*.32,1.63,4.2]} r={.065} h={.55} c={['#365c3b','#a57434','#692b37'][i%3]}/>)}
    <Label text="F · ゲームを選ぶ" p={[0,2.5,3]} w={4}/><pointLight position={[0,4,0]} intensity={20} color="#ffd9a0" distance={20}/>
  </>;
}
function EstateInterior(){
  return <>
    <Box p={[0,.55,1.8]} s={[3.6,1.1,.8]} c="#d2bc91"/><Box p={[0,1.15,1.8]} s={[3.8,.1,.95]} c="#faf9f2"/>
    <Box p={[.7,1.4,1.9]} s={[.7,.45,.06]} c="#273943"/><Box p={[.7,1.2,1.9]} s={[.12,.3,.14]} c="#899ba3"/>
    <Label text="まちの不動産" p={[0,2.6,3.7]} w={4} color="#286e6b"/>
    <Label text="F · 物件・家計簿の相談" p={[0,1.7,1.3]} w={3.5} h={.4} color="#286e6b"/>
    {[-3,3].map(x=><group key={x}><Round p={[x,.72,-.3]} r={.7} h={.08} c="#e9dbc2"/><Round p={[x,.35,-.3]} r={.08} h={.7} c="#6c777b"/><Chair x={x} z={-1.4}/><Chair x={x} z={.8} rot={Math.PI}/></group>)}
    {[-1,1].flatMap(side=>[-1,0,1].map(n=><group key={side+','+n} position={[side*4.72,1.8,n*.95]} rotation-y={side*Math.PI/2}><Box p={[0,0,0]} s={[.75,1.05,.03]} c="#398b84"/><Box p={[0,-.1,-.03]} s={[.63,.7,.015]} c="#faf8e9"/>{[-1,0,1].map(i=><Box key={i} p={[i*.17,-.1,-.05]} s={[.015,.45,.015]} c="#9da99e"/>)}</group>))}
    <Box p={[0,2.5,0]} s={[3,.06,.6]} c="#fff8e5"/><pointLight position={[0,2.5,0]} intensity={12} color="#fff0db" distance={12}/>
  </>;
}
function DealerInterior(){
  return <>
    <Box p={[0,.62,4]} s={[4,1.24,1]} c="#173b50"/><Box p={[0,1.3,4]} s={[4.2,.09,1.1]} c="#e6e9e8"/>
    <Label text="AVENUE MOTORS" p={[0,3.8,5.72]} w={7}/><Label text="F · 展示車・購入相談" p={[0,2.3,3.8]} w={4}/>
    {[-5.7,0,5.7].map((x,i)=><group key={x}><Box p={[x,.26,.3]} s={[2.7,.04,5.5]} c="#3d515d"/>
      <Box p={[x,3.8,.3]} s={[2.8,.045,5.5]} c="#f2f4ed"/><Label text={['MOCO 660','RIDGE AWD','RAVEN GT'][i]} p={[x,.85,-2.7]} w={2.2} h={.32}/></group>)}
    {[-6,6].map(x=><group key={x}><Box p={[x,.4,4.6]} s={[2,.65,.8]} c="#4a555c"/><Box p={[x,.85,4.95]} s={[2,.6,.15]} c="#4a555c"/><Round p={[x,.45,3.5]} r={.48} h={.06} c="#eee9dc"/></group>)}
    <pointLight position={[0,4.2,0]} intensity={25} color="#e2f2ff" distance={20}/>
  </>;
}
export function VenueInteriors(){
  const kind=useVenue(s=>s.inside),plot=useCurrentPlot();
  if(!kind)return null;
  const b=VENUES[kind],cx=(b.x0+b.x1)/2,cz=(b.z0+b.z1)/2,w=b.x1-b.x0,d=b.z1-b.z0,h=kind==='casino'?6.4:kind==='estate'?3.2:4.5;
  return <group name="venue-interior" position={[CIVIC_SITE.x-plotX(plot)+cx,0,CIVIC_SITE.z-plotZ(plot)+cz]}>
    <Box p={[0,-.015,0]} s={[w,.05,d]} c={b.floor}/>
    <Box p={[0,h,0]} s={[w,.12,d]} c={kind==='casino'?'#26242a':'#f0f1ed'}/>
    {[-1,1].map(side=><group key={side}><Box p={[side*(w/2-.12),h/2,0]} s={[.15,h,d]} c={b.wall}/><Box p={[0,h/2,side*(d/2-.12)]} s={[w,h,.15]} c={b.wall}/>
      <Box p={[0,.15,side*(d/2-.2)]} s={[w,.13,.07]} c={b.trim} metal={.5}/><Box p={[side*(w/2-.2),.15,0]} s={[.07,.13,d]} c={b.trim} metal={.5}/>
    </group>)}
    <Label text="F · 外へ出る" p={[0,2,-d/2+.23]} w={2.7} color={kind==='estate'?'#286e6b':'#f1dfab'}/>
    {VENUE_ACTIONS[kind].map(a=><Label key={a.id} text={'F · '+a.label} p={[a.x,kind==='casino'?2.2:2,a.z+.25]} w={kind==='dealer'?3.4:2.5} h={.4} color={kind==='estate'?'#286e6b':'#ffe5a6'}/>)}
    {kind==='casino'?<CasinoInterior/>:kind==='estate'?<EstateInterior/>:<DealerInterior/>}
  </group>;
}
