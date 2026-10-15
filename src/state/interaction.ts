// 操作中だけの一時的な状態（配置のプレビュー、ドラッグ中の家具など）。セーブしない。
import { create } from 'zustand';
import type { Rect } from '../building/rules';

export type Preview =
  | { kind: 'rect'; rect: Rect; valid: boolean; tool: 'floor' | 'roof' }
  | { kind: 'wall'; x0: number; z0: number; x1: number; z1: number; valid: boolean }
  | { kind: 'stair'; x: number; z: number; valid: boolean }
  | { kind: 'furniture'; x: number; z: number }
  | { kind: 'opening'; wallId: string; offset: number; valid: boolean };

interface InteractionState {
  preview: Preview | null;
  /** 階段の向き（配置時） */
  stairRot: 0 | 1 | 2 | 3;
  /** ドラッグ中の家具と、つかんだ位置のずれ */
  furnitureDrag: { id: string; dx: number; dz: number } | null;
  setPreview: (p: Preview | null) => void;
  setStairRot: (r: 0 | 1 | 2 | 3) => void;
  setFurnitureDrag: (d: InteractionState['furnitureDrag']) => void;
}

export const useInteraction = create<InteractionState>((set, get) => ({
  preview: null,
  stairRot: 0,
  furnitureDrag: null,
  // 毎フレーム呼ばれても、中身が変わらなければ描き直さない
  setPreview: (preview) => {
    if (JSON.stringify(preview) !== JSON.stringify(get().preview)) set({ preview });
  },
  setStairRot: (stairRot) => set({ stairRot }),
  setFurnitureDrag: (furnitureDrag) => set({ furnitureDrag }),
}));
