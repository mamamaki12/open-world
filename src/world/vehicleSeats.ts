import type { CarDef } from '../catalog/cars';
import { carBelt, carCowl, carShape } from './carShape';

export function driverEye(d: CarDef) {
  return { x: -d.width * .25, y: Math.min(carBelt(d) + .56, d.height - .14), z: Math.max(carCowl(d) + 1, d.length * .04) };
}
export function vehicleSeat(d: CarDef, index: number) {
  const e = driverEye(d), s = carShape(d), rear = d.seats > 5 ? s.topRear - .14 : Math.min(s.topRear - .08, e.z + 1.02);
  const third = d.seats > 5 && index >= 4;
  const center = index === d.seats - 1 && d.seats % 2 === 1 && index > 1;
  return { x: center ? 0 : (index % 2 === 0 ? e.x : -e.x), y: e.y - .72,
    z: index < 2 ? e.z + .11 : third || d.seats <= 5 ? rear - .25 : e.z + 1.05,
    label: index === 0 ? '運転席' : index === 1 ? '助手席' : `${third ? '3' : '2'}列目${center ? '中央' : index % 2 === 0 ? '左' : '右'}` };
}
export interface VehicleClaim { id: string; name: string; driving?: string | null; riding?: string | null; ridingOwner?: string; ridingSeat?: number }
/** Resolve simultaneous requests in the same order on every client. */
export function assignVehicleSeats(owner: string, car: string, capacity: number, claims: VehicleClaim[]) {
  const result: { person: VehicleClaim; seat: number }[] = [];
  const driver = claims.find(p => p.id === owner && p.driving === car);
  if (driver) result.push({ person: driver, seat: 0 });
  for (const person of claims.filter(p => p.id !== driver?.id && p.riding === car && (!p.ridingOwner || p.ridingOwner === owner)).sort((a, b) => a.id.localeCompare(b.id))) {
    const requested = person.ridingSeat;
    const seat = Number.isInteger(requested) && requested! > 0 && requested! < capacity && !result.some(p => p.seat === requested)
      ? requested! : Array.from({ length: capacity - 1 }, (_, i) => i + 1).find(i => !result.some(p => p.seat === i));
    if (seat !== undefined) result.push({ person, seat });
  }
  return result;
}
