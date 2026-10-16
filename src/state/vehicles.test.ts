import { afterEach,expect,it,vi } from 'vitest';
import { buyCar,useVehicles,validCar,deliveryBay } from './vehicles';
import { useEconomy } from './economy';
import { CARS } from '../catalog/cars';
import { DEALER, DEALER_BAYS } from '../building/dealer';
import { CIVIC_SITE } from '../economy/town';
const eco=useEconomy.getState(),vehicles=useVehicles.getState();
afterEach(()=>{useEconomy.setState(eco);useVehicles.setState(vehicles);vi.unstubAllGlobals();});
it('does not charge away from the store or when money is insufficient',()=>{
  useVehicles.setState({cars:[]});useEconomy.setState({money:10});
  expect(buyCar(CARS[0].id,'#abcdef',false)).not.toBeNull();expect(useEconomy.getState().money).toBe(10);
  expect(buyCar(CARS[0].id,'#abcdef',true)).not.toBeNull();expect(useVehicles.getState().cars).toHaveLength(0);
});
it('charges exactly once and allocates separate delivery bays',()=>{
  vi.stubGlobal('localStorage',{getItem:()=>null,setItem:()=>undefined});
  useVehicles.setState({cars:[]});useEconomy.setState({money:10000000});
  expect(buyCar(CARS[0].id,'#abcdef',true)).toBeNull();expect(useEconomy.getState().money).toBe(10000000-CARS[0].price);
  const first=useVehicles.getState().cars[0],bay=deliveryBay(useVehicles.getState().cars)!;
  expect(Math.hypot(first.x-bay.x,first.z-bay.z)).toBeGreaterThan(2.4);
  expect(validCar(first)).toBe(true);expect(validCar({...first,x:NaN})).toBe(false);expect(validCar({...first,model:'unknown'})).toBe(false);
});
it('delivers into the parking lot beside the dealer, visible from the front road',()=>{
  for(const b of DEALER_BAYS){expect(b.x).toBeGreaterThan(DEALER.x1+2);expect(b.z).toBeLessThan(DEALER.z1+2);}
  useVehicles.setState({cars:[]});
  const bay=deliveryBay([])!;expect(bay.x-CIVIC_SITE.x).toBeGreaterThan(DEALER.x1);expect(bay.z-CIVIC_SITE.z).toBeLessThan(DEALER.z0+4);
});
