import { describe,expect,it } from 'vitest';
import { CARS } from '../catalog/cars';
import { integrateDrive } from './driving';
const pose=()=>({x:0,z:0,yaw:0,speed:0,steer:0,wheelSpin:0,braking:false});
describe('vehicle motion',()=>{
  it('turns more with buttons at city speeds for every car, with symmetric left/right steering',()=>{
    for(const d of CARS) for(const speed of [3,8,12]) {
      const normal={...pose(),speed},right={...pose(),speed},left={...pose(),speed};
      for(let i=0;i<20;i++) {
        integrateDrive(normal,{throttle:0,steering:1,brake:false},.025,d,()=>false);
        integrateDrive(right,{throttle:0,steering:1,brake:false,buttonSteering:true},.025,d,()=>false);
        integrateDrive(left,{throttle:0,steering:-1,brake:false,buttonSteering:true},.025,d,()=>false);
      }
      expect(Math.abs(right.yaw),d.id).toBeGreaterThan(Math.abs(normal.yaw)*1.5);
      expect(left.yaw).toBeCloseTo(-right.yaw);
      expect(left.x).toBeCloseTo(-right.x);
      expect(left.z).toBeCloseTo(right.z);
    }
  });
  it('keeps button steering speed-limited, reverses correctly and recenters on release',()=>{
    const d=CARS[0],slow=pose(),fast={...pose(),speed:12},reverse={...pose(),speed:-2};
    for(let i=0;i<40;i++) {
      for(const p of [slow,fast,reverse]) integrateDrive(p,{throttle:0,steering:1,brake:false,buttonSteering:true},.025,d,()=>false);
    }
    expect(fast.steer).toBeLessThan(slow.steer);
    expect(slow.steer).toBeLessThanOrEqual(.7);
    expect(reverse.yaw).toBeGreaterThan(0);
    const before=slow.steer;
    for(let i=0;i<40;i++) integrateDrive(slow,{throttle:0,steering:0,brake:false},.025,d,()=>false);
    expect(slow.steer).toBeLessThan(before*.03);
  });
  it('provides ten distinct silhouettes and safe dimensions',()=>{
    expect(new Set(CARS.map(c=>c.id)).size).toBe(10);
    expect(new Set(CARS.map(c=>c.body)).size).toBeGreaterThanOrEqual(8);
    for(const c of CARS){expect(c.price).toBeGreaterThan(0);expect(c.wheelbase).toBeLessThan(c.length);expect(c.width).toBeLessThan(3);}
  });
  it('limits speed and brakes to a stop',()=>{
    const p=pose(),d=CARS[6];
    for(let i=0;i<800;i++)integrateDrive(p,{throttle:1,steering:0,brake:false},.05,d,()=>false);
    expect(p.speed).toBeCloseTo(d.maxSpeed);
    for(let i=0;i<40;i++)integrateDrive(p,{throttle:1,steering:0,brake:true},.05,d,()=>false);
    expect(p.speed).toBeLessThan(.01);
  });
  it('does not tunnel through a barrier during a slow frame',()=>{
    const p={...pose(),speed:20},d=CARS[6];
    integrateDrive(p,{throttle:1,steering:0,brake:false},.25,d,q=>q.z<-.5);
    expect(p.z).toBeGreaterThanOrEqual(-.5);expect(p.speed).toBe(0);
  });
  it('reverses with limited speed and opposite steering yaw',()=>{
    const d=CARS[0],f=pose(),r=pose();
    for(let i=0;i<30;i++){integrateDrive(f,{throttle:1,steering:1,brake:false},.05,d,()=>false);integrateDrive(r,{throttle:-1,steering:1,brake:false},.05,d,()=>false);}
    expect(f.yaw).toBeLessThan(0);expect(r.yaw).toBeGreaterThan(0);expect(r.speed).toBeGreaterThanOrEqual(-d.reverseSpeed);
  });
  it('steers less at speed so the car is easy to control',()=>{
    const d=CARS[2],slow=pose(),fast={...pose(),speed:14};
    for(let i=0;i<40;i++){integrateDrive(slow,{throttle:0,steering:1,brake:false},.05,d,()=>false);integrateDrive(fast,{throttle:1,steering:1,brake:false},.05,d,()=>false);}
    expect(Math.abs(fast.steer)).toBeLessThan(Math.abs(slow.steer)/2);
    expect(fast.steer).toBeGreaterThan(0);
  });
});
