import { expect, it } from 'vitest';
import * as THREE from 'three';
import { floorY, GRID, lotSize } from '../building/dimensions';
import { emptyHouse } from '../building/types';
import { placementPoint } from './placementRay';
import { floorPointerLevel, pointerSurfaceLevel } from './placementSurface';
import { reservesTouch } from '../state/gestures';

it.each([[844,390],[390,844]])('reserves upper-floor touches at an oblique lot edge (%s×%s)', (width,height) => {
  const bounds={left:0,top:0,width,height};
  const camera=new THREE.PerspectiveCamera(45,width/height,.1,200);
  camera.position.set(25,14,28);camera.lookAt(2.5,3.4,2.5);camera.updateMatrixWorld();
  const finish={material:'flooring',color:'#c8a57a'};
  const house={...emptyHouse(),floors:[{id:'edge',level:1,x0:1,x1:4,z0:1,z1:4,finish}]};
  const object=new THREE.Group();
  const slab=new THREE.Mesh(new THREE.BoxGeometry(3*GRID,.25,3*GRID));
  slab.position.set(2.5*GRID,floorY(1)-.125,2.5*GRID);object.add(slab);
  const projected=new THREE.Vector3(2.2,3.4,2.2).project(camera);
  const x=(projected.x+1)*width/2,y=(1-projected.y)*height/2;
  const inside=(p:THREE.Vector3|null)=>!!p&&p.x>=0&&p.z>=0&&p.x<=lotSize.w*GRID&&p.z<=lotSize.d*GRID;
  // The old check used the stale activeLevel=0, outside the lot despite touching the visible slab.
  expect(reservesTouch('floor','build',false,inside(placementPoint(camera,bounds,x,y,0)))).toBe(false);
  const level=floorPointerLevel(house,camera,bounds,x,y,object);
  expect(level).toBe(1);
  expect(reservesTouch('floor','build',false,inside(placementPoint(camera,bounds,x,y,level)))).toBe(true);
  slab.geometry.dispose();
});

it('does not clamp an outside pointer onto a boundary floor', () => {
  const camera=new THREE.PerspectiveCamera(45,2,.1,200);camera.position.set(-3,20,2);camera.lookAt(-3,0,2);camera.updateMatrixWorld();
  const finish={material:'flooring',color:'#fff'};
  const house={...emptyHouse(),floors:[{id:'edge',level:1,x0:0,x1:2,z0:1,z1:3,finish}]};
  expect(floorPointerLevel(house,camera,{left:0,top:0,width:800,height:400},400,200,undefined)).toBe(0);
  expect(pointerSurfaceLevel(camera,{left:0,top:0,width:0,height:0},0,0,undefined)).toBe(0);
});
