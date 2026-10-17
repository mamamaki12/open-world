import type { House } from '../building/types';
import type { Change } from './edits';
import type { SharedAction } from '../server/sharedWorld';

/** Kept independent of stores so persistence cannot accidentally save a visited world. */
export const sessionGate: {
  role: 'home' | 'host' | 'guest';
  applying: boolean;
  edit: null | ((before: House, after: House) => void);
  undo: null | (() => void);
  receipts: Record<string, { sender: string; cost: number; delta?: Change[]; undone?: boolean; cancelled?: boolean }>;
  worldId: string;
  visitors: () => { x: number; y: number; z: number; walking?: boolean; driving?: string | null }[];
  /** みんなのワールドに入っている間だけ。所持金・車は自分のワールドと別の口座 */
  shared: boolean;
  money: null | ((delta: number, label: string) => void);
  act: null | ((lot: string, action: SharedAction, reserved: number) => string | null);
} = { shared: false, money: null, act: null, role: 'home', applying: false, edit: null, undo: null, receipts: {}, worldId: '', visitors: () => [] };
export const visitingWorld = () => sessionGate.role === 'guest';
export const onlineWorld = () => sessionGate.role !== 'home';
