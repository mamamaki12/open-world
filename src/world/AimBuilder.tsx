import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { aimPlan } from '../building/aimBuild';
import type { AimPoint } from '../building/aimBuild';
import type { PartRef } from '../building/types';
import { aimActions, AIM_REACH, useAim } from '../state/controls';
import { useGame } from '../state/store';
import { useInteraction } from '../state/interaction';
import { useVenue } from '../state/venue';
import { aimBuilding } from './aimMode';
import { aimFurnitureTarget } from './aimFurnitureTarget';
import { centerIntersections } from './placementRay';

/** スマホで照準をタップしたとみなす、画面中央からの距離(px) */
const AIM_TAP_RADIUS=50;

export function AimBuilder() {
  const { camera, gl, scene } = useThree();
  const point=useRef<AimPoint|null>(null),clock=useRef(0);
  const ray=useRef(new THREE.Raycaster());
  const pick=()=>{
    const objects=['house','ground','casino','estate','dealer','tuner','exchange','salon','boutiques','venue-interior','neighbors','vehicles'].map(n=>scene.getObjectByName(n)).filter((o):o is THREE.Object3D=>!!o);
    let hit:THREE.Intersection|undefined=centerIntersections(ray.current,camera,objects,AIM_REACH).find(h=>{
      const mat=(h.object as THREE.Mesh).material,m=Array.isArray(mat)?mat[h.face?.materialIndex??0]:mat;
      let o:THREE.Object3D|null=h.object;while(o){if(!o.visible)return false;o=o.parent;}
      return m&&m.visible&&(!m.transparent||m.opacity>=.99);
    });
    if(useGame.getState().tool==='erase'){
      const furniture=aimFurnitureTarget(scene.getObjectByName('house'),ray.current.ray,Math.min(AIM_REACH,hit?.distance??AIM_REACH));
      if(furniture)hit=furniture;
    }
    if(!hit)return null;
    let o:THREE.Object3D|null=hit.object,ref:PartRef|undefined,editable=false;
    while(o){ref??=o.userData.partRef;if(o.name==='house'||o.name==='ground')editable=true;o=o.parent;}
    return editable?{...hit.point,ref}:null;
  };
  const clear=()=>{point.current=null;useInteraction.getState().setPreview(null);useAim.setState({label:'',range:false,target:null,valid:false});};
  useEffect(()=>{
    aimActions.cancel=clear;
    aimActions.rotate=()=>{const g=useGame.getState();if(g.tool==='stair'){const ui=useInteraction.getState();ui.setStairRot(((ui.stairRot+1)%4) as 0|1|2|3);}else if(g.tool==='furniture')g.setDefaults({furnitureRotation:(g.defaults.furnitureRotation+90)%360});};
    aimActions.place=()=>{
      if(!aimBuilding()||useVenue.getState().inside)return;
      const p=pick(),g=useGame.getState();
      if(!p)return g.notify(`届く場所を狙ってください（${AIM_REACH}m以内・自分の土地）`);
      if(g.tool==='erase' && g.eraseMulti) {
        if(p.ref) g.toggleMark(p.ref);
        else g.notify('選ぶパーツを狙ってください');
        return;
      }
      // 歩く画面は1回で1ブロック（床・屋根は1マス、壁は1マス分）。始点・終点はない
      const plan=aimPlan(g.house,g.tool,g.defaults,p,camera.position,useInteraction.getState().stairRot);
      if(plan.error)return g.notify(plan.error);
      if(plan.next){g.commit(plan.next);
        if(g.tool==='furniture'){g.setTool('select');g.select({kind:'furniture',id:plan.next.furniture[plan.next.furniture.length-1].id});}
      }
    };
    const down=(e:PointerEvent)=>{
      if(e.pointerType==='touch'||!aimBuilding()||document.pointerLockElement!==gl.domElement)return;
      if(e.button===0||e.button===2){e.preventDefault();aimActions.place();}
    };
    // スマホ：照準（画面中央）を短くタップしたら置く（配置ボタンは無い）。なぞったら見回すだけ。削除は誤操作を防ぐため長押しボタンのみ。
    const taps=new Map<number,{x:number;y:number;t:number}>();
    const touchDown=(e:PointerEvent)=>{
      if(e.pointerType!=='touch')return;
      if(taps.size>0||!aimBuilding()||useGame.getState().tool==='erase'){taps.clear();return;}
      const r=gl.domElement.getBoundingClientRect();
      if(Math.hypot(e.clientX-(r.left+r.width/2),e.clientY-(r.top+r.height/2))<=AIM_TAP_RADIUS)taps.set(e.pointerId,{x:e.clientX,y:e.clientY,t:e.timeStamp});
    };
    const touchMove=(e:PointerEvent)=>{const s=taps.get(e.pointerId);if(s&&Math.hypot(e.clientX-s.x,e.clientY-s.y)>12)taps.delete(e.pointerId);};
    const touchUp=(e:PointerEvent)=>{
      const s=taps.get(e.pointerId);taps.delete(e.pointerId);
      if(e.type==='pointerup'&&s&&e.timeStamp-s.t<400&&Math.hypot(e.clientX-s.x,e.clientY-s.y)<=12&&aimBuilding()&&useGame.getState().tool!=='erase')aimActions.place();
    };
    const escape=(e:KeyboardEvent)=>{if(e.code==='Escape'){clear();if(document.pointerLockElement===gl.domElement)document.exitPointerLock();}};
    const unsub=useGame.subscribe((s,p)=>{if(s.tool!==p.tool||s.mode!==p.mode||s.view!==p.view||s.overlay!==p.overlay)clear();});
    gl.domElement.addEventListener('pointerdown',down);gl.domElement.addEventListener('pointerdown',touchDown);window.addEventListener('pointermove',touchMove);window.addEventListener('pointerup',touchUp);window.addEventListener('pointercancel',touchUp);window.addEventListener('keydown',escape);
    return()=>{unsub();gl.domElement.removeEventListener('pointerdown',down);gl.domElement.removeEventListener('pointerdown',touchDown);window.removeEventListener('pointermove',touchMove);window.removeEventListener('pointerup',touchUp);window.removeEventListener('pointercancel',touchUp);window.removeEventListener('keydown',escape);aimActions.place=()=>{};aimActions.cancel=()=>{};aimActions.rotate=()=>{};clear();};
  },[camera,gl,scene]);
  useFrame((_,dt)=>{
    clock.current+=dt;if(clock.current<.08)return;clock.current=0;
    if(!aimBuilding()){if(point.current)clear();return;}
    const p=useVenue.getState().inside?null:pick();point.current=p;
    if(!p){useAim.setState({valid:false,label:`${AIM_REACH}m以内の自分の土地を狙う`,target:null});useInteraction.getState().setPreview(null);return;}
    const g=useGame.getState(),plan=aimPlan(g.house,g.tool,g.defaults,p,camera.position,useInteraction.getState().stairRot);
    useAim.setState({valid:!plan.error,label:plan.error??(g.tool==='erase'?(g.eraseMulti?'狙ったパーツを選ぶ・外す':'狙ったパーツを消す'):g.tool==='floor'||g.tool==='wall'||g.tool==='roof'?'1ブロック置く':'狙った場所に配置する'),target:p.ref??null,range:false});
    g.setLevel(plan.point ? (g.tool==='roof'?Math.max(0,plan.point.level-1):plan.point.level) : g.activeLevel);
    useInteraction.getState().setPreview(plan.preview??null);
  });
  return null;
}
