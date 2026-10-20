import * as THREE from 'three';
import { avoidCameraWalls } from './cameraObstruction';
import { driverEye } from './CarModel';
import { getCar } from '../catalog/cars';
import type { CarDef } from '../catalog/cars';
import { carHitsBox, carHitsWalls } from '../building/vehicleWalls';
import { GRID, LOT_W, LOT_D } from '../building/dimensions';
import { TOWN_HOUSE_PLOTS, townHouseAt } from '../building/townHouses';
import { takenPlots, visitAt } from './visit';
import { furnitureDef, hasMovingParts } from '../catalog';
import { furnitureBaseY } from '../building/rules';
import { playDoorSound } from './sound';
import type { House } from '../building/types';
import { carSamples, integrateDrive } from '../building/driving';
import type { DrivePose } from '../building/driving';
import { useVenue, syncVenue, autoVenueDoors } from '../state/venue';
import { isBoutique } from '../building/boutiques';
import { venueAction } from '../building/venues';
import { atSaleSign } from '../building/landSale';
import { atDealerDoor } from '../building/dealer';
import { SHOP_BOXES as TUNER_SHOPS } from '../building/tuner';
import { EXCHANGE } from '../building/exchange';
const SHOP_BOXES=[...TUNER_SHOPS,EXCHANGE];
import { STOCK_MODS, tunedCar } from '../catalog/carMods';
import { engineHum } from './engineSound';
import { LANDMARK_COLLIDERS, resolveLandmarks } from '../building/landmarks';
import { ceilingHeight, resolveCollisions, surfaceHeight } from '../building/walk';
import { isDoorOpen, useDoors } from '../state/doors';
import { currentPlotOf, civicOffset, lotHouse, plotOffset, plotOffsetZ, useEconomy } from '../state/economy';
import { useGame } from '../state/store';
import { saveVehicles, useVehicles } from '../state/vehicles';
import { plotX, plotZ, TOWN_BOUNDS } from '../economy/town';
import { touchMove } from '../state/touch';
import { sessionGate } from '../session/gate';
import type { OwnedCar } from '../state/vehicles';
import { sampleCar } from '../session/poseBuffer';

