import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { RoundedBox } from '@react-three/drei';
import type { CarDef } from '../catalog/cars';
import type { OwnedCar } from '../state/vehicles';
import { STOCK_MODS } from '../catalog/carMods';
import type { CarMods, PaintFinish, WheelStyle } from '../catalog/carMods';
import { carGeoms, carShape, gridGeometry, samples } from './carShape';
import type { CarShape, Row } from './carShape';
import { driverEye } from './vehicleSeats';
export { driverEye } from './vehicleSeats';

/** 塗装の質感ごとの材質 */
export function paintMaterial(finish:PaintFinish){
  return finish==='solid'?{roughness:.38,metalness:.08,clearcoat:.6}:finish==='pearl'?{roughness:.2,metalness:.35,clearcoat:1,iridescence:.55}
    :finish==='matte'?{roughness:.82,metalness:.2,clearcoat:0}:finish==='chrome'?{roughness:.05,metalness:1,clearcoat:1}:{roughness:.25,metalness:.55,clearcoat:1};
}
function Box({p,s,c,metal=0,glow=0}:{p:[number,number,number];s:[number,number,number];c:string;metal?:number;glow?:number}){
  return <mesh position={p} castShadow receiveShadow><boxGeometry args={s}/><meshStandardMaterial color={c} roughness={.35} metalness={metal} emissive={c} emissiveIntensity={glow}/></mesh>;
}
function Spokes({n,len,size,color,x,offset=0}:{n:number;len:number;size:[number,number];color:string;x:number;offset?:number}){
  return <>{Array.from({length:n},(_,i)=><group key={i} rotation-x={offset+i*Math.PI*2/n}><mesh position={[x,len/2,0]}><boxGeometry args={[size[0],len,size[1]]}/><meshStandardMaterial color={color} metalness={.85} roughness={.22}/></mesh></group>)}</>;
}
const tireCache=new Map<string,THREE.LatheGeometry>();
/** 角の丸いタイヤ（断面を回転させた形） */
function Tire({R,rim,width}:{R:number;rim:number;width:number}){
  const key=[R,rim,width].map(v=>v.toFixed(3)).join(),t=width/2;
  let g=tireCache.get(key);
  if(!g){const c=Math.min(.05,(R-rim)*.45),pts=[[rim*.97,-t*.9],[R-c,-t],[R-c*.3,-t+c*.3],[R,-t+c],[R,t-c],[R-c*.3,t-c*.3],[R-c,t],[rim*.97,t*.9]].map(([x,y])=>new THREE.Vector2(x,y));
    g=new THREE.LatheGeometry(pts,32);g.rotateZ(Math.PI/2);tireCache.set(key,g);}
  return <mesh geometry={g} castShadow><meshStandardMaterial color="#15191d" roughness={.92} side={THREE.DoubleSide}/></mesh>;
}
/** タイヤの幅 */
export const tireWidth=(style:WheelStyle)=>style==='offroad'?.27:.2;
/** ホイールとタイヤ。side は外側の向き（+1 は右）。 */
export function Wheel({style,R,rim,color,side}:{style:WheelStyle;R:number;rim:number;color:string;side:number}){
  const off=style==='offroad',tire=off ? .27:.2,face=side*(tire/2+.008),metal={metalness:.88,roughness:.2};
  return <>
    <Tire R={R} rim={rim} width={tire}/>
    {/* ブレーキディスク */}
    <mesh rotation-z={Math.PI/2} position={[face-side*tire*.42,0,0]}><cylinderGeometry args={[rim*.78,rim*.78,.025,24]}/><meshStandardMaterial color="#8d9196" metalness={.7} roughness={.45}/></mesh>
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
export { carBelt } from './carShape';
/** 運転席の目の位置（車の座標：x 左右、y 高さ、z 前後で前が −）。ハンドルの真後ろ。 */
type V3=[number,number,number];
const UP=new THREE.Vector3(0,1,0);
/** a から b へ伸びる角材 */
function Beam({a,b,size,color,metal=0,rough=.4}:{a:V3;b:V3;size:[number,number];color:string;metal?:number;rough?:number}){
  const [pos,quat,len]=useMemo(()=>{const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),dir=B.clone().sub(A);
    return [A.add(B).multiplyScalar(.5),new THREE.Quaternion().setFromUnitVectors(UP,dir.clone().normalize()),dir.length()] as const;},[a.join(),b.join()]);
  return <mesh position={pos} quaternion={quat} castShadow><boxGeometry args={[size[0],len,size[1]]}/><meshStandardMaterial color={color} metalness={metal} roughness={rough}/></mesh>;
}
function RBox({p,s,c,r=.03,rot,rough=.6,metal=0}:{p:V3;s:V3;c:string;r?:number;rot?:V3;rough?:number;metal?:number}){
  return <RoundedBox args={s} radius={Math.min(r,...s.map(v=>v/2.05))} smoothness={2} position={p} rotation={rot} castShadow><meshStandardMaterial color={c} roughness={rough} metalness={metal}/></RoundedBox>;
}
/** 車内の色：[シート, シートの中央, ダッシュボード, 差し色] */
const TRIM:Record<string,[string,string,string,string]>={
  moco:['#8b8478','#a9a294','#3a3a38','#c9c3b5'],pico:['#4a4f55','#6b7178','#2a2d31','#9aa3ab'],aria:['#c9b38f','#ddcdae','#2e2a26','#7a5534'],
  tour:['#7a5338','#8e6446','#2c2925','#a8a49c'],ridge:['#26282b','#3a3d41','#202224','#8d9399'],lounge:['#b9b2a5','#cfc8bb','#3b3a37','#c2b9a6'],
  raven:['#1d1e20','#b3202c','#151618','#b3202c'],breeze:['#a56b3d','#c08552','#2a2623','#c9cdd0'],terra:['#2e3033','#4a4d52','#25272a','#a8714a'],volt:['#e8e6e1','#fafafa','#1c1f22','#5fc3e4'],
};
let gaugeTex:THREE.CanvasTexture|null=null,screenTex:THREE.CanvasTexture|null=null;
/** メーター（速度計と回転計）の文字盤 */
function gaugeTexture(){
  if(gaugeTex)return gaugeTex;
  const c=document.createElement('canvas');c.width=512;c.height=192;const g=c.getContext('2d')!;
  g.fillStyle='#07090b';g.fillRect(0,0,512,192);
  [[128,'km/h',12],[384,'x1000',8]].forEach(([cx,label,n])=>{
    g.strokeStyle='#2c3238';g.lineWidth=4;g.beginPath();g.arc(cx as number,96,84,0,Math.PI*2);g.stroke();
    for(let i=0;i<=(n as number);i++){const a=Math.PI*.75+i/(n as number)*Math.PI*1.5,red=label!=='km/h'&&i>=(n as number)-1;
      g.strokeStyle=red?'#ff3b3b':'#e8eef2';g.lineWidth=i%2?2:4;g.beginPath();g.moveTo(cx as number+Math.cos(a)*76,96+Math.sin(a)*76);g.lineTo(cx as number+Math.cos(a)*(i%2?68:62),96+Math.sin(a)*(i%2?68:62));g.stroke();
      if(i%2===0){g.fillStyle='#cfd8de';g.font='bold 15px sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(String(label==='km/h'?i*20:i),cx as number+Math.cos(a)*48,96+Math.sin(a)*48);}}
    g.fillStyle='#8fa3b0';g.font='13px sans-serif';g.fillText(label as string,cx as number,140);
  });
  g.fillStyle='#5fc3e4';g.fillRect(232,60,48,72);g.fillStyle='#07090b';g.font='bold 30px sans-serif';g.textAlign='center';g.fillText('D',256,98);
  gaugeTex=new THREE.CanvasTexture(c);gaugeTex.colorSpace=THREE.SRGBColorSpace;return gaugeTex;
}
/** センターディスプレイ（地図の画面） */
function screenTexture(){
  if(screenTex)return screenTex;
  const c=document.createElement('canvas');c.width=256;c.height=160;const g=c.getContext('2d')!;
  g.fillStyle='#e9ece6';g.fillRect(0,0,256,160);g.fillStyle='#b9d9a8';g.fillRect(150,10,90,60);g.fillStyle='#a9cbe6';g.fillRect(20,110,80,40);
  g.strokeStyle='#fff';g.lineWidth=10;[[0,60,256,80],[90,0,120,160],[0,140,256,120]].forEach(([a,b,cc,dd])=>{g.beginPath();g.moveTo(a,b);g.lineTo(cc,dd);g.stroke();});
  g.strokeStyle='#2a7bff';g.lineWidth=6;g.beginPath();g.moveTo(105,160);g.lineTo(112,72);g.lineTo(256,82);g.stroke();
  g.fillStyle='#ff5a36';g.beginPath();g.moveTo(108,128);g.lineTo(98,148);g.lineTo(118,148);g.fill();
  g.fillStyle='#1d2329';g.fillRect(0,0,256,22);g.fillStyle='#fff';g.font='13px sans-serif';g.fillText('12:00   FM 80.0   ☀ 22°',8,15);
  screenTex=new THREE.CanvasTexture(c);screenTex.colorSpace=THREE.SRGBColorSpace;return screenTex;
}
/** 内装：ダッシュボード・メーター・ハンドル・シート・ドアの内張り・センターコンソール */
function Interior({d,s,pose,color}:{d:CarDef;s:CarShape;pose?:OwnedCar;color:string}){
  const [seat,insert,dash,accent]=TRIM[d.id]??['#3a3c40','#55585d','#26282b','#9aa0a6'];
  const e=driverEye(d),cush=e.y-.72,belt=s.belt,floor=s.floorY,wheel=useRef<THREE.Group>(null),speedo=useRef<THREE.Group>(null),tach=useRef<THREE.Group>(null);
  const zD=e.z-.62,hwIn=s.hwAt(e.z)*.86,open=d.body==='roadster';
  useFrame(()=>{
    if(!pose)return;const v=Math.min(1,Math.abs(pose.speed)/(d.maxSpeed*1.5));
    if(wheel.current)wheel.current.rotation.z=-pose.steer*2.6;
    if(speedo.current)speedo.current.rotation.z=Math.PI*.75-v*Math.PI*1.5;
    if(tach.current)tach.current.rotation.z=Math.PI*.75-(.12+((Math.abs(pose.speed)*.9)%4)/4*.55+v*.25)*Math.PI*1.5;
  });
  const dashGeo=useMemo(()=>{
    const pts:[number,number][]=[[s.cf-.03,belt-.03],[s.cf+(zD-s.cf)*.45,belt+.06],[zD-.06,belt+.07],[zD,belt+.01],[zD+.03,belt-.2],[zD-.08,belt-.36],[s.cf,belt-.36]];
    const shape=new THREE.Shape();pts.forEach(([z,y],i)=>i?shape.lineTo(-z,y):shape.moveTo(-z,y));shape.closePath();
    const width=s.hwAt(s.cf+.2)*1.84,g=new THREE.ExtrudeGeometry(shape,{depth:width,bevelEnabled:true,bevelSize:.02,bevelThickness:.02,bevelSegments:3});
    g.rotateY(Math.PI/2);g.translate(-width/2,0,0);return g;
  },[d.id]);
  useEffect(()=>()=>dashGeo.dispose(),[dashGeo]);
  /** 1脚のシート。x は中心、z は背もたれの付け根。 */
  const Seat=({x,z,sw=.5,bench=false}:{x:number;z:number;sw?:number;bench?:boolean})=><group position={[x,0,z]}>
    <Box p={[0,(floor+cush-.12)/2,-.24]} s={[sw*.7,Math.max(.02,cush-.12-floor),.4]} c="#1b1d20"/>
    <RBox p={[0,cush-.06,-.25]} s={[sw,.13,.5]} c={seat} r={.05}/>
    <RBox p={[0,cush+.003,-.25]} s={[sw*.56,.02,.42]} c={insert} r={.01}/>
    <group position={[0,cush,-.02]} rotation-x={.2}>
      <RBox p={[0,.31,0]} s={[sw,.6,.13]} c={seat} r={.05}/>
      <RBox p={[0,.3,-.068]} s={[sw*.56,.5,.02]} c={insert} r={.01}/>
      {!bench&&[-1,1].map(k=><RBox key={k} p={[k*sw*.43,.27,-.05]} s={[.09,.5,.1]} c={seat} r={.04}/>)}
      {!bench&&<RBox p={[0,.7,.01]} s={[sw*.52,.17,.1]} c={seat} r={.05}/>}
      {bench&&[-1,0,1].map(k=><RBox key={k} p={[k*sw*.33,.69,.01]} s={[.22,.15,.09]} c={seat} r={.04}/>)}
    </group>
  </group>;
  const rb=d.seats>5?s.topRear-.14:Math.min(s.topRear-.08,e.z+1.02);
  return <group>
    {/* 床のカーペット */}
    <Box p={[0,floor+.012,(s.cf+s.tubs[0][1])/2]} s={[hwIn*2,.02,s.tubs[0][1]-s.cf-.02]} c="#1d1f22"/>
    <mesh geometry={dashGeo}><meshStandardMaterial color={dash} roughness={.7}/></mesh>
    {/* ダッシュの差し色（木目・アルミ） */}
    <Box p={[0,belt-.08,zD+.025]} s={[s.hwAt(zD)*1.6,.035,.012]} c={accent} metal={d.id==='aria'||d.id==='terra'?0:.6}/>
    {/* メーター */}
    <group position={[e.x,belt-.075,zD+.03]} rotation-x={-.12}>
      <Box p={[0,.115,-.04]} s={[.4,.035,.12]} c={dash}/>
      <mesh><planeGeometry args={[.36,.135]}/><meshBasicMaterial map={gaugeTexture()} toneMapped={false}/></mesh>
      {[[-.09,speedo],[.09,tach]].map(([x,ref],i)=><group key={i} position={[x as number,0,.004]} ref={ref as React.RefObject<THREE.Group>} rotation-z={Math.PI*.75}>
        <mesh position={[0,.022,0]}><boxGeometry args={[.004,.045,.002]}/><meshBasicMaterial color="#ff4a2a" toneMapped={false}/></mesh></group>)}
    </group>
    {/* センターディスプレイとエアコン吹き出し口 */}
    <group position={[0,belt+.02,zD+.01]} rotation-x={-.25}>
      <Box p={[0,0,-.01]} s={[.27,.17,.02]} c="#0d0f11"/>
      <mesh position={[0,0,.001]}><planeGeometry args={[.25,.15]}/><meshBasicMaterial map={screenTexture()} toneMapped={false}/></mesh>
    </group>
    {[-1,-.3,.3,1].map(k=><Box key={k} p={[k*s.hwAt(zD)*.62,belt-.15,zD+.03]} s={[.12,.045,.012]} c="#101214"/>)}
    {/* ハンドル（ステアで回る） */}
    <group position={[e.x,e.y-.43,e.z-.43]} rotation-x={-.42}>
      <mesh position={[0,0,-.18]} rotation-x={Math.PI/2}><cylinderGeometry args={[.025,.03,.34,10]}/><meshStandardMaterial color="#1a1c1f"/></mesh>
      <group ref={wheel}>
        <mesh><torusGeometry args={[.17,.019,10,32]}/><meshStandardMaterial color="#17191b" roughness={.75}/></mesh>
        <RBox p={[0,0,-.01]} s={[.12,.09,.05]} c="#202326" r={.02}/>
        {[0,Math.PI*2/3,-Math.PI*2/3].map(a=><group key={a} rotation-z={a+Math.PI}><Box p={[0,.09,-.012]} s={[.035,.12,.015]} c="#2a2d31" metal={.4}/></group>)}
        <mesh position={[0,0,.016]}><circleGeometry args={[.022,16]}/><meshStandardMaterial color="#b8bec4" metalness={.9} roughness={.2}/></mesh>
      </group>
    </group>
    {/* ペダル */}
    {[-.1,0,.1].map((dx,i)=><Box key={i} p={[e.x+dx-.02,floor+.12,zD+.12]} s={[i===2?.05:.07,.09,.015]} c="#3b3f44" metal={.6}/>)}
    {/* センターコンソールとシフトレバー */}
    <RBox p={[0,(floor+cush+.04)/2,(zD+e.z+.3)/2]} s={[.2,cush+.04-floor,e.z+.3-zD]} c={dash} r={.03}/>
    <Box p={[0,cush+.05,e.z-.18]} s={[.14,.012,.16]} c="#121416" metal={.4}/>
    <mesh position={[0,cush+.11,e.z-.16]}><cylinderGeometry args={[.008,.012,.11,8]}/><meshStandardMaterial color="#2a2d31" metalness={.6}/></mesh>
    <mesh position={[0,cush+.17,e.z-.16]}><sphereGeometry args={[.028,12,10]}/><meshStandardMaterial color={d.id==='raven'?'#b3202c':'#1a1c1f'} roughness={.4}/></mesh>
    <RBox p={[0,cush+.07,e.z+.18]} s={[.18,.05,.3]} c={seat} r={.02}/>
    {/* ドアの内張り（肘掛けとドアノブ） */}
    {[-1,1].map(k=><group key={k}>
      <Box p={[k*(hwIn+.012),(floor+.08+belt)/2,(s.cf+.3+s.tubs[0][1])/2]} s={[.02,belt-floor-.08,s.tubs[0][1]-s.cf-.35]} c={dash}/>
      <Box p={[k*(hwIn-.004),belt-.12,e.z-.05]} s={[.012,.16,.55]} c={seat}/>
      <RBox p={[k*(hwIn-.04),cush+.14,e.z+.02]} s={[.07,.05,.38]} c={dash} r={.02}/>
      <Box p={[k*(hwIn-.008),belt-.03,e.z-.32]} s={[.01,.025,.09]} c="#c4c9ce" metal={.9}/>
    </group>)}
    {/* シート */}
    <Seat x={e.x} z={e.z+.36}/>
    <Seat x={-e.x} z={e.z+.36}/>
    {d.seats>5&&<><Seat x={e.x} z={e.z+1.3}/><Seat x={-e.x} z={e.z+1.3}/></>}
    {d.seats>2&&<Seat x={0} z={rb} sw={hwIn*1.85} bench/>}
    {/* 天井とルームミラー */}
    {!open&&<><Box p={[0,s.roofAt((s.topFront+s.topRear)/2)-.04,(s.topFront+s.topRear)/2]} s={[s.hwRoof((s.topFront+s.topRear)/2)*1.9,.012,Math.max(.3,s.topRear-s.topFront)]} c="#cfcac2"/>
      <RBox p={[0,s.roofAt(s.topFront)-.1,s.topFront+.03]} s={[.24,.06,.02]} c="#1b1d20" r={.015}/>
      <Box p={[0,s.roofAt(s.topFront)-.1,s.topFront+.041]} s={[.21,.045,.003]} c="#9fb6c4" metal={.9}/>
      {[-1,1].map(k=><Box key={k} p={[k*s.hwRoof(s.topFront)*.55,s.roofAt(s.topFront)-.05,s.topFront+.1]} s={[.3,.015,.16]} c="#cfcac2"/>)}</>}
    {open&&<Box p={[0,belt-.01,(s.tubs[0][1]+s.cr)/2+.25]} s={[s.hwAt(s.cr)*1.7,.02,.5]} c={color}/>}
  </group>;
}
/** 車体の上に貼るストライプ・サイドライン */
function Livery({d,s,mods}:{d:CarDef;s:CarShape;mods:CarMods}){
  const stripes=mods.livery==='stripes'||mods.livery==='racing',sideLine=mods.livery==='side'||mods.livery==='racing';
  const geo=useMemo(()=>{
    const out:THREE.BufferGeometry[]=[],bw=s.w*.09;
    if(stripes)for(const k of [-1,1]){
      const x0=k*s.w*.075-bw/2,x1=x0+bw,rows=(zs:number[],y:(z:number)=>number)=>zs.map(z=>[[x0,y(z),z],[x1,y(z),z]] as Row);
      out.push(gridGeometry(rows(samples(s.frontZ+.03,s.cf,.04),z=>s.topAt(z)+.029)));
      out.push(gridGeometry(rows(samples(s.tubs[0][1],s.rearZ-.03,.04),z=>s.topAt(z)+.029)));
      if(d.body!=='roadster')out.push(gridGeometry(rows(samples(s.topFront,s.topRear,.04),z=>s.roofAt(z)+.012)));
    }
    if(sideLine)for(const k of [-1,1]){
      const y=s.belt*.74;
      out.push(gridGeometry(samples(s.frontZ+.15,s.rearZ-.15,.03).map(z=>{const rg=s.ring(z);return rg[1][1]>y-.05?[null,null]:[[k*(s.hwAt(z)+.004),y-.035,z],[k*(s.hwAt(z)+.004),y+.035,z]] as Row;})));
    }
    return out;
  },[d.id,stripes,sideLine]);
  useEffect(()=>()=>geo.forEach(g=>g.dispose()),[geo]);
  return <>{geo.map((g,i)=><mesh key={i} geometry={g}><meshStandardMaterial color={mods.accent} roughness={.4} side={THREE.DoubleSide} polygonOffset polygonOffsetFactor={-2}/></mesh>)}
    {mods.livery==='racing'&&[-1,1].map(k=><Roundel key={k} side={k} x={k*(s.hwAt(-s.L*.04)+.008)} y={s.belt*.55} z={-s.L*.04}/>)}</>;
}
/** ドアの合わせ目（車体の断面に沿った細い線） */
function seamGeometry(s:CarShape,z:number,side:number){
  const pts=s.ring(z).slice(2,7).map(([x,y])=>[side*(x+.003),y] as [number,number]);
  return gridGeometry([-.005,.005].map(dz=>pts.map(([x,y])=>[x,y,z+dz] as [number,number,number])));
}
export function CarModel({def:d,color,pose,mods=STOCK_MODS}:{def:CarDef;color:string;pose?:OwnedCar;mods?:CarMods}) {
  const front=useRef<THREE.Group[]>([]),rolling=useRef<THREE.Group[]>([]);
  const tail=useRef<THREE.MeshStandardMaterial[]>([]),head=useRef<THREE.MeshStandardMaterial[]>([]);
  const s=carShape(d),geo=carGeoms(d);
  const w=d.width,L=d.length,r=d.wheel,belt=s.belt,frontZ=s.frontZ,rearZ=s.rearZ,b0=s.b0;
  const truck=d.body==='pickup',van=d.body==='van',suv=d.body==='suv',open=d.body==='roadster';
  // カスタム：大きいホイールは外径も少し大きく、車高は車体だけを上下させる
  const R=r*(1+mods.wheelSize*.03)*(mods.wheel==='offroad'?1.06:1),rim=R*Math.min(.86,.66+mods.wheelSize*.06);
  const lift=mods.rideHeight/100+(R-r),camber=mods.camber*Math.PI/180,f=mods.finish;
  const roofColor=mods.livery==='twotone'?mods.accent:d.id==='volt'?'#16232b':color,pillarColor=mods.livery==='twotone'?mods.accent:color;
  const glass=['#3e6073','#2c3e48','#1b252b','#0b0f12'][mods.tint],glassOpacity=[.3,.5,.7,.86][mods.tint];
  const roofWing=d.body==='hatch'||d.body==='wagon'||suv||van;
  const wingBase:[number,number]=roofWing&&!open?[s.topRear+.02,s.roofAt(s.topRear)]:[rearZ-.22,s.topAt(rearZ-.22)+.03];
  const quad=mods.engine==='v6tt'||mods.engine==='v8'||mods.engine==='v12',ev=mods.engine==='electric'||(d.id==='volt'&&mods.engine==='stock');
  const e=driverEye(d),bz=d.seats>2?e.z+.3:e.z+.45,rearDoor=d.seats>2?Math.min(s.cr-.12,bz+.92):null;
  const seams=useMemo(()=>[s.cf+.06,bz,...(rearDoor?[rearDoor]:[])].flatMap(z=>[-1,1].map(k=>seamGeometry(s,z,k))),[d.id]);
  useEffect(()=>()=>seams.forEach(g=>g.dispose()),[seams]);
  useFrame(()=>{
    if(!pose)return;
    front.current.forEach(g=>{if(g)g.rotation.y=-pose.steer;});
    rolling.current.forEach(g=>{if(g)g.rotation.x=pose.wheelSpin;});
    tail.current.forEach(m=>{if(m)m.emissiveIntensity=pose.braking?2.2:.7;});
    head.current.forEach(m=>{if(m)m.emissiveIntensity=2.8;});
  });
  const paint=<meshPhysicalMaterial color={color} {...paintMaterial(f)} side={THREE.DoubleSide}/>;
  const faceH=s.noseH-.08-(b0+.14),tailTop=s.tailH,ftop=s.noseH;
  const pill=(a:V3,b:V3,size:[number,number],c=pillarColor)=><Beam a={a} b={b} size={size} color={c} rough={.35}/>;
  return <group>
   <group position-y={lift}>
    <mesh geometry={geo.body} castShadow>{paint}</mesh>
    {seams.map((g,i)=><mesh key={i} geometry={g}><meshBasicMaterial color="#0b0d0f" side={THREE.DoubleSide}/></mesh>)}
    {/* 床下とホイールハウスの内側 */}
    <Box p={[0,b0+.03,0]} s={[w*.62,.08,L*.86]} c="#15181b"/>
    {s.wheelZ.map(z=>[-1,1].map(k=><mesh key={z+'_'+k} position={[k*(w/2-.15),r,z]} rotation-z={Math.PI/2}>
      <cylinderGeometry args={[s.archR-.005,s.archR-.005,.3,20,1,true,0,Math.PI]}/><meshStandardMaterial color="#0e1012" side={THREE.DoubleSide} roughness={.9}/></mesh>))}
    {/* SUV・ピックアップの樹脂フェンダー */}
    {(suv||truck)&&s.wheelZ.map(z=>[-1,1].map(k=><mesh key={z+'f'+k} position={[k*(s.hwAt(z)-.01),r,z]} rotation-y={Math.PI/2}>
      <torusGeometry args={[s.archR+.02,.04,6,20,Math.PI]}/><meshStandardMaterial color="#1d2226" roughness={.8}/></mesh>))}
    {/* 窓・屋根・柱 */}
    {geo.glass&&<mesh geometry={geo.glass}><meshPhysicalMaterial color={glass} roughness={.05} metalness={.1} clearcoat={1} transparent opacity={glassOpacity} depthWrite={false} side={THREE.DoubleSide}/></mesh>}
    {geo.pillars.map((g,i)=><mesh key={i} geometry={g} castShadow><meshPhysicalMaterial color={pillarColor} {...paintMaterial(f)} side={THREE.DoubleSide}/></mesh>)}
    {geo.roof&&<mesh geometry={geo.roof} castShadow><meshPhysicalMaterial color={roofColor} {...paintMaterial(f)} side={THREE.DoubleSide}/></mesh>}
    {!open&&[-1,1].map(k=><group key={k}>
      {bz<s.topRear-.05&&pill([k*s.hwBelt(bz)*1.004,belt,bz],[k*s.hwRoof(bz)*1.004,s.roofAt(bz)-.02,bz],[.02,.07],'#111417')}
      {rearDoor&&rearDoor<s.topRear&&pill([k*s.hwBelt(rearDoor)*1.004,belt,rearDoor],[k*s.hwRoof(rearDoor)*1.004,s.roofAt(rearDoor)-.02,rearDoor],[.02,.06],'#111417')}
      {/* 窓の下の縁（モール） */}
      {pill([k*(s.hwBelt(s.cf+.08)+.004),belt-.005,s.cf+.08],[k*(s.hwBelt(s.cr-.08)+.004),belt-.005,s.cr-.08],[.012,.025],d.id==='aria'||van?'#c6cbd0':'#111417')}
      {/* ドアミラー */}
      <group position={[k*(s.hwBelt(s.cf+.12)+.03),belt+.06,s.cf+.12]}>
        <Box p={[k*.04,-.02,0]} s={[.08,.03,.05]} c="#15181b"/>
        <RBox p={[k*.12,0,.01]} s={[.13,.1,.08]} c={color} r={.035} rough={.3}/>
        <Box p={[k*.12,0,.052]} s={[.11,.08,.004]} c="#a9bfcc" metal={.9}/>
        <Box p={[k*.17,-.035,.0]} s={[.03,.01,.06]} c="#ffb347"/>
      </group>
      {/* ドアノブ */}
      <RBox p={[k*(s.hwAt(bz-.18)*.985+.012),belt-.07,bz-.18]} s={[.025,.025,.13]} c={d.id==='aria'||van?'#c8cdd2':color} r={.012} rough={.25} metal={.5}/>
      {rearDoor&&<RBox p={[k*(s.hwAt(rearDoor-.18)*.985+.012),belt-.07,rearDoor-.18]} s={[.025,.025,.13]} c={d.id==='aria'||van?'#c8cdd2':color} r={.012} rough={.25} metal={.5}/>}
      {/* サイドステップの黒い縁 */}
      <Box p={[k*(s.hwAt(0)*.96),b0+.035,(s.wheelZ[0]+s.wheelZ[1])/2]} s={[.04,.06,d.wheelbase-s.archR*2-.04]} c="#1a1e21"/>
    </group>)}
    <Livery d={d} s={s} mods={mods}/>
    <Interior d={d} s={s} pose={pose} color={color}/>
    {/* オープンカー：フロントガラスとロールバー */}
    {open&&<>{[-1,1].map(k=><group key={k} position={[k*w*.25,belt+.03,e.z+.5]}><mesh><torusGeometry args={[.19,.03,8,24,Math.PI]}/><meshStandardMaterial color="#a8afb5" metalness={.9} roughness={.2}/></mesh></group>)}
      <Beam a={[-s.hwBelt(s.cf)*.95,belt,s.cf+.02]} b={[-s.hwBelt(s.cf)*.85,belt+.32,s.cf+.2]} size={[.04,.04]} color="#1a1d20"/>
      <Beam a={[s.hwBelt(s.cf)*.95,belt,s.cf+.02]} b={[s.hwBelt(s.cf)*.85,belt+.32,s.cf+.2]} size={[.04,.04]} color="#1a1d20"/>
      <mesh position={[0,belt+.16,s.cf+.11]} rotation-x={-.6}><planeGeometry args={[s.hwBelt(s.cf)*1.8,.36]}/><meshPhysicalMaterial color="#7197a9" transparent opacity={.3} roughness={.05} side={THREE.DoubleSide} depthWrite={false}/></mesh></>}
    {/* ピックアップの荷台のあおり */}
    {truck&&<Box p={[0,(s.tubs[1][2]+belt+.04)/2,rearZ-.035]} s={[w*.86,belt+.04-s.tubs[1][2],.03]} c="#0e1012"/>}
    {(d.body==='wagon'||suv)&&[-1,1].map(k=><Beam key={k} a={[k*s.hwRoof(s.topFront+.1)*.8,s.roofAt(s.topFront+.1)+.035,s.topFront+.1]} b={[k*s.hwRoof(s.topRear-.05)*.8,s.roofAt(s.topRear-.05)+.035,s.topRear-.05]} size={[.035,.045]} color="#a9afb3" metal={.8}/>)}
    {mods.wing==='stock'?d.id==='raven'&&<><Box p={[0,s.topAt(rearZ-.2)+.2,rearZ-.2]} s={[w*.9,.04,.24]} c="#21272c"/>{[-1,1].map(k=><Box key={k} p={[k*w*.3,s.topAt(rearZ-.2)+.1,rearZ-.2]} s={[.04,.18,.06]} c="#20262c"/>)}</>
      :mods.wing!=='none'&&<Wing kind={mods.wing} w={w} base={wingBase} roof={roofWing&&!open}/>}
    {/* 大排気量エンジンはボンネットにエアスクープ */}
    {(mods.engine==='v8'||mods.engine==='v12'||mods.engine==='rotary')&&<RBox p={[0,s.topAt((frontZ+s.cf)/2)+.06,(frontZ+s.cf)/2+.05]} s={[w*.28,.09,Math.min(.6,(s.cf-frontZ)*.45)]} c={mods.engine==='v12'?'#1b1f22':color} r={.03} rough={.3}/>}
    {/* フロント：ヘッドライト・グリル・バンパー */}
    {[-1,1].map((k,i)=><group key={k}>
      <group position={[k*s.hwAt(frontZ+.08)*.55,ftop-.1,frontZ+.075]} rotation-y={-k*.3}>
        <RBox p={[0,0,0]} s={[w*.25,van?.17:.09,.1]} c="#1c2126" r={.03} rough={.2} metal={.6}/>
        <mesh position={[k*w*.03,0,-.048]}><boxGeometry args={[w*.12,van?.12:.055,.012]}/><meshStandardMaterial ref={m=>{if(m)head.current[i]=m;}} color="#e9f5ff" emissive="#e9f5ff" emissiveIntensity={.35}/></mesh>
        <mesh position={[-k*w*.065,0,-.047]} rotation-x={Math.PI/2}><cylinderGeometry args={[.028,.028,.012,16]}/><meshStandardMaterial color="#d6dde2" metalness={.9} roughness={.1}/></mesh>
        <Box p={[0,(van?-.07:-.036),-.048]} s={[w*.22,.01,.012]} c="#ffffff" glow={1.2}/>
      </group>
      <Box p={[k*w*.38,b0+.2,frontZ+.012]} s={[.07,.04,.02]} c="#f2f0e6" glow={.2}/>
      {/* テールランプ（角を回り込む） */}
      <group position={[k*s.hwAt(rearZ-.04)*.66,tailTop-.05,rearZ-.015]}>
        <mesh><boxGeometry args={[w*.26,.075,.04]}/><meshStandardMaterial ref={m=>{if(m)tail.current[i]=m;}} color="#9e0f1d" emissive="#ff1b22" emissiveIntensity={.15} roughness={.15}/></mesh>
        <Box p={[k*w*.12,0,-.07]} s={[.03,.07,.12]} c="#8a0e19" glow={.3}/>
        <Box p={[-k*w*.06,-.025,.012]} s={[w*.07,.02,.02]} c="#f4f4f4" glow={.2}/>
      </group>
      {!ev&&(quad?[-.06,.06]:[0]).map(dx=><mesh key={dx} position={[k*w*.3+dx,b0+.1,rearZ-.02]} rotation-x={Math.PI/2}><cylinderGeometry args={[quad?.04:.045,quad?.04:.045,.14,14]}/><meshStandardMaterial color="#b8bfc5" metalness={.95} roughness={.22}/></mesh>)}
    </group>)}
    {d.id==='volt'?<><Box p={[0,tailTop-.05,rearZ+.004]} s={[w*.5,.02,.02]} c="#ff2634" glow={.6}/><Box p={[0,ftop-.04,frontZ+.02]} s={[w*.5,.012,.02]} c="#ffffff" glow={1}/></>
      :<group position={[0,b0+.14+faceH*.62,frontZ-.004]}>
        <RBox p={[0,0,0]} s={[w*(suv||truck||van?.5:.38),Math.max(.08,faceH*(suv||truck||van?.6:.42)),.03]} c="#0d1013" r={.02} rough={.3} metal={.4}/>
        {Array.from({length:suv||truck||van?5:3},(_,i,)=>{const n=suv||truck||van?5:3;return <Box key={i} p={[0,(i-(n-1)/2)*Math.max(.08,faceH*.4)/n,-.017]} s={[w*(suv||truck||van?.48:.36),.012,.006]} c="#c3c9ce" metal={.9}/>;})}
      </group>}
    {/* バンパー下のエアインテークとナンバー */}
    <RBox p={[0,b0+.19,frontZ+.004]} s={[w*.6,.08,.03]} c="#0f1215" r={.02}/>
    <Box p={[0,b0+.04,frontZ+.1]} s={[w*.7,.03,.16]} c="#121518"/>
    <RBox p={[0,b0+.1,rearZ-.015]} s={[w*.62,.07,.04]} c="#121518" r={.02}/>
    {[frontZ-.004,rearZ+.004].map((z,i)=><group key={i} position={[0,i?b0+.14+(tailTop-.1-(b0+.14))*.45:b0+.2,z]}><Box p={[0,0,0]} s={[.34,.11,.012]} c="#f2f0dd"/><Box p={[0,0,i?.007:-.007]} s={[.22,.016,.004]} c="#334c39"/></group>)}
   </group>
    {[-1,1].flatMap((side,si)=>[-1,1].map((end,ei)=>{
      const n=si*2+ei,frontAxle=end===-1;
      return <group key={n} position={[side*(w/2-tireWidth(mods.wheel)/2-.02+mods.camber*.004),R,s.wheelZ[ei]]} ref={g=>{if(g&&frontAxle)front.current[si]=g;}}>
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
