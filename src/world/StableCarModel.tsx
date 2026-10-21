import { useMemo, useRef } from 'react';
import { getCar } from '../catalog/cars';
import type { OwnedCar } from '../state/vehicles';
import { CarModel } from './CarModel';

/** Motion arrives at 20Hz; only appearance changes should rebuild the car interior. */
export function StableCarModel({ car }: { car: OwnedCar }) {
  const pose = useRef({ ...car });
  Object.assign(pose.current, car);
  const appearance = JSON.stringify([car.model, car.color, car.mods]);
  return useMemo(() => <CarModel def={getCar(car.model)!} color={car.color} mods={car.mods} pose={pose.current}/>, [appearance]);
}
