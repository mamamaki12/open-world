// 写真モード：画面の表示を消して景色だけにし、時間帯・天気を自分の画面だけ変えて撮る
import { create } from 'zustand';
import type { Weather } from '../world/climate';

interface PhotoState {
  on: boolean;
  /** 自分の画面だけの時刻（0〜24）。null はいまの時刻 */
  hour: number | null;
  weather: Weather | null;
  set: (patch: Partial<Pick<PhotoState, 'on' | 'hour' | 'weather'>>) => void;
}

export const usePhoto = create<PhotoState>((set) => ({
  on: false, hour: null, weather: null,
  set: (patch) => set(patch.on === false ? { on: false, hour: null, weather: null } : patch),
}));
