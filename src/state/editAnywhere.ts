// 自分の土地以外でも建てる：狙った場所がどの区画かを調べ、その土地を編集先に切り替える
import { GRID, LOT_D } from '../building/dimensions';
import { TOWN_HOUSE_PLOTS } from '../building/townHouses';
import { FIRST_PLOT, LAST_PLOT, plotX, plotZ } from '../economy/town';
import { currentPlotOf, lotCells, originShift, useEconomy } from './economy';
import { activateOwnedHouse, claimTownHouse, editBlocked } from './ownedEditing';

export type EditTarget =
  | { kind: 'current' }
  | { kind: 'lot'; id: string; name: string }
  | { kind: 'plot'; plot: number; town: boolean }
  | { kind: 'blocked'; reason: string };

/** いまの土地の座標（m）の点が、どの区画の上か */
export function editTargetAt(x: number, z: number, s = useEconomy.getState()): EditTarget {
  const here = currentPlotOf(s), wx = x + plotX(here), wz = z + plotZ(here);
  const inside = (plot: number, w: number) => wx >= plotX(plot) - 0.5 && wx <= plotX(plot) + w * GRID + 0.5 && wz >= plotZ(plot) - 0.5 && wz <= plotZ(plot) + LOT_D * GRID + 0.5;
  for (const l of s.lots) {
    if (typeof l.plot !== 'number' || !inside(l.plot, lotCells(l).w)) continue;
    if (l.id === s.currentLotId) return { kind: 'current' };
    const blocked = editBlocked(l.id);
    return blocked ? { kind: 'blocked', reason: blocked } : { kind: 'lot', id: l.id, name: l.name.replace(/（.*）$/, '') };
  }
  for (let plot = FIRST_PLOT; plot <= LAST_PLOT; plot++) {
    if (!inside(plot, lotCells(null).w)) continue;
    if (s.offers.some((o) => o.plot === plot)) return { kind: 'blocked', reason: '売地は買うと建てられます' };
    return { kind: 'plot', plot, town: !!TOWN_HOUSE_PLOTS[plot] };
  }
  return { kind: 'blocked', reason: '道路や広場には建てられません' };
}

/** その区画の名前（照準の下に出す） */
export function targetLabel(t: EditTarget): string {
  if (t.kind === 'lot') return `${t.name}に置く`;
  if (t.kind === 'plot') return t.town ? '町の家に置く' : 'みんなの土地に置く';
  return t.kind === 'blocked' ? t.reason : '';
}

/**
 * 狙った区画を編集先にする。切り替えたら人とカメラを同じ場所が見えるようにずらし、onReady を呼ぶ。
 * 戻り値はできない理由（できるときは null）
 */
export function switchEditTarget(t: EditTarget, onReady: () => void): string | null {
  if (t.kind === 'current') { onReady(); return null; }
  if (t.kind === 'blocked') return t.reason;
  const focus = (id: string) => {
    const offset = activateOwnedHouse(id);
    if (!offset) return;
    originShift.listener?.(-offset.x, -offset.z);
    onReady();
  };
  if (t.kind === 'lot') { focus(t.id); return null; }
  return claimTownHouse(t.plot, focus);
}
