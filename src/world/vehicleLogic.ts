import * as THREE from 'three';
import { avoidCameraWalls } from './cameraObstruction';
import { driverEye } from './CarModel';
import { getCar } from '../catalog/cars';
import { carSamples, integrateDrive } from '../building/driving';
import type { DrivePose } from '../building/driving';
import { useVenue, syncVenue, autoVenueDoors } from '../state/venue';
import { isBoutique } from '../building/boutiques';
import { venueAction } from '../building/venues';
import { atSaleSign } from '../building/landSale';
import { atDealerDoor } from '../building/dealer';
import { SHOP_BOXES } from '../building/tuner';
import { STOCK_MODS, tunedCar } from '../catalog/carMods';
import { engineHum } from './engineSound';
import { resolveLandmarks } from '../building/landmarks';
import { ceilingHeight, resolveCollisions, surfaceHeight } from '../building/walk';
import { isDoorOpen, useDoors } from '../state/doors';
import { currentPlotOf, civicOffset, lotHouse, useEconomy } from '../state/economy';
import { useGame } from '../state/store';
import { saveVehicles, useVehicles } from '../state/vehicles';
import { plotX, plotZ, TOWN_BOUNDS } from '../economy/town';
import { touchMove } from '../state/touch';

export const driveButtons = { left:false, right:false, accelerator:false, brake:false, handbrake:false };
export function resetDriveButtons() { driveButtons.left=false;driveButtons.right=false;driveButtons.accelerator=false;driveButtons.brake=false;driveButtons.handbrake=false; }
type Memory = {x:number;y:number;z:number;yaw:number;bodyYaw:number;pitch:number};
function origin() { const p=currentPlotOf(useEconomy.getState());return {x:plotX(p),z:plotZ(p)}; }
export function atTuner(p:Memory) { syncVenue(p);return useVenue.getState().inside==='tuner'; }
export function atCarDealer(p:Memory) { const o=civicOffset();return useVenue.getState().inside==='dealer' || atDealerDoor(p.x-o.x,p.z-o.z,p.y); }
function houses() {
  const s=useEconomy.getState(),current=currentPlotOf(s);
  return s.lots.flatMap(l=>{
    const h=l.id===s.currentLotId?useGame.getState().house:lotHouse(l);
    return h&&typeof l.plot==='number'?[{h,x:plotX(l.plot)-plotX(current),z:plotZ(l.plot)-plotZ(current)}]:[];
  });
}
export function blockedAt(x:number,z:number,radius:number,height:number,skip?:string) {
  const o=origin(),site=civicOffset();
  const globalX=x+o.x,globalZ=z+o.z;
  if(globalX<TOWN_BOUNDS.x0-20||globalX>TOWN_BOUNDS.x1+35||globalZ<TOWN_BOUNDS.z0-20||globalZ>TOWN_BOUNDS.z1+34)return true;
  const civic={x:x-site.x,z:z-site.z};
  const c=resolveLandmarks(civic,radius);
  if(Math.hypot(c.x-civic.x,c.z-civic.z)>.001)return true;
  if(SHOP_BOXES.some(b=>civic.x>b.x0-radius&&civic.x<b.x1+radius&&civic.z>b.z0-radius&&civic.z<b.z1+radius))return true;
  for(const {h,x:ox,z:oz} of houses()){
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
  autoVenueDoors(p,!state.driving);
  let target:string|null=null;
  if(!state.driving){
    syncVenue(p);
    const o=civicOffset(),venue=useVenue.getState().inside;
    if(venue){const action=venueAction(venue,p.x-o.x,p.z-o.z);target=action?'venue:'+action.id:null;if(state.target!==target)useVehicles.setState({target});return;}
  }
  if(state.driving)target=state.driving;
  else if(Math.abs(p.y)<.5){
    const o=origin();
    let nearest=2.6;
    for(const c of state.cars){
      const d=getCar(c.model)!;
      const door={x:c.x-Math.cos(c.yaw)*(d.width/2+.4),z:c.z+Math.sin(c.yaw)*(d.width/2+.4)};
      const distance=Math.hypot(p.x+o.x-door.x,p.z+o.z-door.z);
      if(distance<nearest){nearest=distance;target=c.id;}
    }
    for(const f of useGame.getState().house.furniture){
      if(f.type==='garage-shutter'&&Math.hypot(f.x-p.x,f.z-p.z)<2.5)target='shutter:'+f.id;
    }
  }
  if (!state.driving && !target) { const o=origin(); const offer=useEconomy.getState().offers.find(offer=>typeof offer.plot==='number'&&atSaleSign(offer.plot,p.x+o.x,p.z+o.z,p.y));if(offer)target='land:'+offer.id; }
  if(state.target!==target)useVehicles.setState({target});
}
export function parkVehicle(){engineHum(null,0,0);const s=useVehicles.getState();const c=s.cars.find(c=>c.id===s.driving);if(c){c.speed=0;c.slipAngle=0;c.reverseHold=0;c.drifting=false;c.handbraking=false;}resetDriveButtons();useVehicles.setState({driving:null,target:null});saveVehicles();}
export function vehicleInteract(p:Memory) {
  refreshVehicleTarget(p);
  const venue=useVenue.getState().inside;
  if(venue){ const o=civicOffset(),action=venueAction(venue,p.x-o.x,p.z-o.z);if(!action)return false;useVenue.setState({game:action.game??null,model:action.model??null,dealerIntent:action.model?'buy':'catalog',tab:action.tab??null});if(isBoutique(venue)){useVenue.setState({shopTab:action.id==='fitting'?'closet':'shop'});useGame.getState().setOverlay('boutique');return true;}useGame.getState().setOverlay(venue);return true; }
  const s=useVehicles.getState();
  if(s.driving){
    const car=s.cars.find(c=>c.id===s.driving)!;
    if(Math.abs(car.speed)>.5){useGame.getState().notify('停車してから降りてください');return true;}
    const d=getCar(car.model)!,o=origin();
    for(const side of [-1,1])for(const along of [0,-1,1]){
      const x=car.x-o.x+Math.cos(car.yaw)*side*(d.width/2+.65)-Math.sin(car.yaw)*along;
      const z=car.z-o.z-Math.sin(car.yaw)*side*(d.width/2+.65)-Math.cos(car.yaw)*along;
      if(!blockedAt(x,z,.26,1.7,car.id)){
        Object.assign(p,{x,z,y:0,yaw:car.yaw,bodyYaw:car.yaw});parkVehicle();return true;
      }
    }
    useGame.getState().notify('降りる場所がありません。広い場所へ移動してください');return true;
  }
  if(s.target?.startsWith('land:')){useGame.getState().setOverlay('land');return true;}
  if(s.target?.startsWith('shutter:')){useDoors.getState().toggle(s.target.slice(8),1);return true;}
  const c=s.cars.find(c=>c.id===s.target);
  if(!c)return false;
  useVehicles.setState({driving:c.id});
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
  if(!car){engineHum(null,0,0);return false;}
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
  integrateDrive(car,{throttle,steering,buttonSteering,reverseOnBrake:!paused&&driveButtons.brake,handbrake:!paused&&(driveButtons.handbrake||key('ShiftLeft','ShiftRight')),brake:paused||driveButtons.brake||key('Space')},dt,d,(pose:DrivePose)=>
    carSamples(pose,d).some(s=>blockedAt(s.x-o.x,s.z-o.z,d.width/2+.04,d.height,car.id)));
  engineHum(mods.engine==='stock'&&car.model==='volt'?'electric':mods.engine,Math.abs(car.speed)/d.maxSpeed,throttle);
  p.yaw+=car.yaw-previousYaw;
  Object.assign(p,{x:car.x-o.x,y:0,z:car.z-o.z,bodyYaw:car.yaw});
  const first=useGame.getState().view==='first';
  if(first){
    // 運転席（ハンドルの後ろ）に座った目の高さ。車の座標を向きに合わせて回す。
    const eye=driverEye(d),c=Math.cos(car.yaw),s=Math.sin(car.yaw);
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
  saveClock+=dt;if(saveClock>5){saveClock=0;saveVehicles();}
  return true;
}

/** 駐車中の車にも歩行者の体が埋まらないようにする。 */
export function resolveParkedCars(p:{x:number;z:number},feetY:number){
  const o=origin();let x=p.x+o.x,z=p.z+o.z;
  for(const car of useVehicles.getState().cars){
    const d=getCar(car.model)!;if(feetY>d.height)continue;
    for(const c of carSamples(car,d)){
      const dx=x-c.x,dz=z-c.z,dist=Math.hypot(dx,dz),min=d.width/2+.25;
      if(dist<min){x=c.x+(dist>.0001?dx/dist:1)*min;z=c.z+(dist>.0001?dz/dist:0)*min;}
    }
  }
  return {x:x-o.x,z:z-o.z};
}
