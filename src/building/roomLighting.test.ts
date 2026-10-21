import {describe,it,expect} from 'vitest';
import {hasRoomCeiling,indoorSurface,withDefaultRoomLights,roomLightReaches,ceilingEditError,detachUnsupportedCeilingLights} from './roomLighting';
import {sampleHouse} from './sample';
import {townHouseAt,TOWN_HOUSE_PLOTS} from './townHouses';
import {getFurniture,FURNITURE} from '../catalog';
import {furnitureBaseY} from './rules';
import {floorY,WALL_HEIGHT} from './dimensions';
import {emptyHouse} from './types';
import {aimPlan} from './aimBuild';
import {useGame} from '../state/store';
const finish={material:'flooring',color:'#fff'};
const floor={id:'f',level:0,x0:2,z0:2,x1:10,z1:10,finish};
const room={...emptyHouse(),floors:[floor,{...floor,id:'upper',level:1}]};
describe('room lighting',()=>{
  it('requires a ceiling, distinguishes a terrace, uncovered ground and the upper story',()=>{
    expect(hasRoomCeiling(room,0,4,4)).toBe(true);
    expect(hasRoomCeiling(room,1,4,4)).toBe(false);
    expect(hasRoomCeiling({...room,floors:[{...floor,kind:'terrace'},room.floors[1]]},0,4,4)).toBe(false);
    expect(indoorSurface(room,4,.6,4)).toBe(true);
    expect(indoorSurface(room,1,.6,1)).toBe(false);
    expect(indoorSurface(room,4,3.5,4)).toBe(false);
  });
  it('places all ceiling models below the correct ceiling, including upper floors, and rejects bare ground',()=>{
    for(const def of FURNITURE.filter(f=>f.ceiling)){
      const item={type:def.id,level:1,x:4,z:4};
      expect(furnitureBaseY(room,item)).toBeCloseTo(floorY(1)+WALL_HEIGHT-.035);
      expect(Math.max(...def.parts.map(p=>p.pos[1]+p.size[1]/2))).toBeLessThanOrEqual(.001);
      expect(Math.min(...def.parts.map(p=>p.pos[1]-p.size[1]/2))).toBeGreaterThan(-.8);
      const defaults={...useGame.getState().defaults,furnitureType:def.id};
      expect(aimPlan(room,'furniture',defaults,{x:4,y:.5,z:4},{x:4,z:6},0,null).error).toBeNull();
      expect(aimPlan(emptyHouse(),'furniture',defaults,{x:4,y:0,z:4},{x:4,z:6},0,null).error).toContain('天井');
    }
  });
  it('lights each default building without touching saved houses, keeps stable IDs and valid ceiling coverage',()=>{
    expect(withDefaultRoomLights(emptyHouse()).furniture).toEqual([]);
    for(const house of [sampleHouse(),...Object.keys(TOWN_HOUSE_PLOTS).map(Number).map(townHouseAt).filter(h=>!!h)]){
      const lights=house.furniture.filter(f=>getFurniture(f.type).ceiling);
      expect(lights.length).toBeGreaterThan(0);
      for(const f of lights)expect(hasRoomCeiling(house,f.level,f.x,f.z)).toBe(true);
      expect(new Set(house.furniture.map(f=>f.id)).size).toBe(house.furniture.length);
    }
    expect(sampleHouse().furniture.some(f=>getFurniture(f.type).ceiling)).toBe(true);
  });
  it('does not illuminate an unlit neighbouring room or another floor',()=>{
    const h={...room,walls:[{id:'partition',level:0,x0:6,z0:2,x1:6,z1:10,exterior:finish,interior:finish}]};
    expect(roomLightReaches(h,{x:3,y:3.1,z:4},{x:4,y:2,z:4})).toBe(true);
    expect(roomLightReaches(h,{x:3,y:3.1,z:4},{x:7,y:2,z:4})).toBe(false);
    expect(roomLightReaches(h,{x:3,y:6,z:4},{x:4,y:2,z:4})).toBe(false);
  });
  it('rejects unsupported ceiling moves and removes fixtures only when their support disappears',()=>{
    const lamp={id:'l',level:0,type:'ceiling-disc-light',x:4,z:4,rotation:0,color:'#fff'},h={...room,furniture:[lamp]};
    expect(ceilingEditError(h,{...h,furniture:[{...lamp,x:1}]})).toContain('天井');
    expect(ceilingEditError(h,{...h,furniture:[{...lamp,x:5}]})).toBeNull();
    const removed={...h,floors:[floor]};
    expect(detachUnsupportedCeilingLights(h,removed).furniture).toEqual([]);
    expect(detachUnsupportedCeilingLights(h,{...h,walls:[]}).furniture).toEqual([lamp]);
  });
});
