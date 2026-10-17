// 選択ツールで建てたパーツを長押しすると、その1ブロックだけ消す（スマホは指、PCはマウスの押しっぱなし）
import { removePart } from '../building/rules';
import type { PartRef } from '../building/types';
import { useGame } from '../state/store';
import { useInteraction } from '../state/interaction';

export const LONG_PRESS_MS = 500;
/** これ以上指が動いたら、長押しではなくドラッグ・見回しと見なす（px） */
const SLOP = 8;

let stop: (() => void) | null = null;

export function startPartLongPress(ref: PartRef, x: number, y: number) {
  stop?.();
  const cancel = () => {
    clearTimeout(timer);
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', cancel);
    window.removeEventListener('pointercancel', cancel);
    if (stop === cancel) stop = null;
  };
  const onMove = (e: PointerEvent) => { if (Math.hypot(e.clientX - x, e.clientY - y) > SLOP) cancel(); };
  const timer = setTimeout(() => {
    cancel();
    const game = useGame.getState();
    // 押した瞬間に始まった移動ドラッグは取り消してから消す
    const ui = useInteraction.getState();
    if (ui.buildingDrag || ui.furnitureDrag) {
      if (game.dragBase) game.dragTo(game.dragBase);
      useInteraction.setState({ buildingDrag: null, furnitureDrag: null });
      game.endDrag();
    }
    const s = useGame.getState();
    s.commit(removePart(s.house, ref));
    s.select(null);
    // 指・ボタンを離したときのクリックで、後ろのパーツを選ばないようにする（canvas より先に受ける）
    const block = () => useInteraction.setState({ ignorePartClickUntil: Date.now() + 300 });
    block();
    window.addEventListener('pointerup', block, { capture: true, once: true });
    navigator.vibrate?.(30);
  }, LONG_PRESS_MS);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', cancel);
  window.addEventListener('pointercancel', cancel);
  stop = cancel;
}
