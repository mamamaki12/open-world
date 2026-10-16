import type { House } from '../building/types';

/** Kept independent of stores so persistence cannot accidentally save a visited world. */
export const sessionGate: {
  role: 'home' | 'host' | 'guest';
  applying: boolean;
  edit: null | ((before: House, after: House) => void);
} = { role: 'home', applying: false, edit: null };
export const visitingWorld = () => sessionGate.role === 'guest';
export const onlineWorld = () => sessionGate.role !== 'home';
