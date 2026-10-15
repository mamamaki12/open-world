// パーツ共通の操作：選択ツールでクリックすると選択、削除ツールでクリックすると削除
import { useState } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { removePart } from '../../building/rules';
import type { PartRef } from '../../building/types';
import { useGame } from '../../state/store';
import type { Highlight } from '../materials';

/** カメラを回したドラッグの終わりをクリックと見なさないための閾値（px） */
const CLICK_SLOP = 5;

export function usePart(ref: PartRef) {
  const tool = useGame((s) => s.tool);
  const selected = useGame((s) => s.selection?.kind === ref.kind && s.selection.id === ref.id);
  const [hover, setHover] = useState(false);
  const interactive = tool === 'select' || tool === 'erase';

  const highlight: Highlight = selected ? 'selected' : hover && interactive ? (tool === 'erase' ? 'erase' : 'hover') : 'none';

  const handlers = interactive
    ? {
        onClick: (e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          if (e.delta > CLICK_SLOP) return;
          const s = useGame.getState();
          if (s.tool === 'erase') {
            s.commit(removePart(s.house, ref));
            if (s.selection?.id === ref.id) s.select(null);
          } else {
            s.select(ref);
          }
        },
        onPointerOver: (e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          setHover(true);
        },
        onPointerOut: () => setHover(false),
      }
    : {};

  return { highlight, handlers, selected };
}
