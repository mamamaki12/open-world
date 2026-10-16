import { describe, expect, it } from 'vitest';
import { aimPlan } from './aimBuild';
import { GRID } from './dimensions';
import { emptyHouse } from './types';
import { INITIAL_DEFAULTS } from '../state/store';

const d=INITIAL_DEFAULTS,viewer={x:4,z:8};
describe('central aim building',()=>{
  it('uses two grid corners for a floor and does not mutate the original',()=>{
    const h=emptyHouse();
    const p=aimPlan(h,'floor',d,{x:2*GRID,y:0,z:3*GRID},viewer,0,null);
    const end=aimPlan(h,'floor',d,{x:4*GRID,y:0,z:5*GRID},viewer,0,p.point!);
    expect(end.error).toBeNull();expect(end.next!.floors[0]).toMatchObject({x0:2,z0:3,x1:5,z1:6,level:0});expect(h.floors).toHaveLength(0);
  });
  it('keeps the starting level while looking at another height',()=>{
    const plan=aimPlan(emptyHouse(),'wall',d,{x:4*GRID,y:3.5,z:3*GRID},viewer,0,{x:2,z:3,level:0});
    expect(plan.next!.walls[0].level).toBe(0);
  });
  it('rejects out-of-lot and zero-length walls',()=>{
    expect(aimPlan(emptyHouse(),'floor',d,{x:-1,y:0,z:1},viewer,0,null).error).toBeTruthy();
    expect(aimPlan(emptyHouse(),'wall',d,{x:2,y:0,z:2},viewer,0,null).error).toBeTruthy();
  });
  it('requires an actual part to erase and a wall for openings',()=>{
    expect(aimPlan(emptyHouse(),'erase',d,{x:1,y:0,z:1},viewer,0,null).error).toBeTruthy();
    expect(aimPlan(emptyHouse(),'door',d,{x:1,y:0,z:1},viewer,0,null).error).toBeTruthy();
  });
  it('removes only the aimed part and leaves other parts intact',()=>{
    const p=aimPlan(emptyHouse(),'floor',d,{x:1,y:0,z:1},viewer,0,null).next!;
    const next=aimPlan(p,'erase',d,{x:1,y:.5,z:1,ref:{kind:'floor',id:p.floors[0].id}},viewer,0,null);
    expect(next.next!.floors).toHaveLength(0);expect(p.floors).toHaveLength(1);
  });
});
