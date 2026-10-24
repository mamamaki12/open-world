// パーツ共通の操作：選択ツールでクリックすると選択、削除ツールでクリックすると削除
// （削除ツールの「まとめて選んで消す」では、クリックで選ぶ／外すだけ）
import { useContext, useState } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import type { PartRef } from '../../building/types';
import { useAim } from '../../state/controls';
import { aimBuilding } from '../aimMode';
import { useGame } from '../../state/store';
import { useInteraction } from '../../state/interaction';
import type { Highlight } from '../materials';
import { HouseScope } from '../HouseScope';
import { beginPartDrag } from '../partDrag';
import { selectionGroup } from '../../building/groups';

/** カメラを回したドラッグの終わりをクリックと見なさないための閾値（px） */
const CLICK_SLOP = 5;

export function usePart(ref: PartRef) {
  const scope = useContext(HouseScope);
  const tool = useGame((s) => s.tool);
  const walking = useGame((s) => s.mode === 'walk');
  const selected = useGame((s) => ref.kind === 'furniture' && !scope.activate && !!s.selection && selectionGroup(s.house, s.selection, s.groupSelection, s.marked).some(r => r.kind === ref.kind && r.id === ref.id));
  const marked = useGame((s) => !scope.activate && s.marked.some((m) => m.kind === ref.kind && m.id === ref.id));
  const aimed = useAim(s => !scope.activate && s.target?.kind === ref.kind && s.target.id === ref.id);
  const [hover, setHover] = useState(false);
  // 歩きモードでは選択はせず、削除ツールだけ効く
  const interactive = scope.activate ? !walking : tool === 'erase' || !walking && tool === 'select' && ref.kind === 'furniture' && selected;

  const highlight: Highlight = marked ? (tool === 'erase' ? 'erase' : 'selected') : selected ? 'selected' : (aimed || hover && interactive) ? (tool === 'erase' ? 'erase' : 'hover') : 'none';

  const handlers = interactive
    ? {
        onPointerDown: (e: ThreeEvent<PointerEvent>) => {
          if (e.button !== 0) return;
          if (scope.activate) { e.stopPropagation(); scope.activate(e, ref); return; }
          if (useGame.getState().tool !== 'select') return;
          e.stopPropagation();
          beginPartDrag(ref, e.ray, e.clientX, e.clientY);
        },
        onClick: (e: ThreeEvent<MouseEvent>) => {
          if (aimBuilding()) return;
          e.stopPropagation();
          if (scope.activate) return;
          if (Date.now() < useInteraction.getState().ignorePartClickUntil) return;
          if (e.delta > CLICK_SLOP) return;
          const s = useGame.getState();
          if (s.tool === 'erase' && s.eraseMulti) {
            s.toggleMark(ref);
          } else if (s.tool === 'erase') {
            s.eraseOne(ref);
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

  return { highlight, handlers: { ...handlers, userData: { partRef: ref } }, selected };
}

