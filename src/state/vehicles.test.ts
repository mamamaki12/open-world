import { afterEach,expect,it,vi } from 'vitest';
import { buyCar,useVehicles,validCar,deliveryBay } from './vehicles';
import { useEconomy } from './economy';
import { CARS } from '../catalog/cars';
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
  expect(Math.hypot(first.x-bay.x,first.z-bay.z)).toBeGreaterThan(3);
  expect(validCar(first)).toBe(true);expect(validCar({...first,x:NaN})).toBe(false);expect(validCar({...first,model:'unknown'})).toBe(false);
});
