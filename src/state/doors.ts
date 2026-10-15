// ドア・窓の開け閉め（歩きモードの遊びの状態。セーブはしない）
import { create } from 'zustand';

interface DoorsState {
  /** 開いているドア：値は扉が開いていく側（壁のローカル +Z 側なら 1、-Z 側なら -1） */
  open: Record<string, 1 | -1>;
  /** いま近くにあって操作できるドア・窓 */
  target: string | null;
  /** 近くの開いた窓から出られるか（'ok'）、出られない理由（狭い・高い）。窓でなければ null */
  climb: 'ok' | 'narrow' | 'high' | null;
  /** 窓を乗り越えている最中 */
  climbing: boolean;
  /** カジノの入口の前に立っている */
  atCasino: boolean;
  toggle: (id: string, dir: 1 | -1) => boolean;
  setTarget: (id: string | null) => void;
  setClimb: (climb: DoorsState['climb'], climbing: boolean) => void;
  setAtCasino: (v: boolean) => void;
  closeAll: () => void;
}

export const useDoors = create<DoorsState>((set, get) => ({
  open: {},
  target: null,
  climb: null,
  climbing: false,
  atCasino: false,
  toggle: (id, dir) => {
    const open = { ...get().open };
    const nowOpen = !(id in open);
    if (nowOpen) open[id] = dir;
    else delete open[id];
    set({ open });
    return nowOpen;
  },
  setTarget: (target) => {
    if (get().target !== target) set({ target });
  },
  setClimb: (climb, climbing) => {
    if (get().climb !== climb || get().climbing !== climbing) set({ climb, climbing });
  },
  setAtCasino: (atCasino) => {
    if (get().atCasino !== atCasino) set({ atCasino });
  },
  closeAll: () => set({ open: {}, target: null, climb: null, climbing: false, atCasino: false }),
}));

export const isDoorOpen = (id: string) => id in useDoors.getState().open;
