import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { CarDef } from '../catalog/cars';
import type { OwnedCar } from '../state/vehicles';

function Prism({width,points,color,glass=false}:{width:number;points:[number,number][];color:string;glass?:boolean}) {
  const geometry=useMemo(()=>{
    const shape=new THREE.Shape(); points.forEach(([z,y],i)=>i?shape.lineTo(-z,y):shape.moveTo(-z,y));shape.closePath();
    const g=new THREE.ExtrudeGeometry(shape,{depth:width,bevelEnabled:!glass,bevelSize:.025,bevelThickness:.025,bevelSegments:2,steps:1});
    g.rotateY(Math.PI/2);g.translate(-width/2,0,0);return g;
  },[width,JSON.stringify(points),glass]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  return <mesh geometry={geometry} castShadow={!glass}><meshPhysicalMaterial color={color} roughness={glass ? .08:.25} metalness={glass ? .1:.55} clearcoat={1} transparent={glass} opacity={glass ? .36:1} depthWrite={!glass}/></mesh>;
}
function Box({p,s,c,metal=0,glow=0}:{p:[number,number,number];s:[number,number,number];c:string;metal?:number;glow?:number}){
  return <mesh position={p} castShadow receiveShadow><boxGeometry args={s}/><meshStandardMaterial color={c} roughness={.35} metalness={metal} emissive={c} emissiveIntensity={glow}/></mesh>;
}
/** 窓の縁に沿って傾けた柱。from/to は車の前後(z)と高さ(y)。 */
function Pillar({x,from:[z0,y0],to:[z1,y1],size,color}:{x:number;from:[number,number];to:[number,number];size:number;color:string}){
  return <mesh position={[x,(y0+y1)/2,(z0+z1)/2]} rotation-x={Math.atan2(z1-z0,y1-y0)} castShadow><boxGeometry args={[size,Math.hypot(z1-z0,y1-y0),size]}/><meshStandardMaterial color={color} metalness={.5} roughness={.3}/></mesh>;
}
/** 窓の下端（ベルトライン）の高さ。車内の配置の基準。 */
export function carBelt(d:CarDef){return d.height*(d.body==='van'?.55:d.body==='coupe'||d.body==='roadster'?.51:.52);}
/** 運転席の目の位置（車の座標：x 左右、y 高さ、z 前後で前が −）。ハンドルの真後ろ。 */
export function driverEye(d:CarDef){
  const belt=carBelt(d),cf=-d.length*(d.body==='van'?.31:d.body==='coupe'||d.body==='roadster'?.10:.18);
  return {x:-d.width*.25,y:Math.min(belt+.56,d.height-.14),z:Math.max(cf+.85,d.length*.04)};
}
export function CarModel({def:d,color,pose}:{def:CarDef;color:string;pose?:OwnedCar}) {
  const front=useRef<THREE.Group[]>([]),rolling=useRef<THREE.Group[]>([]);
  const tail=useRef<THREE.MeshStandardMaterial[]>([]),head=useRef<THREE.MeshStandardMaterial[]>([]);
  const w=d.width,L=d.length,H=d.height,r=d.wheel;
  const truck=d.body==='pickup',van=d.body==='van',suv=d.body==='suv',open=d.body==='roadster',sport=d.body==='coupe'||open;
  const belt=carBelt(d),frontZ=-L*.5,rearZ=L*.5;
  const cf=-L*(van ? .31:sport ? .10:.18),cr=L*(truck ? .04:d.body==='sedan'?.2:.32);
  const topFront=cf+L*.12,topRear=cr-L*(sport ? .10:.06);
  // 後席の背もたれは後ろの窓より前に置く（窓から突き出さないように）
  const rearSeat=Math.min(L*.31,topRear-.12);
  useFrame(()=>{
    if(!pose)return;
    front.current.forEach(g=>{if(g)g.rotation.y=-pose.steer;});
    rolling.current.forEach(g=>{if(g)g.rotation.x=pose.wheelSpin;});
    tail.current.forEach(m=>{if(m)m.emissiveIntensity=pose.braking?2.2:pose.lights ? .7:.15;});
    head.current.forEach(m=>{if(m)m.emissiveIntensity=pose.lights?2.8:.35;});
  });
  return <group>
    <Box p={[0,r*.85,0]} s={[w*.83,.16,L*.9]} c="#171b20"/>
    <Prism width={w*.94} color={color} points={[[frontZ,.43],[frontZ+.18,belt-.04],[cf,belt+.05],[rearZ-.16,belt+.02],[rearZ,.4]]}/>
    <Box p={[0,.38,frontZ+.06]} s={[w*.9,.12,.12]} c="#21262b"/>
    <Box p={[0,.38,rearZ-.04]} s={[w*.9,.12,.12]} c="#21262b"/>
    {!open&&<><Prism width={w*.79} color="#3e6073" glass points={[[cf,belt],[topFront,H-.06],[topRear,H-.06],[cr,belt]]}/>
      <Box p={[0,H-.025,(topFront+topRear)/2]} s={[w*.8,.06,Math.max(.3,topRear-topFront)]} c={d.id==='volt'?'#16232b':color}/>
      {[-1,1].map(side=><group key={side}>
        <Pillar x={side*w*.4} from={[cf,belt]} to={[topFront,H-.03]} size={.055} color={color}/>
        <Pillar x={side*w*.4} from={[cr,belt]} to={[topRear,H-.03]} size={.07} color={color}/>
        {d.seats>2&&<Box p={[side*w*.405,(belt+H-.06)/2,(topFront+topRear)/2]} s={[.045,H-.06-belt,.065]} c="#171b20"/>}
      </group>)}</>}
    {[-1,1].map(side=><group key={side}>
      <Box p={[side*w*.29,belt+.12,L*.02]} s={[w*.27,.16,L*.19]} c="#292522"/>
      <Box p={[side*w*.29,belt+.3,L*.10]} s={[w*.27,.4,.13]} c="#292522"/>
      <Box p={[side*w*.29,belt+.52,L*.1]} s={[.19,.14,.12]} c="#292522"/>
      {d.seats>2&&<><Box p={[side*w*.29,belt+.1,rearSeat-.2]} s={[w*.29,.15,.45]} c="#292522"/><Box p={[side*w*.29,belt+.3,rearSeat]} s={[w*.29,.36,.12]} c="#292522"/></>}
      <Box p={[side*(w*.5+.05),belt+.08,cf+.08]} s={[.18,.12,.25]} c={color}/>
      <Box p={[side*(w*.5+.055),belt+.08,cf+.20]} s={[.14,.08,.015]} c="#b2c9d7" metal={.9}/>
      <Box p={[side*w*.479,belt-.07,-L*.02]} s={[.025,.025,.2]} c="#c2c6ca" metal={.9}/>
      {d.seats>2&&<Box p={[side*w*.479,belt-.07,L*.22]} s={[.025,.025,.18]} c="#c2c6ca" metal={.9}/>}
      <Box p={[side*w*.48,belt*.65,L*.08]} s={[.012,.015,L*.42]} c="#30383f"/>
      {(suv||truck)&&<Box p={[side*w*.47,.42,0]} s={[.06,.22,L*.84]} c="#222a30"/>}
    </group>)}
    <Box p={[0,belt+.06,cf+.16]} s={[w*.88,.2,.36]} c="#151b20"/>
    <mesh position={[-w*.25,belt+.25,cf+.27]} rotation-x={Math.PI/2-.4}><torusGeometry args={[.15,.023,8,24]}/><meshStandardMaterial color="#20252a"/></mesh>
    <Box p={[0,belt+.16,.02]} s={[.11,.04,.2]} c="#6a6f73" metal={.7}/>
    {open&&[-1,1].map(side=><group key={side} position={[side*w*.28,belt+.3,L*.15]}><mesh><torusGeometry args={[.2,.035,8,24,Math.PI]}/><meshStandardMaterial color="#a8afb5" metalness={.9} roughness={.2}/></mesh>{[-.2,.2].map(x=><Box key={x} p={[x,-.15,0]} s={[.07,.3,.07]} c="#a8afb5" metal={.9}/>)}</group>)}
    {open&&<Prism width={w*.8} color="#7197a9" glass points={[[cf,belt],[cf+.22,H],[cf+.24,H],[cf+.03,belt]]}/>}
    {truck&&<><Box p={[0,belt-.1,L*.32]} s={[w*.78,.06,L*.28]} c="#242a2e"/>{[-1,1].map(side=><Box key={side} p={[side*w*.43,belt+.1,L*.32]} s={[.1,.36,L*.31]} c={color}/>)}<Box p={[0,belt+.1,rearZ-.07]} s={[w*.9,.36,.12]} c={color}/></>}
    {(d.body==='wagon'||suv)&&[-1,1].map(side=><Box key={side} p={[side*w*.32,H+.045,(topFront+topRear)/2]} s={[.035,.055,(topRear-topFront)*.9]} c="#a9afb3" metal={.8}/>)}
    {d.id==='raven'&&<><Box p={[0,belt+.32,rearZ-.2]} s={[w*.9,.06,.24]} c="#21272c"/>{[-1,1].map(side=><Box key={side} p={[side*w*.3,belt+.18,rearZ-.2]} s={[.04,.22,.04]} c="#20262c"/>)}</>}
    {[-1,1].map((side,i)=><group key={side}>
      <mesh position={[side*w*.34,belt-.05,frontZ-.025]}><boxGeometry args={[w*.23,van ? .19:.085,.045]}/><meshStandardMaterial ref={m=>{if(m)head.current[i]=m;}} color="#e9f5ff" emissive="#e9f5ff" emissiveIntensity={.35}/></mesh>
      <mesh position={[side*w*.34,belt-.04,rearZ+.025]}><boxGeometry args={[w*.23,.09,.04]}/><meshStandardMaterial ref={m=>{if(m)tail.current[i]=m;}} color="#b61122" emissive="#ff1b22" emissiveIntensity={.15}/></mesh>
      <Box p={[side*w*.43,belt-.08,frontZ-.028]} s={[.05,.05,.045]} c="#efa63c" glow={.25}/>
      <mesh position={[side*w*.29,.3,rearZ+.02]} rotation-x={Math.PI/2}><cylinderGeometry args={[.05,.05,.14,12]}/><meshStandardMaterial color="#b8bfc5" metalness={.95} roughness={.22}/></mesh>
    </group>)}
    {d.id==='volt'?<Box p={[0,belt-.04,rearZ+.03]} s={[w*.65,.028,.04]} c="#ff2634" glow={.5}/>:Array.from({length:van?7:4},(_,i)=><Box key={i} p={[0,.46+i*.038,frontZ-.035]} s={[w*.38,.017,.04]} c="#b5bdc4" metal={.85}/>)}
    {[frontZ-.065,rearZ+.065].map((z,i)=><group key={i}><Box p={[0,.36,z]} s={[.38,.12,.015]} c="#f2f0dd"/><Box p={[0,.36,z+(i ? .01:-.01)]} s={[.25,.018,.008]} c="#334c39"/></group>)}
    {[-1,1].flatMap((side,si)=>[-1,1].map((end,ei)=>{
      const n=si*2+ei,frontAxle=end===-1;
      return <group key={n} position={[side*w*.47,r,end*d.wheelbase/2]} ref={g=>{if(g&&frontAxle)front.current[si]=g;}}>
        <group ref={g=>{if(g)rolling.current[n]=g;}}>
          <mesh rotation-z={Math.PI/2} castShadow><cylinderGeometry args={[r,r,.2,24]}/><meshStandardMaterial color="#15191d" roughness={.95}/></mesh>
          <mesh rotation-y={Math.PI/2} position={[side*.108,0,0]}><torusGeometry args={[r*.69,r*.07,8,24]}/><meshStandardMaterial color="#c1c6ca" metalness={.9} roughness={.2}/></mesh>
          {Array.from({length:5},(_,i)=><mesh key={i} position={[side*.112,0,0]} rotation-x={i*Math.PI*2/5}><boxGeometry args={[.025,r*1.3,.035]}/><meshStandardMaterial color="#b8c0c6" metalness={.9} roughness={.2}/></mesh>)}
          <mesh rotation-z={Math.PI/2} position={[side*.116,0,0]}><cylinderGeometry args={[.07,.07,.035,12]}/><meshStandardMaterial color="#343b42" metalness={.8}/></mesh>
        </group>
      </group>;
    }))}
  </group>;
}
