import { describe, expect, it } from 'vitest';
import { FURNITURE, getFurniture } from '../catalog';
import { emptyHouse } from './types';
import { floorY, GRID, WALL_THICKNESS } from './dimensions';
import { mountedTransform, nameplateMount } from './mounts';
import { furnitureBaseY, removePart } from './rules';
import { aimPlan } from './aimBuild';
import { useGame } from '../state/store';
import { applyChanges, changes } from '../session/edits';
import { furniturePrice } from '../economy/pricing';
import { resolveCollisions } from './walk';

const finish = {material:'siding',color:'#fff'};
const wall = {id:'wall',level:1,x0:1,z0:2,x1:6,z1:2,exterior:finish,interior:finish};
const house = {...emptyHouse(), walls:[wall]};
describe('furniture lighting', () => {
  it.each(['wall-sconce','wall-light-bar'])('mounts %s on both sides and follows the wall on upper floors', type => {
    for (const side of [-1,1]) {
      const m = nameplateMount(house,wall,{x:3*GRID,y:floorY(1)+1.6,z:2*GRID},{x:3*GRID,z:2*GRID+side},type)!;
      const p = mountedTransform(house,m,type)!;
      expect(m.side).toBe(side); expect(p.y+1.6).toBeCloseTo(floorY(1)+1.6);
      expect((p.z-wall.z0*GRID)*side-getFurniture(type).mount!.back).toBeGreaterThan(WALL_THICKNESS/2);
      const moved = {...house,walls:[{...wall,x0:2,x1:7}]};
      expect(mountedTransform(moved,m,type)!.x-p.x).toBeCloseTo(GRID);
    }
  });
  it('rejects lamps intersecting openings and walls too small for a bar', () => {
    const opened={...house,openings:[{id:'door',wallId:wall.id,kind:'door' as const,type:'entrance',offset:2*GRID,sashColor:'#fff',panelColor:'#fff'}]};
    for(const type of ['wall-sconce','wall-light-bar'])expect(nameplateMount(opened,wall,{x:3*GRID,y:floorY(1)+1.6,z:2*GRID},{x:3*GRID,z:0},type)).toBeNull();
    const small={...wall,x1:1.5};
    expect(nameplateMount({...house,walls:[small]},small,{x:GRID,y:floorY(1)+1.6,z:2*GRID},{x:GRID,z:0},'wall-light-bar')).toBeNull();
  });
  it('uses the same mounting and preview in walking aim and preserves mounts through shared changes', () => {
    const defaults={...useGame.getState().defaults,furnitureType:'wall-sconce'};
    const result=aimPlan(house,'furniture',defaults,{x:3*GRID,y:floorY(1)+1.6,z:2*GRID,ref:{kind:'wall',id:wall.id}},{x:3*GRID,z:0},0,null);
    expect(result.error).toBeNull(); expect(result.preview).toMatchObject({kind:'nameplate',type:'wall-sconce'});
    const saved=JSON.parse(JSON.stringify(result.next!));
    const synced=applyChanges(house,changes(house,saved));
    expect(synced.furniture[0].wallMount?.wallId).toBe(wall.id);
    expect(removePart(synced,{kind:'wall',id:wall.id}).furniture).toEqual([]);
    expect(aimPlan(house,'furniture',defaults,{x:3*GRID,y:floorY(1),z:4*GRID},{x:3*GRID,z:0},0,null)).toMatchObject({error:'取り付ける壁面を狙ってください'});
  });
  it('places indirect lighting on bare ground or the floor it stands on', () => {
    const f={level:0,type:'indirect-floor-light',x:GRID,z:GRID};
    expect(furnitureBaseY(emptyHouse(),f)).toBe(0);
    const floors=[{id:'f',level:0,x0:0,z0:0,x1:4,z1:4,finish:{material:'flooring',color:'#fff'}}];
    expect(furnitureBaseY({...emptyHouse(),floors},f)).toBe(floorY(0));
    expect(furnitureBaseY(emptyHouse(),{...f,level:2})).toBe(floorY(2));
  });
  it('does not turn a raised wall lamp into an invisible obstruction at ground level', () => {
    const w={...wall,level:0},h={...emptyHouse(),walls:[w]};
    const mount=nameplateMount(h,w,{x:3*GRID,y:floorY(0)+1.6,z:2*GRID},{x:3*GRID,z:3*GRID},'wall-sconce')!;
    const p=mountedTransform(h,mount,'wall-sconce')!;
    const next={...h,furniture:[{id:'light',type:'wall-sconce',level:0,x:p.x,z:p.z,rotation:p.rotation,color:'#fff',wallMount:mount}]};
    const point={x:p.x,z:2*GRID+.4};
    expect(resolveCollisions(next,point,0,1.65)).toEqual(point);
  });
  it('keeps the existing relay pricing fallback compatible and defines warm finite light sources', () => {
    const lamps=FURNITURE.filter(f=>f.category==='lighting');
    expect(lamps.length).toBe(10);
    for(const f of lamps){
      expect(f.parts.some(p=>p.glow)).toBe(true);
      expect(f.light!.position.every(Number.isFinite)).toBe(true);
      expect(f.light!.distance).toBeGreaterThan(0);expect(f.light!.distance).toBeLessThanOrEqual(7);
      if(f.id!=='floor-lamp')expect(furniturePrice(f.id)).toBe(furniturePrice('unknown-old-relay-type'));
    }
  });
});
