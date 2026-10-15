// ドアの開け閉め（歩きモードの遊びの状態。セーブはしない）
import { create } from 'zustand';

interface DoorsState {
  /** 開いているドア：値は扉が開いていく側（壁のローカル +Z 側なら 1、-Z 側なら -1） */
  open: Record<string, 1 | -1>;
  /** いま近くにあって操作できるドア */
  target: string | null;
  toggle: (id: string, dir: 1 | -1) => boolean;
  setTarget: (id: string | null) => void;
  closeAll: () => void;
}

export const useDoors = create<DoorsState>((set, get) => ({
  open: {},
  target: null,
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
  closeAll: () => set({ open: {}, target: null }),
}));

export const isDoorOpen = (id: string) => id in useDoors.getState().open;
