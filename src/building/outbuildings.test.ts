import { expect,it } from 'vitest';
import { emptyHouse } from './types';
import { furnitureBaseY,wallBaseY,wallHeight,wallsUnder } from './rules';
import { resolveCollisions } from './walk';
it('starts both boundary fences on the ground without changing legacy house walls',()=>{
  expect(wallBaseY({level:0,height:'fence'})).toBe(0);
  expect(wallBaseY({level:0,height:'privacyFence'})).toBe(0);
  expect(wallBaseY({level:0})).toBe(.5);
  expect(wallHeight({height:'privacyFence'})).toBe(1.8);
  const h=emptyHouse();h.walls.push({id:'f',level:0,x0:0,z0:0,x1:8,z1:0,height:'fence',exterior:{material:'brick',color:'#aaa'},interior:{material:'brick',color:'#aaa'}});
  expect(wallsUnder(h,0,{x0:0,z0:0,x1:4,z1:4})).toBe(false);
  const q=resolveCollisions(h,{x:1,z:.01},0,1.7);expect(q.z).toBeGreaterThan(.25);
});
it('allows vehicles and people through a carport while retaining post collisions',()=>{
  const h=emptyHouse(),f={id:'g',level:0,x:8,z:8,type:'garage-carport',rotation:0,color:'#aaa'};
  h.furniture.push(f);
  expect(furnitureBaseY(h,f)).toBe(0);
  expect(resolveCollisions(h,{x:8,z:8},0,1.7)).toEqual({x:8,z:8});
  expect(resolveCollisions(h,{x:6.35,z:5.5},0,1.7)).not.toEqual({x:6.35,z:5.5});
});
it('opens the shutter panel while keeping its side posts solid',()=>{
  const h=emptyHouse();h.furniture.push({id:'gate',level:0,x:8,z:8,type:'garage-shutter',rotation:0,color:'#aaa'});
  expect(resolveCollisions(h,{x:8,z:8.01},0,1.7,()=>false)).not.toEqual({x:8,z:8.01});
  expect(resolveCollisions(h,{x:8,z:8.01},0,1.7,()=>true)).toEqual({x:8,z:8.01});
});
