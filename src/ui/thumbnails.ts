// 素材とサッシの見本画像。3Dと同じ模様の絵に色を掛けて、小さな画像（data URL）にする。
import { getMaterial, getSashType } from '../catalog';
import type { FurnitureDef } from '../catalog';
import { PAINT } from '../catalog/paints';
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

/** 色を明るく（f>0）・暗く（f<0）する */
function shadeHex(hex: string, f: number) {
  const n = parseInt(hex.slice(1, 7).padEnd(6, '0'), 16);
  const ch = (v: number) => Math.round(f >= 0 ? v + (255 - v) * f : v * (1 + f));
  return `rgb(${ch((n >> 16) & 255)},${ch((n >> 8) & 255)},${ch(n & 255)})`;
}

/**
 * 家具の見本：部品（箱・円柱・球）を、斜め上の手前から見た絵にする（建築メニューの家具の一覧で使う）。
 * 奥の部品から順に、正面・上・右の面を描く。
 */
export function furnitureThumb(def: FurnitureDef, px = 96): string {
  const color = def.colors[0] ?? '#cccccc';
  const key = `f|${def.id}|${color}|${def.parts.length}|${px}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const { c, g } = makeCanvas(px);
  const K = 0.42; // 奥行きを右上へずらす量
  const proj = (x: number, y: number, z: number) => [x - z * K, y - z * K] as const; // +Z が手前
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of def.parts) {
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
      const [X, Y] = proj(p.pos[0] + (sx * p.size[0]) / 2, p.pos[1] + (sy * p.size[1]) / 2, p.pos[2] + (sz * p.size[2]) / 2);
      minX = Math.min(minX, X); maxX = Math.max(maxX, X); minY = Math.min(minY, Y); maxY = Math.max(maxY, Y);
    }
  }
  const scale = (px * 0.86) / Math.max(maxX - minX, maxY - minY, 0.01);
  const ox = px / 2 - ((minX + maxX) / 2) * scale, oy = px / 2 + ((minY + maxY) / 2) * scale;
  const pt = (x: number, y: number, z: number) => { const [X, Y] = proj(x, y, z); return [ox + X * scale, oy - Y * scale] as const; };
  const poly = (pts: (readonly [number, number])[], fill: string) => {
    g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath();
    g.fillStyle = fill; g.fill(); g.strokeStyle = 'rgba(41,57,47,0.55)'; g.lineWidth = Math.max(0.6, px / 120); g.stroke();
  };
  // 奥（z が小さい）・下の部品から描く
  const parts = [...def.parts].sort((a, b) => (a.pos[2] + a.size[2] / 2) - (b.pos[2] + b.size[2] / 2) || a.pos[1] - b.pos[1]);
  for (const p of parts) {
    const base = p.glow ? '#ffe7b0' : p.paint === 'main' ? color : PAINT[p.paint].color;
    const [x0, x1] = [p.pos[0] - p.size[0] / 2, p.pos[0] + p.size[0] / 2];
    const [y0, y1] = [p.pos[1] - p.size[1] / 2, p.pos[1] + p.size[1] / 2];
    const [z0, z1] = [p.pos[2] - p.size[2] / 2, p.pos[2] + p.size[2] / 2];
    if (p.shape === 'sphere') {
      const [cx, cy] = pt(p.pos[0], p.pos[1], p.pos[2]);
      const r = (Math.max(p.size[0], p.size[1]) / 2) * scale;
      const grad = g.createRadialGradient(cx - r * 0.35, cy - r * 0.35, r * 0.1, cx, cy, r);
      grad.addColorStop(0, shadeHex(base, 0.35)); grad.addColorStop(1, shadeHex(base, -0.2));
      g.beginPath(); g.arc(cx, cy, Math.max(r, 0.5), 0, Math.PI * 2); g.fillStyle = grad; g.fill();
      g.strokeStyle = 'rgba(41,57,47,0.55)'; g.lineWidth = Math.max(0.6, px / 120); g.stroke();
      continue;
    }
    poly([pt(x0, y1, z1), pt(x1, y1, z1), pt(x1, y1, z0), pt(x0, y1, z0)], shadeHex(base, 0.25)); // 上
    poly([pt(x1, y0, z1), pt(x1, y0, z0), pt(x1, y1, z0), pt(x1, y1, z1)], shadeHex(base, -0.22)); // 右
    poly([pt(x0, y0, z1), pt(x1, y0, z1), pt(x1, y1, z1), pt(x0, y1, z1)], base); // 正面
  }
  const url = c.toDataURL();
  cache.set(key, url);
  return url;
}
