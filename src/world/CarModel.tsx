import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { CarDef } from '../catalog/cars';
import type { OwnedCar } from '../state/vehicles';
import { STOCK_MODS } from '../catalog/carMods';
import type { CarMods, PaintFinish, WheelStyle } from '../catalog/carMods';

/** 塗装の質感ごとの材質 */
export function paintMaterial(finish:PaintFinish){
  return finish==='solid'?{roughness:.38,metalness:.08,clearcoat:.6}:finish==='pearl'?{roughness:.2,metalness:.35,clearcoat:1,iridescence:.55}
    :finish==='matte'?{roughness:.82,metalness:.2,clearcoat:0}:finish==='chrome'?{roughness:.05,metalness:1,clearcoat:1}:{roughness:.25,metalness:.55,clearcoat:1};
}
function Prism({width,points,color,glass=false,finish='metallic',opacity=.36}:{width:number;points:[number,number][];color:string;glass?:boolean;finish?:PaintFinish;opacity?:number}) {
  const geometry=useMemo(()=>{
    const shape=new THREE.Shape(); points.forEach(([z,y],i)=>i?shape.lineTo(-z,y):shape.moveTo(-z,y));shape.closePath();
    const g=new THREE.ExtrudeGeometry(shape,{depth:width,bevelEnabled:!glass,bevelSize:.025,bevelThickness:.025,bevelSegments:2,steps:1});
    g.rotateY(Math.PI/2);g.translate(-width/2,0,0);return g;
  },[width,JSON.stringify(points),glass]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  return <mesh geometry={geometry} castShadow={!glass}>{glass?<meshPhysicalMaterial color={color} roughness={.08} metalness={.1} clearcoat={1} transparent opacity={opacity} depthWrite={false}/>
    :<meshPhysicalMaterial color={color} {...paintMaterial(finish)}/>}</mesh>;
}
function Box({p,s,c,metal=0,glow=0}:{p:[number,number,number];s:[number,number,number];c:string;metal?:number;glow?:number}){
  return <mesh position={p} castShadow receiveShadow><boxGeometry args={s}/><meshStandardMaterial color={c} roughness={.35} metalness={metal} emissive={c} emissiveIntensity={glow}/></mesh>;
}
/** 窓の縁に沿って傾けた柱。from/to は車の前後(z)と高さ(y)。 */
function Pillar({x,from:[z0,y0],to:[z1,y1],size,color,finish='metallic'}:{x:number;from:[number,number];to:[number,number];size:number;color:string;finish?:PaintFinish}){
  return <mesh position={[x,(y0+y1)/2,(z0+z1)/2]} rotation-x={Math.atan2(z1-z0,y1-y0)} castShadow><boxGeometry args={[size,Math.hypot(z1-z0,y1-y0),size]}/><meshPhysicalMaterial color={color} {...paintMaterial(finish)}/></mesh>;
}
/** 車体の面に貼ったストライプ（from→to の線に沿って平らに置く） */
function Strip({x,from:[z0,y0],to:[z1,y1],width,color}:{x:number;from:[number,number];to:[number,number];width:number;color:string}){
  const a=Math.atan2(z1-z0,y1-y0);
  return <mesh position={[x,(y0+y1)/2+Math.sin(a)*.032,(z0+z1)/2-Math.cos(a)*.032]} rotation-x={a}><boxGeometry args={[width,Math.hypot(z1-z0,y1-y0),.006]}/><meshStandardMaterial color={color} roughness={.4}/></mesh>;
}
function Spokes({n,len,size,color,x,offset=0}:{n:number;len:number;size:[number,number];color:string;x:number;offset?:number}){
  return <>{Array.from({length:n},(_,i)=><group key={i} rotation-x={offset+i*Math.PI*2/n}><mesh position={[x,len/2,0]}><boxGeometry args={[size[0],len,size[1]]}/><meshStandardMaterial color={color} metalness={.85} roughness={.22}/></mesh></group>)}</>;
}
/** ホイールとタイヤ。side は外側の向き（+1 は右）。 */
export function Wheel({style,R,rim,color,side}:{style:WheelStyle;R:number;rim:number;color:string;side:number}){
  const off=style==='offroad',tire=off ? .27:.2,face=side*(tire/2+.008),metal={metalness:.88,roughness:.2};
  return <>
    <mesh rotation-z={Math.PI/2} castShadow><cylinderGeometry args={[R,R,tire,28]}/><meshStandardMaterial color="#15191d" roughness={.95}/></mesh>
    {off&&Array.from({length:18},(_,i)=><group key={i} rotation-x={i*Math.PI/9}><mesh position={[0,R,0]}><boxGeometry args={[tire*.9,.035,.07]}/><meshStandardMaterial color="#111417" roughness={1}/></mesh></group>)}
    {/* リムの内側（暗いバレル） */}
    <mesh rotation-z={Math.PI/2} position={[face*.5,0,0]}><cylinderGeometry args={[rim,rim,tire*.55,24,1,true]}/><meshStandardMaterial color="#2b3035" side={THREE.DoubleSide}/></mesh>
    <mesh rotation-y={Math.PI/2} position={[face,0,0]}><torusGeometry args={[rim,R*(style==='deep'?.1:.065),8,28]}/><meshStandardMaterial color={style==='deep'?'#d9dde0':color} {...metal}/></mesh>
    {style==='dish'?<mesh rotation-z={Math.PI/2} position={[face-side*.004,0,0]}><cylinderGeometry args={[rim*.96,rim*.96,.02,28]}/><meshStandardMaterial color={color} {...metal}/></mesh>
      :style==='mesh'?<><Spokes n={14} len={rim} size={[.012,.016]} color={color} x={face-side*.01}/><Spokes n={14} len={rim*.7} size={[.012,.016]} color={color} x={face-side*.016} offset={Math.PI/14}/></>
      :style==='spoke6'?<Spokes n={6} len={rim} size={[.03,.06]} color={color} x={face-side*.01}/>
      :style==='offroad'?<><Spokes n={6} len={rim} size={[.035,.05]} color={color} x={face-side*.01}/>{Array.from({length:10},(_,i)=><mesh key={i} position={[face+side*.012,Math.cos(i*Math.PI/5)*rim*.98,Math.sin(i*Math.PI/5)*rim*.98]} rotation-z={Math.PI/2}><cylinderGeometry args={[.012,.012,.02,6]}/><meshStandardMaterial color="#c9ccd0" {...metal}/></mesh>)}</>
      :<Spokes n={5} len={rim} size={[.025,.035]} color={color} x={face-side*(style==='deep'?.06:.01)}/>}
    {style==='deep'&&<mesh rotation-z={Math.PI/2} position={[face-side*.03,0,0]}><cylinderGeometry args={[rim,rim,.06,24,1,true]}/><meshStandardMaterial color="#e3e6e8" side={THREE.DoubleSide} {...metal}/></mesh>}
    <mesh rotation-z={Math.PI/2} position={[face+side*.006,0,0]}><cylinderGeometry args={[.065,.065,.035,12]}/><meshStandardMaterial color="#343b42" metalness={.8}/></mesh>
  </>;
}
/** リアウィング。base はトランク（または屋根の後ろ端）の位置と高さ。 */
function Wing({kind,w,base:[z,y],roof}:{kind:CarMods['wing'];w:number;base:[number,number];roof:boolean}){
  const dark='#1c2125';
  if(kind==='lip')return <mesh position={[0,y+.035,z]} rotation-x={roof ? .25:-.35}><boxGeometry args={[w*.84,.03,.16]}/><meshStandardMaterial color={dark} roughness={.4}/></mesh>;
  if(kind==='ducktail')return <mesh position={[0,y+.06,z+.05]} rotation-x={-.45}><boxGeometry args={[w*.9,.06,.32]}/><meshStandardMaterial color={dark} roughness={.35}/></mesh>;
  const h=kind==='swan'?.45:.38,blade=<group position={[0,y+h,z]} rotation-x={.12}>
    <mesh castShadow><boxGeometry args={[w*.98,.035,.34]}/><meshStandardMaterial color={dark} roughness={.3} metalness={.3}/></mesh>
    {[-1,1].map(s=><mesh key={s} position={[s*w*.49,-.03,0]}><boxGeometry args={[.02,.2,.4]}/><meshStandardMaterial color={dark}/></mesh>)}
  </group>;
  return <>{blade}{[-1,1].map(s=>kind==='swan'?<group key={s} position={[s*w*.25,0,z+.02]}>
      <mesh position={[0,y+h/2+.04,.08]}><boxGeometry args={[.025,h+.08,.06]}/><meshStandardMaterial color="#555c62" metalness={.7}/></mesh>
      <mesh position={[0,y+h+.07,0]}><boxGeometry args={[.025,.04,.2]}/><meshStandardMaterial color="#555c62" metalness={.7}/></mesh></group>
    :<mesh key={s} position={[s*w*.27,y+h/2,z+.04]}><boxGeometry args={[.03,h,.12]}/><meshStandardMaterial color="#555c62" metalness={.7}/></mesh>)}</>;
}
/** レーシングデザインのドアのゼッケン */
function Roundel({x,y,z,side}:{x:number;y:number;z:number;side:number}){
  const texture=useMemo(()=>{const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d')!;
    g.fillStyle='#fff';g.beginPath();g.arc(64,64,60,0,Math.PI*2);g.fill();g.fillStyle='#111';g.font='bold 70px sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText('07',64,68);
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;},[]);
  useEffect(()=>()=>texture.dispose(),[texture]);
  return <mesh position={[x,y,z]} rotation-y={side*Math.PI/2}><planeGeometry args={[.34,.34]}/><meshStandardMaterial map={texture} transparent roughness={.5}/></mesh>;
}
/** 窓の下端（ベルトライン）の高さ。車内の配置の基準。 */
export function carBelt(d:CarDef){return d.height*(d.body==='van'?.55:d.body==='coupe'||d.body==='roadster'?.51:.52);}
/** 運転席の目の位置（車の座標：x 左右、y 高さ、z 前後で前が −）。ハンドルの真後ろ。 */
export function driverEye(d:CarDef){
  const belt=carBelt(d),cf=-d.length*(d.body==='van'?.31:d.body==='coupe'||d.body==='roadster'?.10:.18);
  return {x:-d.width*.25,y:Math.min(belt+.56,d.height-.14),z:Math.max(cf+.85,d.length*.04)};
}
export function CarModel({def:d,color,pose,mods=STOCK_MODS}:{def:CarDef;color:string;pose?:OwnedCar;mods?:CarMods}) {
  const front=useRef<THREE.Group[]>([]),rolling=useRef<THREE.Group[]>([]);
  const tail=useRef<THREE.MeshStandardMaterial[]>([]),head=useRef<THREE.MeshStandardMaterial[]>([]);
  const w=d.width,L=d.length,H=d.height,r=d.wheel;
  const truck=d.body==='pickup',van=d.body==='van',suv=d.body==='suv',open=d.body==='roadster',sport=d.body==='coupe'||open;
  const belt=carBelt(d),frontZ=-L*.5,rearZ=L*.5;
  const cf=-L*(van ? .31:sport ? .10:.18),cr=L*(truck ? .04:d.body==='sedan'?.2:.32);
  const topFront=cf+L*.12,topRear=cr-L*(sport ? .10:.06);
  // 後席の背もたれは後ろの窓より前に置く（窓から突き出さないように）
  const rearSeat=Math.min(L*.31,topRear-.12);
  // カスタム：大きいホイールは外径も少し大きく、車高は車体だけを上下させる
  const R=r*(1+mods.wheelSize*.03)*(mods.wheel==='offroad'?1.06:1),rim=R*Math.min(.86,.66+mods.wheelSize*.06);
  const lift=mods.rideHeight/100+(R-r),camber=mods.camber*Math.PI/180,f=mods.finish;
  const roofColor=mods.livery==='twotone'?mods.accent:d.id==='volt'?'#16232b':color,pillarColor=mods.livery==='twotone'?mods.accent:color;
  const stripes=mods.livery==='stripes'||mods.livery==='racing',sideLine=mods.livery==='side'||mods.livery==='racing';
  const glass=['#3e6073','#2c3e48','#1b252b','#0b0f12'][mods.tint],glassOpacity=[.36,.55,.72,.88][mods.tint];
  const roofWing=d.body==='hatch'||d.body==='wagon'||suv||van;
  const wingBase:[number,number]=roofWing&&!open?[topRear+.02,H-.02]:[rearZ-.22,belt+.03];
  const quad=mods.engine==='v6tt'||mods.engine==='v8'||mods.engine==='v12',ev=mods.engine==='electric'||(d.id==='volt'&&mods.engine==='stock');
  useFrame(()=>{
    if(!pose)return;
    front.current.forEach(g=>{if(g)g.rotation.y=-pose.steer;});
    rolling.current.forEach(g=>{if(g)g.rotation.x=pose.wheelSpin;});
    tail.current.forEach(m=>{if(m)m.emissiveIntensity=pose.braking?2.2:pose.lights ? .7:.15;});
    head.current.forEach(m=>{if(m)m.emissiveIntensity=pose.lights?2.8:.35;});
  });
  return <group>
   <group position-y={lift}>
    <Box p={[0,r*.85,0]} s={[w*.83,.16,L*.9]} c="#171b20"/>
    <Prism width={w*.94} color={color} finish={f} points={[[frontZ,.43],[frontZ+.18,belt-.04],[cf,belt+.05],[rearZ-.16,belt+.02],[rearZ,.4]]}/>
    <Box p={[0,.38,frontZ+.06]} s={[w*.9,.12,.12]} c="#21262b"/>
    <Box p={[0,.38,rearZ-.04]} s={[w*.9,.12,.12]} c="#21262b"/>
    {!open&&<><Prism width={w*.79} color={glass} opacity={glassOpacity} glass points={[[cf,belt],[topFront,H-.06],[topRear,H-.06],[cr,belt]]}/>
      <mesh position={[0,H-.025,(topFront+topRear)/2]} castShadow><boxGeometry args={[w*.8,.06,Math.max(.3,topRear-topFront)]}/><meshPhysicalMaterial color={roofColor} {...paintMaterial(f)}/></mesh>
      {[-1,1].map(side=><group key={side}>
        <Pillar x={side*w*.4} from={[cf,belt]} to={[topFront,H-.03]} size={.055} color={pillarColor} finish={f}/>
        <Pillar x={side*w*.4} from={[cr,belt]} to={[topRear,H-.03]} size={.07} color={pillarColor} finish={f}/>
        {d.seats>2&&<Box p={[side*w*.405,(belt+H-.06)/2,(topFront+topRear)/2]} s={[.045,H-.06-belt,.065]} c="#171b20"/>}
      </group>)}</>}
    {stripes&&[-1,1].map(side=><group key={side}>
      <Strip x={side*w*.075} from={[frontZ,.43]} to={[frontZ+.18,belt-.04]} width={w*.09} color={mods.accent}/>
      <Strip x={side*w*.075} from={[frontZ+.18,belt-.04]} to={[cf,belt+.05]} width={w*.09} color={mods.accent}/>
      {!open&&<mesh position={[side*w*.075,H+.008,(topFront+topRear)/2]}><boxGeometry args={[w*.09,.004,Math.max(.3,topRear-topFront)]}/><meshStandardMaterial color={mods.accent} roughness={.4}/></mesh>}
      <Strip x={side*w*.075} from={[cr,belt+.05-(cr-cf)/(rearZ-.16-cf)*.03]} to={[rearZ-.16,belt+.02]} width={w*.09} color={mods.accent}/>
      <Strip x={side*w*.075} from={[rearZ-.16,belt+.02]} to={[rearZ,.4]} width={w*.09} color={mods.accent}/>
    </group>)}
    {sideLine&&[-1,1].map(side=><mesh key={side} position={[side*(w*.47+.028),belt*.74,0]}><boxGeometry args={[.006,.07,L*.82]}/><meshStandardMaterial color={mods.accent} roughness={.4}/></mesh>)}
    {mods.livery==='racing'&&[-1,1].map(side=><Roundel key={side} side={side} x={side*(w*.47+.032)} y={belt*.58} z={-L*.04}/>)}
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
    {mods.wing==='stock'?d.id==='raven'&&<><Box p={[0,belt+.32,rearZ-.2]} s={[w*.9,.06,.24]} c="#21272c"/>{[-1,1].map(side=><Box key={side} p={[side*w*.3,belt+.18,rearZ-.2]} s={[.04,.22,.04]} c="#20262c"/>)}</>
      :mods.wing!=='none'&&<Wing kind={mods.wing} w={w} base={wingBase} roof={roofWing&&!open}/>}
    {/* 大排気量エンジンはボンネットにエアスクープ */}
    {(mods.engine==='v8'||mods.engine==='v12'||mods.engine==='rotary')&&<mesh position={[0,(belt-.04+belt+.05)/2+.07,(frontZ+.18+cf)/2]} castShadow><boxGeometry args={[w*.28,.09,Math.min(.6,(cf-frontZ)*.45)]}/><meshPhysicalMaterial color={mods.engine==='v12'?'#1b1f22':color} {...paintMaterial(f)}/></mesh>}
    {[-1,1].map((side,i)=><group key={side}>
      <mesh position={[side*w*.34,belt-.05,frontZ-.025]}><boxGeometry args={[w*.23,van ? .19:.085,.045]}/><meshStandardMaterial ref={m=>{if(m)head.current[i]=m;}} color="#e9f5ff" emissive="#e9f5ff" emissiveIntensity={.35}/></mesh>
      <mesh position={[side*w*.34,belt-.04,rearZ+.025]}><boxGeometry args={[w*.23,.09,.04]}/><meshStandardMaterial ref={m=>{if(m)tail.current[i]=m;}} color="#b61122" emissive="#ff1b22" emissiveIntensity={.15}/></mesh>
      <Box p={[side*w*.43,belt-.08,frontZ-.028]} s={[.05,.05,.045]} c="#efa63c" glow={.25}/>
      {!ev&&(quad?[-.07,.07]:[0]).map(dx=><mesh key={dx} position={[side*w*.29+dx,.3,rearZ+.02]} rotation-x={Math.PI/2}><cylinderGeometry args={[quad ? .045:.05,quad ? .045:.05,.14,12]}/><meshStandardMaterial color="#b8bfc5" metalness={.95} roughness={.22}/></mesh>)}
    </group>)}
    {d.id==='volt'?<Box p={[0,belt-.04,rearZ+.03]} s={[w*.65,.028,.04]} c="#ff2634" glow={.5}/>:Array.from({length:van?7:4},(_,i)=><Box key={i} p={[0,.46+i*.038,frontZ-.035]} s={[w*.38,.017,.04]} c="#b5bdc4" metal={.85}/>)}
    {[frontZ-.065,rearZ+.065].map((z,i)=><group key={i}><Box p={[0,.36,z]} s={[.38,.12,.015]} c="#f2f0dd"/><Box p={[0,.36,z+(i ? .01:-.01)]} s={[.25,.018,.008]} c="#334c39"/></group>)}
   </group>
    {[-1,1].flatMap((side,si)=>[-1,1].map((end,ei)=>{
      const n=si*2+ei,frontAxle=end===-1;
      return <group key={n} position={[side*(w*.47+mods.camber*.004),R,end*d.wheelbase/2]} ref={g=>{if(g&&frontAxle)front.current[si]=g;}}>
        {/* ネガティブキャンバー：タイヤの上側を車体の内側へ傾ける */}
        <group rotation-z={side*camber}>
          <group ref={g=>{if(g)rolling.current[n]=g;}}>
            <Wheel style={mods.wheel} R={R} rim={rim} color={mods.wheelColor} side={side}/>
          </group>
        </group>
      </group>;
    }))}
  </group>;
}
