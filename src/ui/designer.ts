import type { FurnitureDef } from '../catalog';
import { newDesignId, TEMPLATES, useDesigner, useDesigns } from '../catalog/designs';
import { useGame } from '../state/store';

/** 開く処理だけをUIへ置き、サーバーが使うデザイン計算に画面storeを持ち込まない。 */
export function openDesigner(from?: FurnitureDef) {
  const mine = from && useDesigns.getState().designs.some(d => d.id === from.id);
  const base = from ?? { ...TEMPLATES[1].def, id: '' };
  useDesigner.setState({ draft: JSON.parse(JSON.stringify({ ...base, id: mine ? from!.id : newDesignId() })) });
  useGame.getState().setOverlay('designer');
}
