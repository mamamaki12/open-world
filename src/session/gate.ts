import type { House } from '../building/types';
import type { Change } from './edits';
import type { SharedAction } from '../server/sharedWorld';
import type { OwnedCar } from '../state/vehicles';
import type { VehicleClaim } from '../world/vehicleSeats';

/** Kept independent of stores so persistence cannot accidentally save a visited world. */
export const sessionGate: {
  role: 'home' | 'host' | 'guest';
  applying: boolean;
  edit: null | ((before: House, after: House) => void);
  undo: null | (() => void);
  receipts: Record<string, { sender: string; cost: number; delta?: Change[]; undone?: boolean; cancelled?: boolean }>;
  worldId: string;
  visitors: () => { x: number; y: number; z: number; walking?: boolean; driving?: string | null }[];
  /** ほかのプレイヤーの車（町の座標）。相乗りに使う。 */
  remoteCars: () => { owner: string; car: OwnedCar }[];
  vehicleOccupants: () => VehicleClaim[];
  selfId: () => string;
  /** みんなのワールドに入っている間だけ。所持金は共通、車や土地はワールドごと。 */
  shared: boolean;
  /** 別の画面へ引き継いだ後は、古い画面からセーブを書き戻さない。 */
  superseded: boolean;
  money: null | ((delta: number, label: string) => void);
  act: null | ((lot: string, action: SharedAction, reserved: number) => string | null);
} = { shared: false, superseded: false, money: null, act: null, role: 'home', applying: false, edit: null, undo: null, receipts: {}, worldId: '', visitors: () => [], remoteCars: () => [], vehicleOccupants: () => [], selfId: () => 'local' };
export const visitingWorld = () => sessionGate.role === 'guest';
export const onlineWorld = () => sessionGate.role !== 'home';
