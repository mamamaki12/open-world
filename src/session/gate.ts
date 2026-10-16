import type { House } from '../building/types';
import type { Change } from './edits';

/** Kept independent of stores so persistence cannot accidentally save a visited world. */
export const sessionGate: {
  role: 'home' | 'host' | 'guest';
  applying: boolean;
  edit: null | ((before: House, after: House) => void);
  undo: null | (() => void);
  receipts: Record<string, { sender: string; cost: number; delta?: Change[]; undone?: boolean }>;
  worldId: string;
} = { role: 'home', applying: false, edit: null, undo: null, receipts: {}, worldId: '' };
export const visitingWorld = () => sessionGate.role === 'guest';
export const onlineWorld = () => sessionGate.role !== 'home';
