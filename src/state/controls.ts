import { create } from 'zustand';
import type { Tool } from './store';
import type { PartRef } from '../building/types';

export const QUICK_TOOLS: Tool[] = ['select','floor','wall','door','window','stair','roof','furniture','erase'];
export const AIM_REACH = 7;
export const buildMenuOpen = { current:false };
export function cycleTool(tool: Tool, direction: number): Tool {
  const i = QUICK_TOOLS.indexOf(tool);
  return QUICK_TOOLS[(i + (direction > 0 ? 1 : -1) + QUICK_TOOLS.length) % QUICK_TOOLS.length];
}
type Preferences = { sensitivity: number; invertY: boolean; aimBuild: boolean };
const DEFAULTS: Preferences = { sensitivity: 1, invertY: false, aimBuild: true };
function saved(): Preferences {
  try {
    const value = JSON.parse(localStorage.getItem('open-world:controls:v1') ?? '{}');
    return { sensitivity: Number.isFinite(value.sensitivity) ? Math.max(.3, Math.min(2, value.sensitivity)) : 1,
      invertY: value.invertY === true, aimBuild: value.aimBuild !== false };
  } catch { return DEFAULTS; }
}
export const useControls = create<Preferences & { update: (p: Partial<Preferences>) => void }>(set => ({
  ...saved(), update: p => set(p),
}));
useControls.subscribe(s => { try { localStorage.setItem('open-world:controls:v1', JSON.stringify(s)); } catch { /* 操作は続ける */ } });

export const aimActions = { place: () => {}, cancel: () => {}, rotate: () => {} };
export const useAim = create<{ label: string; valid: boolean; range: boolean; target:PartRef|null }>(() => ({ label: '', valid: false, range: false, target:null }));
