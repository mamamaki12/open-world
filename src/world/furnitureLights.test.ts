import { expect, it } from 'vitest';
import { nearestFurnitureLights } from './furnitureLights';
import { plainMaterial } from './materials';
const light={position:[0,0,0] as [number,number,number],color:'#ffd6a0',intensity:3,distance:4};
it('uses only the nearest global slots and discards distant lamps',()=>{
  const candidates=Array.from({length:40},(_,i)=>({x:i,y:0,z:0,light})).reverse();
  expect(nearestFurnitureLights(candidates,{x:0,y:0,z:0},6).map(x=>x.x)).toEqual([0,1,2,3,4,5]);
  expect(nearestFurnitureLights(candidates,{x:0,y:0,z:0},3)).toHaveLength(3);
  expect(nearestFurnitureLights(candidates,{x:100,y:0,z:0},6)).toEqual([]);
});
it('keeps glow materials separate from ordinary furniture and retains selection highlighting',()=>{
  const ordinary=plainMaterial('#ffffff'),glow=plainMaterial('#ffffff','none',{emissive:light.color});
  expect(ordinary).not.toBe(glow);expect(ordinary.emissiveIntensity).toBe(0);expect(glow.emissiveIntensity).toBeGreaterThan(1);
  expect(plainMaterial('#ffffff','focus',{emissive:light.color}).emissiveIntensity).toBe(.16);
});
