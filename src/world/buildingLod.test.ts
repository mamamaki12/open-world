import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { sampleHouse } from '../building/sample';
import { TOWN_HOUSE_PLOTS, townHouseAt } from '../building/townHouses';
import { emptyHouse } from '../building/types';
import { buildingTier, distanceToBuilding, houseEnvelope, isInteriorPart } from './buildingLod';
import { distantHouseGeometry } from './DistantHouse';
import { bakeHouse } from './bakeHouse';

describe('desktop building distance',()=>{
  it('measures distance from the envelope, including tall buildings',()=>{
    const b={x0:0,x1:20,y0:0,y1:30,z0:0,z1:20};
    expect(distanceToBuilding({x:10,y:29,z:10},b)).toBe(0);
    expect(distanceToBuilding({x:23,y:10,z:24},b)).toBe(5);
    expect(distanceToBuilding({x:10,y:40,z:10},b)).toBe(10);
  });
  it('uses different entry/exit distances so small motions do not toggle geometry',()=>{
    expect(buildingTier(40,'near')).toBe('near');expect(buildingTier(40,'exterior')).toBe('exterior');
    expect(buildingTier(35,'distant')).toBe('near');expect(buildingTier(48,'near')).toBe('exterior');
    expect(buildingTier(110,'distant')).toBe('distant');expect(buildingTier(110,'exterior')).toBe('exterior');
    expect(buildingTier(100,'distant')).toBe('exterior');expect(buildingTier(125,'near')).toBe('distant');
  });
  it('preserves external walls, windows and outdoor items, but removes indoor furniture',()=>{
    const h=sampleHouse(),outer=houseEnvelope(h).outerWalls;
    expect(outer.size).toBeGreaterThan(0);
    for(const w of h.walls)if(outer.has(w.id))expect(isInteriorPart(h,{kind:'wall',id:w.id})).toBe(false);
    const indoor=h.furniture.find(f=>isInteriorPart(h,{kind:'furniture',id:f.id}));expect(indoor).toBeDefined();
    h.furniture.push({id:'garden',type:'sofa',level:0,x:-3,z:-3,rotation:0,color:'#fff'});
    expect(isInteriorPart(h,{kind:'furniture',id:'garden'})).toBe(false);
    const id=[...outer][0];h.furniture.push({id:'sign',type:'nameplate',level:0,x:0,z:0,rotation:0,color:'#fff',wallMount:{wallId:id,offset:1,height:1.5,side:1}});
    expect(isInteriorPart(h,{kind:'furniture',id:'sign'})).toBe(false);
  });
  it('bakes exterior geometry separately without changing the full variant',()=>{
    const h=sampleHouse(),f=h.furniture.find(f=>isInteriorPart(h,{kind:'furniture',id:f.id}))!;
    const root=new THREE.Group(),mat=new THREE.MeshBasicMaterial();
    const wall=new THREE.Mesh(new THREE.BoxGeometry(1,2,1),mat);wall.userData.partRef={kind:'wall',id:[...houseEnvelope(h).outerWalls][0]};root.add(wall);
    const item=new THREE.Group();item.userData.partRef={kind:'furniture',id:f.id};item.add(new THREE.Mesh(new THREE.BoxGeometry(1,1,1),mat));root.add(item);
    const count=(parts:ReturnType<typeof bakeHouse>['full'])=>parts.reduce((n,p)=>n+p.geometry.getAttribute('position').count,0);
    const both=bakeHouse(root,h),mobile=bakeHouse(root,h,false);
    expect(count(both.full)).toBe(72);expect(count(both.exterior)).toBe(36);expect(count(mobile.full)).toBe(72);expect(mobile.exterior).toHaveLength(0);
    [...both.full,...both.exterior,...mobile.full].forEach(p=>p.geometry.dispose());wall.geometry.dispose();(item.children[0] as THREE.Mesh).geometry.dispose();mat.dispose();
  });
  it('creates finite, low-poly envelopes for every town-house design without mutating saves',()=>{
    for(const plot of Object.keys(TOWN_HOUSE_PLOTS)){
      const h=townHouseAt(Number(plot))!,before=JSON.stringify(h),parts=distantHouseGeometry(h);
      expect(parts.length).toBeGreaterThan(0);let vertices=0;
      for(const p of parts){const positions=p.geometry.getAttribute('position');vertices+=positions.count;expect(Array.from(positions.array).every(Number.isFinite)).toBe(true);p.geometry.dispose();}
      expect(vertices/3).toBeLessThan(8000);expect(JSON.stringify(h)).toBe(before);
    }
  });
  it('handles empty lots',()=>{expect(distantHouseGeometry(emptyHouse())).toHaveLength(0);expect(houseEnvelope(emptyHouse()).bounds.x1).toBeGreaterThan(0);});
});
