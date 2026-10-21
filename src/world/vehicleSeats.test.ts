import { describe, expect, it } from 'vitest';
import { CARS } from '../catalog/cars';
import { assignVehicleSeats, driverEye, vehicleSeat } from './vehicleSeats';

describe('vehicle seats', () => {
  it('clears passenger occupancy when leaving vehicle mode for construction', async () => {
    const { useVehicles } = await import('../state/vehicles');
    const { parkVehicle } = await import('./vehicleLogic');
    const old = useVehicles.getState();
    try { useVehicles.setState({ riding: { owner: 'owner', car: 'car', seat: 1 } }); parkVehicle(); expect(useVehicles.getState().riding).toBeNull(); }
    finally { useVehicles.setState(old); }
  });
  it('places distinct seats inside every model with driver on the left', () => {
    for (const d of CARS) {
      const seats = Array.from({ length: d.seats }, (_, i) => vehicleSeat(d, i));
      expect(new Set(seats.map(p => `${p.x},${p.z}`)).size).toBe(d.seats);
      expect(seats[0].x).toBeLessThan(0); expect(seats[1].x).toBeGreaterThan(0);
      for (const p of seats) { expect(Math.abs(p.x)).toBeLessThan(d.width / 2); expect(Math.abs(p.z)).toBeLessThan(d.length / 2); expect(p.y).toBeGreaterThan(0); }
      expect(driverEye(d).y).toBeLessThan(d.height);
    }
  });
  it('reserves the driver seat and assigns legacy passengers to free seats', () => {
    const claims = [{ id: 'owner', name: '運転手', driving: 'car' }, { id: 'b', name: 'B', riding: 'car' }, { id: 'a', name: 'A', riding: 'car' }];
    expect(assignVehicleSeats('owner', 'car', 4, claims).map(p => [p.person.id, p.seat])).toEqual([['owner', 0], ['a', 1], ['b', 2]]);
    expect(assignVehicleSeats('owner', 'car', 4, [...claims].reverse())).toEqual(assignVehicleSeats('owner', 'car', 4, claims));
  });
  it('resolves competing requests, invalid slots and capacity without overlapping users', () => {
    const claims = ['c', 'b', 'a'].map(id => ({ id, name: id, riding: 'car', ridingSeat: 1 }));
    expect(assignVehicleSeats('owner', 'car', 2, claims).map(p => [p.person.id, p.seat])).toEqual([['a', 1]]);
    expect(assignVehicleSeats('owner', 'car', 4, [...claims, { id: 'd', name: 'D', riding: 'other', ridingSeat: 0 }])).toHaveLength(3);
    expect(assignVehicleSeats('owner', 'car', 4, [{ ...claims[0], ridingOwner: 'another-owner' }])).toEqual([]);
  });
  it('preserves an explicitly selected back seat', () => {
    expect(assignVehicleSeats('owner', 'car', 7, [{ id: 'a', name: 'A', riding: 'car', ridingSeat: 6 }])[0].seat).toBe(6);
  });
});
