// スマホで壁・床・屋根をなぞっている間、指で隠れる大きさを画面の上に出す
import { useEffect, useState } from 'react';
import { GRID } from '../building/dimensions';
import { useInteraction, type Preview } from '../state/interaction';

const m = (cells: number) => `${(cells * GRID).toFixed(2)}m`;

/** なぞっている形の大きさを文字にする。大きさが無い（なぞり始め）ときは null */
export function measureText(p: Preview): string | null {
  if (p.kind === 'wall') {
    const cells = Math.abs(p.x1 - p.x0) + Math.abs(p.z1 - p.z0);
    return cells ? `長さ ${m(cells)}` : null;
  }
  if (p.kind === 'rect' && p.tool !== 'erase') {
    const w = p.rect.x1 - p.rect.x0, d = p.rect.z1 - p.rect.z0;
    // 910mm のマス2つで1畳
    const tatami = p.tool === 'floor' ? `（${Math.round(w * d) / 2}畳）` : '';
    return `${m(w)} × ${m(d)}${tatami}`;
  }
  return null;
}

export function DragMeasure() {
  const preview = useInteraction((s) => s.preview);
  const [down, setDown] = useState(false);
  useEffect(() => {
    const start = (e: PointerEvent) => { if (e.pointerType === 'touch' && e.target instanceof HTMLCanvasElement) setDown(true); };
    const end = (e: PointerEvent) => { if (e.pointerType === 'touch') setDown(false); };
    document.addEventListener('pointerdown', start, true);
    document.addEventListener('pointerup', end, true);
    document.addEventListener('pointercancel', end, true);
    return () => {
      document.removeEventListener('pointerdown', start, true);
      document.removeEventListener('pointerup', end, true);
      document.removeEventListener('pointercancel', end, true);
    };
  }, []);
  const text = down && preview ? measureText(preview) : null;
  if (!text || !preview) return null;
  const valid = 'valid' in preview ? preview.valid : true;
  return (
    <div className={`drag-measure${valid ? '' : ' invalid'}`} role="status">
      {text}{!valid && <small>ここには置けません</small>}
    </div>
  );
}
