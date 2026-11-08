// 画質（高・中・低）。端末ごとに localStorage に保存する。低は描画の負荷を下げる
import { create } from 'zustand';
import { isTouchDevice } from '../ui/useTouchDevice';

export type GraphicsQuality = 'high' | 'medium' | 'low';
export const GRAPHICS_LABEL: Record<GraphicsQuality, string> = { high: '高', medium: '中', low: '低' };
const KEY = 'open-world:graphics';

export interface GraphicsSettings {
  /** 描画の解像度（画面の画素に対する倍率） */
  dpr: number | [number, number];
  /** 太陽の影の解像度。0 なら影を描かない */
  shadowSize: number;
  /** 映り込みの解像度 */
  envResolution: number;
  /** 細かい建物を描く距離（'pc' が遠く、'low' がいちばん近い） */
  lod: 'pc' | 'mobile' | 'low';
  /** 家具の照明を同時に灯す数 */
  lights: number;
  /** 雨・雪の粒の割合 */
  precipitation: number;
  /** 1秒あたりのフレーム数の上限（0 は上限なし） */
  maxFps: number;
}

export const GRAPHICS: Record<GraphicsQuality, GraphicsSettings> = {
  high: { dpr: [1, 2], shadowSize: 2048, envResolution: 256, lod: 'pc', lights: 6, precipitation: 1, maxFps: 0 },
  medium: { dpr: [1, 1.5], shadowSize: 1024, envResolution: 128, lod: 'mobile', lights: 3, precipitation: 0.5, maxFps: 0 },
  low: { dpr: 0.75, shadowSize: 0, envResolution: 64, lod: 'low', lights: 1, precipitation: 0.25, maxFps: 30 },
};

/** 初期値：今までと同じ見た目（PC＝高、スマホ＝中） */
export function defaultQuality(): GraphicsQuality {
  return isTouchDevice() ? 'medium' : 'high';
}

function load(): GraphicsQuality {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'high' || v === 'medium' || v === 'low') return v;
  } catch { /* 保存できない環境でも遊べる */ }
  return defaultQuality();
}

export const useGraphics = create<{ quality: GraphicsQuality; setQuality: (q: GraphicsQuality) => void }>((set) => ({
  quality: load(),
  setQuality: (quality) => {
    try { localStorage.setItem(KEY, quality); } catch { /* 保存できなくても今回は変える */ }
    set({ quality });
  },
}));

export function useGraphicsSettings(): GraphicsSettings {
  return GRAPHICS[useGraphics((s) => s.quality)];
}