const FACILITY_BOXES = [...LANDMARK_COLLIDERS, ...SHOP_BOXES];
export const driveButtons = { left:false, right:false, accelerator:false, brake:false, handbrake:false };
export function resetDriveButtons() { driveButtons.left=false;driveButtons.right=false;driveButtons.accelerator=false;driveButtons.brake=false;driveButtons.handbrake=false; }
type Memory = {x:number;y:number;z:number;yaw:number;bodyYaw:number;pitch:number};
function origin() { const p=currentPlotOf(useEconomy.getState());return {x:plotX(p),z:plotZ(p)}; }
export function atTuner(p:Memory) { syncVenue(p);return useVenue.getState().inside==='tuner'; }
export function atCarDealer(p:Memory) { const o=civicOffset();return useVenue.getState().inside==='dealer' || atDealerDoor(p.x-o.x,p.z-o.z,p.y); }
interface VehicleHouse { h: House; x: number; z: number }
function houses(x: number, z: number, reach: number): VehicleHouse[] {
  const s=useEconomy.getState(),current=currentPlotOf(s);
  const result = s.lots.flatMap(l=>{
    const h=l.id===s.currentLotId?useGame.getState().house:lotHouse(l);
    return h&&typeof l.plot==='number'?[{h,x:plotX(l.plot)-plotX(current),z:plotZ(l.plot)-plotZ(current)}]:[];
  });
  const taken = takenPlots(s);
  for (const key of Object.keys(TOWN_HOUSE_PLOTS)) {
    const plot = Number(key);
    if (taken.has(plot)) continue;
    const ox = plotX(plot) - plotX(current), oz = plotZ(plot) - plotZ(current);
    if (x < ox - reach || x > ox + LOT_W * GRID + reach || z < oz - reach || z > oz + LOT_D * GRID + reach) continue;
    const h = townHouseAt(plot);
    if (h) result.push({ h, x: ox, z: oz });
  }
  return result;
}
export function blockedAt(x:number,z:number,radius:number,height:number,skip?:string,obstacles=houses(x,z,radius)) {
  const o=origin(),site=civicOffset();
  const globalX=x+o.x,globalZ=z+o.z;
  if(globalX<TOWN_BOUNDS.x0-20||globalX>TOWN_BOUNDS.x1+35||globalZ<TOWN_BOUNDS.z0-20||globalZ>TOWN_BOUNDS.z1+34)return true;
  const civic={x:x-site.x,z:z-site.z};
  const c=resolveLandmarks(civic,radius);
  if(Math.hypot(c.x-civic.x,c.z-civic.z)>.001)return true;
  if(SHOP_BOXES.some(b=>civic.x>b.x0-radius&&civic.x<b.x1+radius&&civic.z>b.z0-radius&&civic.z<b.z1+radius))return true;
  for(const {h,x:ox,z:oz} of obstacles){
    const p={x:x-ox,z:z-oz};
    if(surfaceHeight(h,p.x,p.z,0)>.15||ceilingHeight(h,p.x,p.z,0)<height)return true;
    const q=resolveCollisions(h,p,0,height,isDoorOpen,radius);
    if(Math.hypot(q.x-p.x,q.z-p.z)>.001)return true;
  }
  for(const car of useVehicles.getState().cars){
    if(car.id===skip)continue;
    const def=getCar(car.model)!;
    if(carSamples(car,def).some(p=>Math.hypot(globalX-p.x,globalZ-p.z)<radius+def.width/2))return true;
  }
  return false;
}
export function refreshVehicleTarget(p:Memory) {
  const state=useVehicles.getState();
  autoVenueDoors(p,!state.driving&&!state.riding);
  if(state.riding){if(state.target)useVehicles.setState({target:null});return;}
  let target:string|null=null;
  if(!state.driving){
    syncVenue(p);
    const o=civicOffset(),venue=useVenue.getState().inside;
    if(venue){const action=venueAction(venue,p.x-o.x,p.z-o.z);target=action?'venue:'+action.id:null;if(state.target!==target)useVehicles.setState({target});return;}
  }
  if(state.driving)target=state.driving;
  else if(Math.abs(p.y)<.5){
    const o=origin();
    // いちばん近い車を選び、運転席側の横（座席の前後1.3m）なら運転席、それ以外は助手席（ほかのプレイヤーの車は助手席だけ）
    let nearest=1.1;
    const gx=p.x+o.x,gz=p.z+o.z;
    for(const {owner,car:c} of [...state.cars.map(car=>({owner:'',car})),...sessionGate.remoteCars()]){
      const d=getCar(c.model);if(!d)continue;
      const body=Math.min(...carSamples(c,d).map(s=>Math.hypot(gx-s.x,gz-s.z)))-d.width/2;
      if(body>=nearest)continue;
      nearest=body;
      target='ride:'+owner+'|'+c.id;
      if(owner)continue;
      const dx=gx-c.x,dz=gz-c.z,side=-dx*Math.cos(c.yaw)+dz*Math.sin(c.yaw),along=dx*Math.sin(c.yaw)+dz*Math.cos(c.yaw);
      if(side>d.width/2-.2&&Math.abs(along-driverEye(d).z)<1.3)target=c.id;
    }
    for(const f of useGame.getState().house.furniture){
      if(f.type==='garage-shutter'&&Math.hypot(f.x-p.x,f.z-p.z)<2.5)target='shutter:'+f.id;
    }
    if(!target)target=registerTarget(p);
  }
  if (!state.driving && !target) {
    // 引き出し・扉のあるデザイン家具：同じ階で手が届く距離なら開け閉めできる（訪ねた家でも）
    const h=visitAt(p.x,p.z)?.world??useGame.getState().house;
    let reach=1.3;
    for(const f of h.furniture){
      if(!hasMovingParts(furnitureDef(f))||Math.abs(furnitureBaseY(h,f)-p.y)>.6)continue;
      const d=Math.hypot(f.x-p.x,f.z-p.z);
      if(d<reach){reach=d;target='furn:'+f.id;}
    }
  }
  if (!state.driving && !target) { const o=origin(); const offer=useEconomy.getState().offers.find(offer=>typeof offer.plot==='number'&&atSaleSign(offer.plot,p.x+o.x,p.z+o.z,p.y));if(offer)target='land:'+offer.id; }
  if(state.target!==target)useVehicles.setState({target});
}
/** 近くにあるお店のレジかゲーム機（1階）。いま開いている土地と、ほかのお店の土地を見る */
function registerTarget(p:Memory):string|null{
  const e=useEconomy.getState();
  for(const l of e.lots){
    const current=l.id===e.currentLotId;
    if(!current&&(!l.shop||typeof l.plot!=='number'))continue;
    const house=current?useGame.getState().house:lotHouse(l);
    const ox=current?0:plotOffset(l.plot!,e),oz=current?0:plotOffsetZ(l.plot!,e);
    const near=house?.furniture.find(f=>(f.type==='register'||f.type==='arcade'||f.type==='ride')&&f.level===0&&Math.hypot(f.x+ox-p.x,f.z+oz-p.z)<1.8);
    if(near)return near.type+':'+l.id;
  }
  return null;
}
export function parkVehicle(){engineHum(null,0,0);const s=useVehicles.getState();const c=s.cars.find(c=>c.id===s.driving);if(c){c.speed=0;c.slipAngle=0;c.reverseHold=0;c.drifting=false;c.handbraking=false;}resetDriveButtons();useVehicles.setState({cars:[...s.cars],driving:null,target:null});saveVehicles();}
/** 車の横の空いている場所に降りる。side=-1 は運転席側から探す。 */
function getOut(p:Memory,car:Pick<OwnedCar,'x'|'z'|'yaw'|'model'|'id'>,side:number){
  const d=getCar(car.model)!,o=origin();
  for(const s of [side,-side])for(const along of [0,-1,1]){
    const x=car.x-o.x+Math.cos(car.yaw)*s*(d.width/2+.65)-Math.sin(car.yaw)*along;
    const z=car.z-o.z-Math.sin(car.yaw)*s*(d.width/2+.65)-Math.cos(car.yaw)*along;
    if(!blockedAt(x,z,.26,1.7,car.id)){Object.assign(p,{x,z,y:0,yaw:car.yaw,bodyYaw:car.yaw});return true;}
  }
  useGame.getState().notify('降りる場所がありません。広い場所へ移動してください');return false;
}
/** 助手席に乗っている車（自分の車か、ほかのプレイヤーの車）。 */
export function ridingCar():OwnedCar|null{
  const r=useVehicles.getState().riding;if(!r)return null;
  if(!r.owner)return useVehicles.getState().cars.find(c=>c.id===r.car)??null;
  const car=sessionGate.remoteCars().find(c=>c.owner===r.owner&&c.car.id===r.car)?.car;if(!car)return null;
  // 受信した座標の間を補間した位置を使う（poseBuffer）。
  const at=sampleCar(r.owner,r.car);return at?{...car,x:at.x,z:at.z,yaw:at.yaw}:car;
}
/** 助手席の車の位置。ほかのプレイヤーの車は ridingCar がすでに補間しているので、そのまま使う。 */
const smoothRide={x:0,z:0,yaw:0};
export function vehicleInteract(p:Memory) {
  refreshVehicleTarget(p);
  const venue=useVenue.getState().inside;
  if(venue){ const o=civicOffset(),action=venueAction(venue,p.x-o.x,p.z-o.z);if(!action)return false;useVenue.setState({game:action.game??null,model:action.model??null,dealerIntent:action.model?'buy':'catalog',tab:action.tab??null});if(isBoutique(venue)){useVenue.setState({shopTab:action.id==='fitting'?'closet':'shop'});useGame.getState().setOverlay('boutique');return true;}useGame.getState().setOverlay(venue);return true; }
  const s=useVehicles.getState();
  if(s.riding){
    const car=ridingCar();
    if(!car){useVehicles.setState({riding:null});return true;}
    if(Math.abs(car.speed)>.5){useGame.getState().notify('車が止まってから降りてください');return true;}
    if(getOut(p,car,1))useVehicles.setState({riding:null,target:null});
    return true;
  }
  if(s.driving){
    const car=s.cars.find(c=>c.id===s.driving)!;
    if(Math.abs(car.speed)>.5){useGame.getState().notify('停車してから降りてください');return true;}
    if(getOut(p,car,-1))parkVehicle();
    return true;
  }
  if(s.target?.startsWith('ride:')){
    const [owner,car]=s.target.slice(5).split('|');
    useVehicles.setState({riding:{owner,car},target:null});
    useGame.setState({view:'third'});
    useGame.getState().setTool('select');
    useDoors.getState().setTarget(null);
    const c=ridingCar();if(c){Object.assign(p,{yaw:c.yaw,bodyYaw:c.yaw,pitch:DRIVE_PITCH});smoothRide.x=c.x;smoothRide.z=c.z;smoothRide.yaw=c.yaw;}
    return true;
  }
  if(s.target?.startsWith('land:')){useGame.getState().setOverlay('land');return true;}
  if(s.target?.startsWith('register:')){useGame.getState().setOverlay('shop');return true;}
  if(s.target?.startsWith('arcade:')){useGame.getState().setOverlay('arcade');return true;}
  if(s.target?.startsWith('ride:')){useGame.getState().setOverlay('ride');return true;}
  if(s.target?.startsWith('shutter:')){useDoors.getState().toggle(s.target.slice(8),1);return true;}
  if(s.target?.startsWith('furn:')){const opened=useDoors.getState().toggle(s.target.slice(5),1);playDoorSound(opened,true);return true;}
  const c=s.cars.find(c=>c.id===s.target);
  if(!c)return false;
  useVehicles.setState({driving:c.id,riding:null});
  useGame.setState({view:'third'});
  useGame.getState().setTool('select');
  useDoors.getState().setTarget(null);
  Object.assign(p,{yaw:c.yaw,bodyYaw:c.yaw,pitch:DRIVE_PITCH});
  return true;
}
let saveClock=0;
/** 乗ったときの見下ろし具合（pitch）。カメラの高さ角は driveElevation で決まる。 */
export const DRIVE_PITCH=-.2;
/** pitch（下を見るほど負）から、車を見るカメラの高さ角(rad)へ。乗った直後は約0.38。 */
export function driveElevation(pitch:number){return Math.min(1.2,Math.max(.06,.38-(pitch-DRIVE_PITCH)));}
const lookMemory={yaw:0,pitch:0,idle:9};
export function driveFrame(camera:THREE.Camera,keys:Set<string>,dt:number,p:Memory,scene?:THREE.Scene) {
  const state=useVehicles.getState(),car=state.cars.find(c=>c.id===state.driving);
  if(!car){engineHum(null,0,0);return state.riding?rideFrame(camera,dt,p,scene):false;}
  const mods=car.mods??STOCK_MODS,d=tunedCar(getCar(car.model)!,mods);
  if(useGame.getState().tool!=='select')useGame.getState().setTool('select');
  const key=(...codes:string[])=>codes.some(c=>keys.has(c));
  const paused=!!useGame.getState().overlay;
  if(paused){car.speed=0;car.slipAngle=0;car.drifting=false;car.reverseHold=0;}
  const throttle=paused?0:(key('KeyW','ArrowUp')?1:0)-(key('KeyS','ArrowDown')?1:0)||(!paused?(driveButtons.accelerator?1:touchMove.y):0);
  const keyboardSteering=(key('KeyD','ArrowRight')?1:0)-(key('KeyA','ArrowLeft')?1:0);
  const buttonDirection=Number(driveButtons.right)-Number(driveButtons.left);
  const steering=paused?0:keyboardSteering||buttonDirection||touchMove.x;
  const buttonSteering=!paused&&!keyboardSteering&&buttonDirection!==0;
  const o=origin();
  const previousYaw=car.yaw;
  const site=civicOffset(),facilityOffset={x:o.x+site.x,z:o.z+site.z};
  const obstacles=houses(car.x-o.x,car.z-o.z,Math.hypot(d.length,d.width)/2+d.maxSpeed*Math.min(dt,.25)+.2);
  // 歩いているほかのプレイヤーは通り抜けられない（すでに重なっている人は、離れるまで動けなくならないよう除く）
  const people=sessionGate.visitors().filter(q=>q.walking!==false&&!q.driving&&q.y<d.height&&!carSamples(car,d).some(s=>Math.hypot(q.x+o.x-s.x,q.z+o.z-s.z)<d.width/2+.3));
  integrateDrive(car,{throttle,steering,buttonSteering,reverseOnBrake:!paused&&driveButtons.brake,handbrake:!paused&&(driveButtons.handbrake||key('ShiftLeft','ShiftRight')),brake:paused||driveButtons.brake||key('Space')},dt,d,(pose:DrivePose)=>
    FACILITY_BOXES.some(box=>carHitsBox(pose,d,box,facilityOffset)) ||
    obstacles.some(({h,x,z})=>carHitsWalls(pose,d,h,isDoorOpen,{x:o.x+x,z:o.z+z})) ||
    carSamples(pose,d).some(s=>blockedAt(s.x-o.x,s.z-o.z,d.width/2+.04,d.height,car.id,obstacles)) ||
    people.some(q=>carSamples(pose,d).some(s=>Math.hypot(q.x+o.x-s.x,q.z+o.z-s.z)<d.width/2+.3)));
  engineHum(mods.engine==='stock'&&car.model==='volt'?'electric':mods.engine,Math.abs(car.speed)/d.maxSpeed,throttle);
  p.yaw+=car.yaw-previousYaw;
  Object.assign(p,{x:car.x-o.x,y:0,z:car.z-o.z,bodyYaw:car.yaw});
  carCamera(camera,car,d,dt,p,-1,scene);
  saveClock+=dt;if(saveClock>5){saveClock=0;saveVehicles();}
  return true;
}
let rideClock=-1;
/** 助手席に乗っている車の、なめらかにした位置。描画（RemotePlayers）とカメラで同じ値を使うため、1フレームに1回だけ進める。 */
export function rideSmoothPose(time:number){
  const r=useVehicles.getState().riding,car=ridingCar();
  if(!r||!car)return null;
  if(time!==rideClock){
    rideClock=time;
    smoothRide.x=car.x;smoothRide.z=car.z;smoothRide.yaw=car.yaw;
  }
  return {key:r.owner+'|'+r.car,...smoothRide,speed:car.speed,model:car.model};
}
let rideTime=0;
function rideFrame(camera:THREE.Camera,dt:number,p:Memory,scene?:THREE.Scene){
  rideTime+=dt;
  const ride=rideSmoothPose(rideTime);
  if(!ride){useVehicles.setState({riding:null});return false;}
  const d=getCar(ride.model)!,o=origin();
  if(useGame.getState().tool!=='select')useGame.getState().setTool('select');
  p.yaw+=ride.yaw-p.bodyYaw;
  Object.assign(p,{x:ride.x-o.x,y:0,z:ride.z-o.z,bodyYaw:ride.yaw});
  carCamera(camera,ride,d,dt,p,1,scene);
  return true;
}
/** 車に乗っているときのカメラ。seat=-1 は運転席、1 は助手席。 */
function carCamera(camera:THREE.Camera,car:{yaw:number;speed:number},d:CarDef,dt:number,p:Memory,seat:number,scene?:THREE.Scene){
  const first=useGame.getState().view==='first';
  if(first){
    // 座席に座った目の高さ。車の座標を向きに合わせて回す。
    const e=driverEye(d),eye={...e,x:-seat*e.x},c=Math.cos(car.yaw),s=Math.sin(car.yaw);
    camera.position.set(p.x+eye.x*c+eye.z*s,eye.y,p.z-eye.x*s+eye.z*c);
    camera.lookAt(p.x-Math.sin(p.yaw)*10,camera.position.y+Math.sin(p.pitch)*4,p.z-Math.cos(p.yaw)*10);
  }else{
    // 見回した分（マウス・指で動かした yaw/pitch）だけ、車のまわりをカメラが回る。
    // 手を離して走っていると、少しして車の後ろへゆっくり戻る。
    let offset=Math.atan2(Math.sin(p.yaw-car.yaw),Math.cos(p.yaw-car.yaw));
    const looked=Math.abs(p.yaw-lookMemory.yaw)>1e-4||Math.abs(p.pitch-lookMemory.pitch)>1e-4;
    lookMemory.idle=looked?0:lookMemory.idle+dt;
    if(lookMemory.idle>1.5&&Math.abs(car.speed)>1){
      const k=Math.min(1,dt*1.5);offset-=offset*k;p.pitch+=(DRIVE_PITCH-p.pitch)*k;
    }
    p.yaw=car.yaw+offset;lookMemory.yaw=p.yaw;lookMemory.pitch=p.pitch;
    const follow=p.yaw,elev=driveElevation(p.pitch),reach=Math.hypot(d.length+3,2.8+d.height*.4);
    const focus=new THREE.Vector3(p.x,d.height*.6,p.z);
    const back=(yaw:number)=>new THREE.Vector3(p.x+Math.sin(yaw)*Math.cos(elev)*reach,focus.y+Math.sin(elev)*reach,p.z+Math.cos(yaw)*Math.cos(elev)*reach);
    const desired=back(follow);
    // 納車スペースなど真後ろが建物なら、空いている横側から車を見る（見回していないときだけ）。
    if(scene && Math.abs(offset)<.05 && avoidCameraWalls(scene,focus,desired).distanceToSquared(focus)<desired.distanceToSquared(focus)*.36){
      const side=back(follow+Math.PI/2);
      if(avoidCameraWalls(scene,focus,side).distanceToSquared(focus)>side.distanceToSquared(focus)*.64)desired.copy(side);
    }
    const next=camera.position.clone().lerp(desired,Math.min(1,dt*(lookMemory.idle<.3?14:7)));
    camera.position.copy(scene ? avoidCameraWalls(scene,focus,next) : next);camera.lookAt(focus);
  }
}

/** 駐車中の車にも歩行者の体が埋まらないようにする。 */
export function resolveParkedCars(p:{x:number;z:number},feetY:number){
  const o=origin();let x=p.x+o.x,z=p.z+o.z;
  for(const car of [...useVehicles.getState().cars,...sessionGate.remoteCars().map(r=>r.car)]){
    const d=getCar(car.model);if(!d||feetY>d.height)continue;
    for(const c of carSamples(car,d)){
      const dx=x-c.x,dz=z-c.z,dist=Math.hypot(dx,dz),min=d.width/2+.25;
      if(dist<min){x=c.x+(dist>.0001?dx/dist:1)*min;z=c.z+(dist>.0001?dz/dist:0)*min;}
    }
  }
  return {x:x-o.x,z:z-o.z};
}
