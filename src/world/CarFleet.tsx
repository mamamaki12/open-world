import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getCar } from '../catalog/cars';
import { currentPlotOf, useEconomy } from '../state/economy';
import { saveVehicles, useVehicles } from '../state/vehicles';
import type { OwnedCar } from '../state/vehicles';
import { useGame } from '../state/store';
import { plotX, plotZ } from '../economy/town';
import { CarModel } from './CarModel';
import { parkVehicle } from './vehicleLogic';
function ParkedCar({car}:{car:OwnedCar}){
  const ref=useRef<THREE.Group>(null);
  useFrame(()=>{
    if(!ref.current)return;
    const p=currentPlotOf(useEconomy.getState());
    ref.current.position.set(car.x-plotX(p),0,car.z-plotZ(p));ref.current.rotation.y=car.yaw;
  });
  return <group ref={ref} name={'vehicle-'+car.id}><CarModel def={getCar(car.model)!} color={car.color} pose={car} mods={car.mods}/></group>;
}
export function CarFleet(){
  const cars=useVehicles(s=>s.cars);
  useEffect(()=>{
    const unsub=useGame.subscribe((s,prev)=>{if(s.mode!==prev.mode&&s.mode==='build')parkVehicle();});
    window.addEventListener('beforeunload',saveVehicles);
    const saveHidden=()=>{if(document.hidden)saveVehicles();};document.addEventListener('visibilitychange',saveHidden);
    return ()=>{unsub();window.removeEventListener('beforeunload',saveVehicles);document.removeEventListener('visibilitychange',saveHidden);saveVehicles();};
  },[]);
  return <group name="vehicles">{cars.map(car=><ParkedCar key={car.id} car={car}/>)}</group>;
}
