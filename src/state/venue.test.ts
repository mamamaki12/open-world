import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { autoVenueDoors } from './venue';
import { useDoors } from './doors';
import { sessionGate } from '../session/gate';
import { VENUES, VENUE_DOORS, VENUE_KINDS, venueDoorId, venueEntrance } from '../building/venues';

vi.mock('./economy', () => ({ civicOffset: () => ({ x: 123, z: -45 }) }));
vi.mock('../world/sound', () => ({ playDoorSound: vi.fn() }));
const original = { ...sessionGate };
const far = { x: -10000, y: 0, z: -10000 };
function entrance(kind: typeof VENUE_KINDS[number]) {
  const p=venueEntrance(kind,1);
  return { x: 123 + p.x, y: 0, z: -45 + p.z };
}
beforeEach(() => {
  Object.assign(sessionGate, { role: 'guest', shared: true, applying: false, visitors: () => [] });
  useDoors.getState().closeAll();
});
afterEach(() => { Object.assign(sessionGate, original); useDoors.getState().closeAll(); });

it('opens every store for a shared guest and closes after walking away', () => {
  for (const kind of VENUE_KINDS) {
    autoVenueDoors(entrance(kind), true);
    expect(useDoors.getState().open[venueDoorId(kind)]).toBe(1);
    autoVenueDoors(far, true);
    expect(useDoors.getState().open[venueDoorId(kind)]).toBeUndefined();
  }
});
it('keeps a door open for another pedestrian even while the local player is building', () => {
  sessionGate.visitors = () => [{ ...entrance('dealer'), walking: true }];
  autoVenueDoors(far, false);
  expect(useDoors.getState().open[venueDoorId('dealer')]).toBe(1);
  autoVenueDoors(far, true);
  expect(useDoors.getState().open[venueDoorId('dealer')]).toBe(1);
  sessionGate.visitors = () => [];
  autoVenueDoors(far, false);
  expect(useDoors.getState().open[venueDoorId('dealer')]).toBeUndefined();
});
it('ignores remote cars and players in build mode, and accepts older pedestrian poses', () => {
  for (const visitor of [{ ...entrance('casino'), driving: 'car-1' }, { ...entrance('casino'), walking: false }]) {
    sessionGate.visitors = () => [visitor];
    autoVenueDoors(far, false);
    expect(useDoors.getState().open[venueDoorId('casino')]).toBeUndefined();
  }
  sessionGate.visitors = () => [entrance('casino')];
  autoVenueDoors(far, false);
  expect(useDoors.getState().open[venueDoorId('casino')]).toBe(1);
});
it('does not close on a player jumping in the doorway', () => {
  autoVenueDoors(entrance('estate'), true);
  sessionGate.visitors = () => [{ x: 123 + VENUE_DOORS.estate.x, y: .8, z: -45 + VENUES.estate.z0, walking: true }];
  autoVenueDoors(far, false);
  expect(useDoors.getState().open[venueDoorId('estate')]).toBe(1);
});
it('keeps private guests passive and preserves solo and host automation', () => {
  sessionGate.shared = false;
  autoVenueDoors(entrance('estate'), true);
  expect(useDoors.getState().open[venueDoorId('estate')]).toBeUndefined();
  for (const role of ['home', 'host'] as const) {
    sessionGate.role = role;
    autoVenueDoors(entrance('estate'), true);
    expect(useDoors.getState().open[venueDoorId('estate')]).toBe(1);
    autoVenueDoors(far, false);
  }
});
it('marks shared automatic updates as local so the network subscription cannot echo them', () => {
  const changes: boolean[] = [];
  const stop = useDoors.subscribe(() => changes.push(sessionGate.applying));
  try {
    autoVenueDoors(entrance('estate'), true);
    autoVenueDoors(far, true);
    expect(changes).toEqual([true, true]);
    expect(sessionGate.applying).toBe(false);
    sessionGate.applying = true;
    autoVenueDoors(entrance('estate'), true);
    expect(sessionGate.applying).toBe(true);
  } finally { stop(); }
});
