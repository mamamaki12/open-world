import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGame } from '../state/store';
import { useInteraction } from '../state/interaction';
import { useVehicles } from '../state/vehicles';
import { buildMenuOpen } from '../state/controls';
import { snapFurniturePlacement } from '../building/furnitureSnap';
import { nameplateMount, mountedTransform } from '../building/mounts';
import { aimFurnitureTarget } from './aimFurnitureTarget';

/** 青い家具をつかんだ指だけを予約し、背景のスワイプは見回しへ渡す。 */
export function TouchFurnitureEdit(){
  const {gl,camera,scene}=useThree();
  useEffect(()=>{
    const el=gl.domElement,ray=new THREE.Raycaster();
    let drag:{pointer:number;id:string;x:number;y:number;dx:number;dz:number;plane:THREE.Plane;moved:boolean;mountCenter?:THREE.Vector3;hit:THREE.Vector3}|null=null;
    const cast=(e:PointerEvent)=>{
      const r=el.getBoundingClientRect();
      ray.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);
    };
    const finish=(cancel=false)=>{
      const d=drag;if(!d)return;drag=null;
      const g=useGame.getState();
      if(cancel&&g.dragBase)g.dragTo(g.dragBase);
      g.endDrag();useInteraction.setState({furnitureDrag:null,ignorePartClickUntil:Date.now()+200});
      if(!cancel&&!d.moved){
        const s=useGame.getState(),item=s.house.furniture.find(f=>f.id===d.id);
        if(item)s.commit({...s.house,furniture:s.house.furniture.map(f=>f.id===d.id?{...f,rotation:(f.rotation+45)%360}:f)});
      }
      if(el.hasPointerCapture(d.pointer))el.releasePointerCapture(d.pointer);
    };
    const down=(e:PointerEvent)=>{
      if(e.pointerType!=='touch')return;
      if(drag){finish(true);return;}
      const g=useGame.getState();
      if(g.tool!=='select'||g.overlay||buildMenuOpen.current||useVehicles.getState().driving||g.selection?.kind!=='furniture')return;
      const item=g.house.furniture.find(f=>f.id===g.selection!.id);
      if(!item)return;
      cast(e);
      const objects=['house','neighbors','casino','estate','dealer','tuner','exchange','boutiques','vehicles'].map(n=>scene.getObjectByName(n)).filter((o):o is THREE.Object3D=>!!o);
      const hit=ray.intersectObjects(objects,true).find(h=>{
        let o:THREE.Object3D|null=h.object;while(o){if(!o.visible)return false;o=o.parent;}
        const m=(h.object as THREE.Mesh).material,mat=Array.isArray(m)?m[h.face?.materialIndex??0]:m;
        return mat?.visible&&(!mat.transparent||mat.opacity>=.99);
      });
      const target=aimFurnitureTarget(scene.getObjectByName('house'),ray.ray,Math.min(g.mode==='walk'?7:Infinity,(hit?.distance??Infinity)+.01));
      if(target?.object.userData.partRef?.id!==item.id)return;
      e.preventDefault();e.stopImmediatePropagation();
      el.setPointerCapture(e.pointerId);g.beginDrag();
      const mounted=item.wallMount?mountedTransform(g.house,item.wallMount):null;
      const normal=mounted?new THREE.Vector3(Math.sin(mounted.rotation*Math.PI/180),0,Math.cos(mounted.rotation*Math.PI/180)):new THREE.Vector3(0,1,0);
      drag={pointer:e.pointerId,id:item.id,x:e.clientX,y:e.clientY,dx:target.point.x-item.x,dz:target.point.z-item.z,plane:new THREE.Plane().setFromNormalAndCoplanarPoint(normal,target.point),moved:false,hit:target.point.clone(),mountCenter:mounted?new THREE.Vector3(mounted.x,mounted.y+1.6,mounted.z):undefined};
      useInteraction.getState().setFurnitureDrag({id:item.id,dx:drag.dx,dz:drag.dz,startX:e.clientX,startY:e.clientY});
    };
    const move=(e:PointerEvent)=>{
      if(!drag||e.pointerId!==drag.pointer)return;
      e.preventDefault();e.stopImmediatePropagation();
      if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>6)drag.moved=true;
      if(!drag.moved)return;
      cast(e);const p=ray.ray.intersectPlane(drag.plane,new THREE.Vector3());if(!p)return;
      const g=useGame.getState(),item=g.house.furniture.find(f=>f.id===drag!.id);if(!item)return;
      if(item.wallMount&&drag.mountCenter){
        const wall=g.house.walls.find(w=>w.id===item.wallMount!.wallId);if(!wall)return;
        const center=drag.mountCenter.clone().add(p).sub(drag.hit);
        const mount=nameplateMount(g.house,wall,center,camera.position);if(!mount)return;
        mount.side=item.wallMount.side;
        const transform=mountedTransform(g.house,mount)!;
        g.dragTo({...g.house,furniture:g.house.furniture.map(f=>f.id===item.id?{...f,x:transform.x,z:transform.z,wallMount:mount}:f)});return;
      }
      const pos=snapFurniturePlacement(g.house,item,p.x-drag.dx,p.z-drag.dz);
      if(pos.x!==item.x||pos.z!==item.z)g.dragTo({...g.house,furniture:g.house.furniture.map(f=>f.id===item.id?{...f,...pos}:f)});
    };
    const up=(e:PointerEvent)=>{if(!drag||e.pointerId!==drag.pointer)return;e.preventDefault();e.stopImmediatePropagation();finish(e.type!=='pointerup');};
    const cancel=()=>finish(true);
    const hidden=()=>{if(document.hidden)cancel();};
    const unsub=useGame.subscribe((s,p)=>{if(s.tool!==p.tool||s.mode!==p.mode||s.overlay!==p.overlay||s.selection?.id!==p.selection?.id)cancel();});
    el.addEventListener('pointerdown',down,true);window.addEventListener('pointermove',move,true);window.addEventListener('pointerup',up,true);window.addEventListener('pointercancel',up,true);el.addEventListener('lostpointercapture',up,true);window.addEventListener('blur',cancel);document.addEventListener('visibilitychange',hidden);
    return()=>{cancel();unsub();el.removeEventListener('pointerdown',down,true);window.removeEventListener('pointermove',move,true);window.removeEventListener('pointerup',up,true);window.removeEventListener('pointercancel',up,true);el.removeEventListener('lostpointercapture',up,true);window.removeEventListener('blur',cancel);document.removeEventListener('visibilitychange',hidden);};
  },[gl,camera,scene]);
  return null;
}
