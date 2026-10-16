import { create } from 'zustand';
import { CARS, getCar } from '../catalog/cars';
import type { DrivePose } from '../building/driving';
import { useEconomy, saveEconomy } from './economy';
import { useGame } from './store';
import { CIVIC_SITE } from '../economy/town';
import { DEALER_BAYS } from '../building/dealer';
import { newId } from '../building/rules';

export interface OwnedCar extends DrivePose { id: string; model: string; color: string; lights: boolean }
const KEY = 'open-world:cars:v1';
export function validCar(v: unknown): v is OwnedCar {
  if (!v || typeof v !== 'object') return false;
  const c = v as OwnedCar;
  return typeof c.id === 'string' && !!getCar(c.model) && /^#[0-9a-f]{6}$/i.test(c.color) &&
    [c.x, c.z, c.yaw].every(Number.isFinite) && Math.abs(c.x) < 1000 && Math.abs(c.z) < 1000;
}
function loadCars(): OwnedCar[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(data) ? data.filter(validCar).slice(0, 10).map(c => ({...c, speed:0, steer:0, wheelSpin:0, braking:false, lights:!!c.lights})) : [];
  } catch { return []; }
}
export const useVehicles = create<{ cars: OwnedCar[]; driving: string | null; target: string | null }>(() => ({
  cars: loadCars(), driving: null, target: null,
}));
export function saveVehicles() {
  try { localStorage.setItem(KEY, JSON.stringify(useVehicles.getState().cars)); } catch { /* 続けて遊べる */ }
}
/** 納車は店の横の駐車場の10区画のうち、車がない区画へ。 */
export function deliveryBay(cars: OwnedCar[]) {
  for (const b of DEALER_BAYS) {
    const x = CIVIC_SITE.x + b.x, z = CIVIC_SITE.z + b.z;
    if (cars.every(c => Math.hypot(c.x-x,c.z-z)>2.4)) return {x,z,yaw:b.yaw};
  }
  return null;
}
export function buyCar(model: string, color: string, atStore: boolean): string | null {
  if (!atStore) return 'カーディーラーの入口から購入してください';
  const def = CARS.find(c=>c.id===model);
  if (!def || !/^#[0-9a-f]{6}$/i.test(color)) return '車種または色が不正です';
  const state = useVehicles.getState();
  if (state.cars.length >= 10) return '所有できる車は10台までです';
  const bay = deliveryBay(state.cars);
  if (!bay) return '納車スペースが埋まっています。車を移動してください';
  if (!useEconomy.getState().pay(def.price, '車両購入：'+def.name)) return 'お金が足りません';
  useVehicles.setState({cars:[...state.cars,{id:newId('car'),model,color,...bay,speed:0,steer:0,wheelSpin:0,braking:false,lights:false}]});
  saveVehicles(); saveEconomy();
  useGame.getState().notify(def.name+'を購入しました。店の横の駐車場でFを押すと乗れます');
  return null;
}
