// パーツ共通の操作：選択ツールでクリックすると選択、削除ツールでクリックすると削除
// （削除ツールの「まとめて選んで消す」では、クリックで選ぶ／外すだけ）
import { useState } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { removePart } from '../../building/rules';
import type { PartRef } from '../../building/types';
import { useGame } from '../../state/store';
import { useInteraction } from '../../state/interaction';
import type { Highlight } from '../materials';

/** カメラを回したドラッグの終わりをクリックと見なさないための閾値（px） */
const CLICK_SLOP = 5;

export function usePart(ref: PartRef) {
  const tool = useGame((s) => s.tool);
  const walking = useGame((s) => s.mode === 'walk');
  const selected = useGame((s) => s.selection?.kind === ref.kind && s.selection.id === ref.id);
  const marked = useGame((s) => s.marked.some((m) => m.kind === ref.kind && m.id === ref.id));
  const [hover, setHover] = useState(false);
  // 歩きモードでは選択はせず、削除ツールだけ効く
  const interactive = walking ? tool === 'erase' : tool === 'select' || tool === 'erase';

  const highlight: Highlight = marked ? 'erase' : selected ? 'selected' : hover && interactive ? (tool === 'erase' ? 'erase' : 'hover') : 'none';

  const handlers = interactive
    ? {
        onClick: (e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          if (Date.now() < useInteraction.getState().ignorePartClickUntil) return;
          if (e.delta > CLICK_SLOP) return;
          const s = useGame.getState();
          if (s.tool === 'erase' && s.eraseMulti) {
            s.toggleMark(ref);
          } else if (s.tool === 'erase') {
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

