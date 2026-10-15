// 素材とサッシの見本画像。3Dと同じ模様の絵に色を掛けて、小さな画像（data URL）にする。
import { getMaterial, getSashType } from '../catalog';
import { patternCanvas, patternMeters } from '../world/textures';

/** 見本1枚が表す実寸（m）。模様の大きさが実物どうしで比べられるように全素材で同じにする */
const VIEW_METERS = 1.2;

const cache = new Map<string, string>();

function makeCanvas(px: number) {
  const c = document.createElement('canvas');
  c.width = px;
  c.height = px;
  return { c, g: c.getContext('2d')! };
}

/** 模様を実寸どおりに敷き詰めて、色を掛ける */
function paintMaterial(g: CanvasRenderingContext2D, px: number, materialId: string, color: string) {
  const def = getMaterial(materialId);
  const src = patternCanvas(def.pattern);
  const [mw, mh] = patternMeters(def.pattern);
  const tw = (px * mw) / VIEW_METERS;
  const th = (px * mh) / VIEW_METERS;
  for (let y = 0; y < px; y += th) for (let x = 0; x < px; x += tw) g.drawImage(src, x, y, tw, th);
  g.globalCompositeOperation = 'multiply';
  g.fillStyle = color;
  g.fillRect(0, 0, px, px);
  g.globalCompositeOperation = 'source-over';
  // 金属やつやのある素材は、斜めの光の反射を足す
  const shine = Math.max(def.metalness * 0.45, (0.4 - def.roughness) * 0.8);
  if (shine > 0) {
    const grad = g.createLinearGradient(0, 0, px, px);
    grad.addColorStop(0, `rgba(255,255,255,0)`);
    grad.addColorStop(0.4, `rgba(255,255,255,${shine})`);
    grad.addColorStop(0.55, `rgba(255,255,255,0)`);
    g.fillStyle = grad;
    g.fillRect(0, 0, px, px);
  }
  // 上から光が当たっているように、下を少し暗くする
  const shade = g.createLinearGradient(0, 0, 0, px);
  shade.addColorStop(0, 'rgba(255,255,255,0.08)');
  shade.addColorStop(1, 'rgba(0,0,0,0.12)');
  g.fillStyle = shade;
  g.fillRect(0, 0, px, px);
}

/** 素材の見本（正方形の画像） */
export function materialThumb(materialId: string, color: string, px = 96): string {
  const key = `m|${materialId}|${color}|${px}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const { c, g } = makeCanvas(px);
  paintMaterial(g, px, materialId, color);
  const url = c.toDataURL();
  cache.set(key, url);
  return url;
}

/** サッシの見本：引き違い窓を正面から見た絵 */
export function sashThumb(sashId: string, color: string, px = 96): string {
  const key = `s|${sashId}|${color}|${px}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const def = getSashType(sashId);
  const { c, g } = makeCanvas(px);
  // 枠の素材（木製は木目、それ以外は無地）
  const frame = makeCanvas(px);
  if (def.material) paintMaterial(frame.g, px, def.material, color);
  else {
    frame.g.fillStyle = color;
    frame.g.fillRect(0, 0, px, px);
    if (def.metalness > 0.3) {
      const grad = frame.g.createLinearGradient(0, 0, px, px);
      grad.addColorStop(0, 'rgba(255,255,255,0)');
      grad.addColorStop(0.45, 'rgba(255,255,255,0.35)');
      grad.addColorStop(0.6, 'rgba(255,255,255,0)');
      frame.g.fillStyle = grad;
      frame.g.fillRect(0, 0, px, px);
    }
  }
  // 背景はガラスごしの空
  const sky = g.createLinearGradient(0, 0, 0, px);
  sky.addColorStop(0, '#cfe3f2');
  sky.addColorStop(1, '#9fbfd6');
  g.fillStyle = sky;
  g.fillRect(0, 0, px, px);
  // 樹脂・木製は枠が太い
  const t = px * (def.metalness > 0.3 ? 0.07 : def.metalness > 0 ? 0.09 : 0.12);
  const inset = px * 0.08;
  g.save();
  g.beginPath();
  g.rect(inset, inset, px - inset * 2, px - inset * 2); // 外枠
  g.rect(inset + t, inset + t, (px - inset * 2) / 2 - t * 1.5, px - inset * 2 - t * 2); // 左のガラス（逆回りで穴にする）
  g.rect(px / 2 + t / 2, inset + t, (px - inset * 2) / 2 - t * 1.5, px - inset * 2 - t * 2); // 右のガラス
  g.clip('evenodd');
  g.drawImage(frame.c, 0, 0);
  g.restore();
  // ガラスの枚数を線で見せる（トリプル・ペア）
  g.strokeStyle = 'rgba(255,255,255,0.7)';
  g.lineWidth = Math.max(1, px / 64);
  const panes = def.id === 'resin-triple' ? 3 : 2;
  for (let i = 0; i < panes; i++) {
    const d = px * 0.18 + i * px * 0.05;
    g.beginPath();
    g.moveTo(inset + t + d * 0.6, inset + t + d);
    g.lineTo(inset + t + d * 0.6 + px * 0.12, inset + t + d - px * 0.12);
    g.stroke();
  }
  const url = c.toDataURL();
  cache.set(key, url);
  return url;
}
