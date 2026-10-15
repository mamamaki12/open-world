// カジノの3Dで使う絵（キャンバスに描いてテクスチャにする）。同じ絵は作り直さずに使い回す
import * as THREE from 'three';
import { WHEEL_ORDER, cardName, rouletteColor } from '../../../economy/casino';
import type { SlotSymbol } from '../../../economy/casino';

const cache = new Map<string, THREE.CanvasTexture>();

export function canvasTexture(key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  cache.set(key, t);
  return t;
}

const SERIF = 'Georgia, "Times New Roman", serif';

/** 1つの絵柄を、(0,0) を中心に size の大きさで描く */
function drawSymbol(g: CanvasRenderingContext2D, s: SlotSymbol, size: number) {
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  if (s === 'seven') {
    g.font = `900 ${size * 0.95}px ${SERIF}`;
    g.lineWidth = size * 0.06;
    g.strokeStyle = '#5e0008';
    g.strokeText('7', 0, size * 0.04);
    const grad = g.createLinearGradient(0, -size / 2, 0, size / 2);
    grad.addColorStop(0, '#ff5a5a');
    grad.addColorStop(1, '#b0000f');
    g.fillStyle = grad;
    g.fillText('7', 0, size * 0.04);
  } else if (s === 'bar') {
    const w = size * 0.95;
    const h = size * 0.42;
    g.fillStyle = '#111';
    g.beginPath();
    g.roundRect(-w / 2, -h / 2, w, h, h * 0.2);
    g.fill();
    g.fillStyle = '#fff';
    g.font = `900 ${h * 0.72}px ${SERIF}`;
    g.fillText('BAR', 0, h * 0.04);
  } else {
    // 絵文字は端末によって出なかったり薄くなったりするので、果物とベルは自分で描く
    g.save();
    g.globalAlpha = 1;
    g.scale(size / 100, size / 100);
    DRAW_FRUIT[s](g);
    g.restore();
  }
}

/** 縁取り付きで塗る */
function paint(g: CanvasRenderingContext2D, fill: string | CanvasGradient, stroke = '#2a1408', width = 3) {
  g.fillStyle = fill;
  g.fill();
  g.lineWidth = width;
  g.strokeStyle = stroke;
  g.stroke();
}

function shine(g: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rot = -0.6) {
  g.beginPath();
  g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  g.fillStyle = 'rgba(255,255,255,0.7)';
  g.fill();
}

/** 100×100 の枠（中心が 0,0）に描く */
const DRAW_FRUIT: Record<'bell' | 'melon' | 'cherry' | 'lemon', (g: CanvasRenderingContext2D) => void> = {
  bell(g) {
    const grad = g.createLinearGradient(-40, 0, 40, 0);
    grad.addColorStop(0, '#c98a00');
    grad.addColorStop(0.35, '#ffe46b');
    grad.addColorStop(1, '#b07400');
    // 上のつまみ
    g.beginPath();
    g.arc(0, -40, 7, 0, Math.PI * 2);
    paint(g, grad);
    // 本体（すそが広がった形）
    g.beginPath();
    g.moveTo(0, -36);
    g.bezierCurveTo(-26, -36, -28, -10, -30, 10);
    g.quadraticCurveTo(-32, 24, -42, 28);
    g.lineTo(42, 28);
    g.quadraticCurveTo(32, 24, 30, 10);
    g.bezierCurveTo(28, -10, 26, -36, 0, -36);
    g.closePath();
    paint(g, grad);
    // 下のふちと、中の玉
    g.beginPath();
    g.roundRect(-44, 26, 88, 9, 4);
    paint(g, grad);
    g.beginPath();
    g.arc(0, 40, 8, 0, Math.PI * 2);
    paint(g, '#8a5a00');
    shine(g, -14, -14, 5, 14, 0.25);
  },
  melon(g) {
    // スイカの切り口（半月）
    g.beginPath();
    g.moveTo(-46, -12);
    g.arc(0, -12, 46, 0, Math.PI, false);
    g.closePath();
    paint(g, '#1f8a2e');
    g.beginPath();
    g.moveTo(-40, -12);
    g.arc(0, -12, 40, 0, Math.PI, false);
    g.closePath();
    g.fillStyle = '#e9f5d0';
    g.fill();
    g.beginPath();
    g.moveTo(-35, -12);
    g.arc(0, -12, 35, 0, Math.PI, false);
    g.closePath();
    g.fillStyle = '#ec2f45';
    g.fill();
    // 種
    g.fillStyle = '#1a1010';
    for (const [x, y] of [[-20, -2], [-6, 6], [8, 6], [22, -2], [-12, 14], [2, 18], [14, 13]]) {
      g.beginPath();
      g.ellipse(x, y, 2.6, 4.2, x * 0.02, 0, Math.PI * 2);
      g.fill();
    }
    // 皮のしま模様
    g.strokeStyle = '#0d5a1a';
    g.lineWidth = 2.5;
    for (let a = 0.35; a < Math.PI; a += 0.42) {
      g.beginPath();
      g.moveTo(Math.cos(a) * 40, -12 + Math.sin(a) * 40);
      g.lineTo(Math.cos(a) * 46, -12 + Math.sin(a) * 46);
      g.stroke();
    }
  },
  cherry(g) {
    // 茎と葉
    g.strokeStyle = '#3d6b12';
    g.lineWidth = 4;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(-20, 16);
    g.quadraticCurveTo(-12, -20, 8, -40);
    g.moveTo(22, 20);
    g.quadraticCurveTo(18, -14, 8, -40);
    g.stroke();
    g.beginPath();
    g.ellipse(22, -38, 16, 7, -0.4, 0, Math.PI * 2);
    paint(g, '#4caf2a', '#245c10', 2.5);
    // 実（2つ）
    for (const [x, y] of [[-20, 24], [22, 28]]) {
      const grad = g.createRadialGradient(x - 6, y - 6, 2, x, y, 20);
      grad.addColorStop(0, '#ff6b7a');
      grad.addColorStop(1, '#a8001c');
      g.beginPath();
      g.arc(x, y, 18, 0, Math.PI * 2);
      paint(g, grad, '#4a0010');
      shine(g, x - 7, y - 7, 3.5, 6);
    }
  },
  lemon(g) {
    const grad = g.createRadialGradient(-10, -10, 4, 0, 0, 48);
    grad.addColorStop(0, '#fff59a');
    grad.addColorStop(1, '#e8b400');
    g.beginPath();
    g.moveTo(-46, 0);
    g.quadraticCurveTo(-42, -8, -36, -12);
    g.bezierCurveTo(-24, -34, 24, -34, 36, -12);
    g.quadraticCurveTo(42, -8, 46, 0);
    g.quadraticCurveTo(42, 8, 36, 12);
    g.bezierCurveTo(24, 34, -24, 34, -36, 12);
    g.quadraticCurveTo(-42, 8, -46, 0);
    g.closePath();
    paint(g, grad, '#8a6200');
    // 葉
    g.beginPath();
    g.ellipse(-30, -26, 12, 5, 0.6, 0, Math.PI * 2);
    paint(g, '#4caf2a', '#245c10', 2);
    shine(g, -14, -12, 6, 12, 1.1);
  },
};

/**
 * スロットのリールの帯。円柱の周りに巻くので、絵柄は90度回して横に並べる
 * （キャンバスの右 = リールの上、キャンバスの上 = リールの左）
 */
export function reelTexture(strip: SlotSymbol[], key: string) {
  const cell = 160;
  const tall = 220;
  return canvasTexture(`reel:${key}`, cell * strip.length, tall, (g) => {
    g.fillStyle = '#fbf8f0';
    g.fillRect(0, 0, cell * strip.length, tall);
    strip.forEach((s, i) => {
      g.save();
      g.translate(i * cell + cell / 2, tall / 2);
      g.rotate(Math.PI / 2);
      drawSymbol(g, s, cell * 0.92);
      g.restore();
    });
    // 絵柄の区切りの細い線
    g.fillStyle = 'rgba(0,0,0,0.06)';
    strip.forEach((_, i) => g.fillRect(i * cell, 0, 2, tall));
  });
}

/** 文字の看板（光らせる） */
export function signTexture(key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void) {
  return canvasTexture(`sign:${key}`, w, h, (g) => draw(g, w, h));
}

export function slotMarquee() {
  return signTexture('marquee', 1024, 256, (g, w, h) => {
    const bg = g.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#3a0610');
    bg.addColorStop(1, '#14020a');
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.shadowColor = '#ffb300';
    g.shadowBlur = 28;
    const grad = g.createLinearGradient(0, h * 0.2, 0, h * 0.8);
    grad.addColorStop(0, '#fff6c4');
    grad.addColorStop(0.5, '#ffcf4a');
    grad.addColorStop(1, '#c98a12');
    g.fillStyle = grad;
    g.font = `900 150px ${SERIF}`;
    g.fillText('MEGA 777', w / 2, h * 0.54);
  });
}

/** 払い戻し表（台の下の小さな表示） */
export function slotPayGlass() {
  return signTexture('paytable', 1024, 300, (g, w, h) => {
    g.fillStyle = '#120408';
    g.fillRect(0, 0, w, h);
    const rows: [SlotSymbol, string][] = [
      ['seven', '×1000'],
      ['bar', '×200'],
      ['bell', '×50'],
      ['melon', '×15'],
      ['lemon', '×4'],
      ['cherry', '左だけ ×1'],
    ];
    rows.forEach(([s, pay], i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = 40 + col * 330;
      const y = 80 + row * 140;
      const n = s === 'cherry' ? 1 : 3;
      for (let k = 0; k < n; k++) {
        g.save();
        g.translate(x + 40 + k * 70, y);
        g.fillStyle = '#fbf8f0';
        g.fillRect(-30, -32, 60, 64);
        drawSymbol(g, s, 52);
        g.restore();
      }
      g.fillStyle = '#ffd86b';
      g.font = `800 40px system-ui, sans-serif`;
      g.textAlign = 'left';
      g.fillText(pay, x + (n === 1 ? 90 : 230), y + 2);
    });
  });
}

/** ルーレットの盤面（上から見た絵）。中心が (0,0)、半径 150 の座標で描く */
export function wheelFaceTexture() {
  const size = 1024;
  return canvasTexture('wheel-face', size, size, (g) => {
    g.translate(size / 2, size / 2);
    g.scale(size / 300, size / 300);
    const POCKET = (Math.PI * 2) / 37;
    const ring = 128;
    const inner = 96;
    WHEEL_ORDER.forEach((n, i) => {
      // キャンバスの角度：上が 0、時計回り
      const a0 = i * POCKET - POCKET / 2 - Math.PI / 2;
      const a1 = a0 + POCKET;
      g.beginPath();
      g.arc(0, 0, ring, a0, a1);
      g.arc(0, 0, inner, a1, a0, true);
      g.closePath();
      const c = rouletteColor(n);
      g.fillStyle = c === 'red' ? '#b3121f' : c === 'black' ? '#141414' : '#13703a';
      g.fill();
      g.save();
      g.rotate(i * POCKET);
      g.fillStyle = '#fff';
      g.font = `700 10px system-ui, sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(String(n), 0, -117);
      g.restore();
    });
    // 数字の帯の内側：玉が落ちるポケットの底（少し暗い）
    g.beginPath();
    g.arc(0, 0, 108, 0, Math.PI * 2);
    g.arc(0, 0, inner, 0, Math.PI * 2, true);
    g.fillStyle = 'rgba(0,0,0,0.25)';
    g.fill();
    g.strokeStyle = '#d9b24c';
    g.lineWidth = 1.2;
    for (const r of [ring, 108, inner]) {
      g.beginPath();
      g.arc(0, 0, r, 0, Math.PI * 2);
      g.stroke();
    }
    // 真ん中の木の円すい部分
    const wood = g.createRadialGradient(0, 0, 10, 0, 0, inner);
    wood.addColorStop(0, '#8a5329');
    wood.addColorStop(0.7, '#6b3d1e');
    wood.addColorStop(1, '#3c2210');
    g.beginPath();
    g.arc(0, 0, inner - 1, 0, Math.PI * 2);
    g.fillStyle = wood;
    g.fill();
  });
}

/** 木目 */
export function woodTexture() {
  return canvasTexture('wood', 512, 512, (g) => {
    g.fillStyle = '#6b3d1e';
    g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 90; i++) {
      g.strokeStyle = `rgba(${30 + Math.random() * 40},${15 + Math.random() * 20},5,${0.15 + Math.random() * 0.25})`;
      g.lineWidth = 1 + Math.random() * 3;
      g.beginPath();
      const y = Math.random() * 512;
      g.moveTo(0, y);
      for (let x = 0; x <= 512; x += 32) g.lineTo(x, y + Math.sin(x / 60 + i) * 6);
      g.stroke();
    }
  });
}

/** 緑のフェルト（細かい毛羽のざらつき） */
export function feltTexture() {
  const t = canvasTexture('felt', 512, 512, (g) => {
    g.fillStyle = '#16603f';
    g.fillRect(0, 0, 512, 512);
    const img = g.getImageData(0, 0, 512, 512);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 18;
      img.data[i] += n;
      img.data[i + 1] += n;
      img.data[i + 2] += n;
    }
    g.putImageData(img, 0, 0);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 3);
  return t;
}

/** トランプの表 */
export function cardFaceTexture(rank: number, suit: string) {
  const W = 256;
  const H = 358;
  return canvasTexture(`card:${rank}${suit}`, W, H, (g) => {
    const red = suit === '♥' || suit === '♦';
    const ink = red ? '#c8102e' : '#161616';
    g.fillStyle = '#fdfcf8';
    g.beginPath();
    g.roundRect(0, 0, W, H, 18);
    g.fill();
    g.strokeStyle = '#d9d4c8';
    g.lineWidth = 3;
    g.stroke();
    const name = cardName(rank);
    g.fillStyle = ink;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const corner = () => {
      g.font = `700 44px ${SERIF}`;
      g.fillText(name, 30, 36);
      g.font = `34px ${SERIF}`;
      g.fillText(suit, 30, 76);
    };
    corner();
    g.save();
    g.translate(W, H);
    g.rotate(Math.PI);
    corner();
    g.restore();
    if (rank === 1) {
      g.font = `150px ${SERIF}`;
      g.fillText(suit, W / 2, H / 2 + 6);
    } else if (rank >= 11) {
      g.strokeStyle = ink;
      g.lineWidth = 3;
      g.strokeRect(58, 64, W - 116, H - 128);
      g.font = `110px ${SERIF}`;
      g.fillText(rank === 13 ? '♚' : rank === 12 ? '♛' : '♞', W / 2, H / 2 - 18);
      g.font = `700 54px ${SERIF}`;
      g.fillText(name, W / 2, H / 2 + 74);
    } else {
      // 数字札のマークの並び（本物と同じ置き方）
      const L = 80;
      const C = W / 2;
      const R = W - 80;
      const T = 76;
      const B = H - 76;
      const M = H / 2;
      const q1 = T + (B - T) / 3;
      const q3 = T + ((B - T) * 2) / 3;
      const layouts: Record<number, [number, number][]> = {
        2: [[C, T], [C, B]],
        3: [[C, T], [C, M], [C, B]],
        4: [[L, T], [R, T], [L, B], [R, B]],
        5: [[L, T], [R, T], [C, M], [L, B], [R, B]],
        6: [[L, T], [R, T], [L, M], [R, M], [L, B], [R, B]],
        7: [[L, T], [R, T], [C, (T + M) / 2], [L, M], [R, M], [L, B], [R, B]],
        8: [[L, T], [R, T], [C, (T + M) / 2], [L, M], [R, M], [C, (M + B) / 2], [L, B], [R, B]],
        9: [[L, T], [R, T], [L, q1], [R, q1], [C, M], [L, q3], [R, q3], [L, B], [R, B]],
        10: [[L, T], [R, T], [C, (T + q1) / 2], [L, q1], [R, q1], [L, q3], [R, q3], [C, (q3 + B) / 2], [L, B], [R, B]],
      };
      g.font = `52px ${SERIF}`;
      for (const [x, y] of layouts[rank]) {
        g.save();
        g.translate(x, y);
        if (y > M + 1) g.rotate(Math.PI);
        g.fillText(suit, 0, 0);
        g.restore();
      }
    }
  });
}

/** トランプの裏 */
export function cardBackTexture() {
  return canvasTexture('card-back', 256, 358, (g) => {
    g.fillStyle = '#fdfcf8';
    g.beginPath();
    g.roundRect(0, 0, 256, 358, 18);
    g.fill();
    g.fillStyle = '#9e0f1b';
    g.beginPath();
    g.roundRect(14, 14, 228, 330, 10);
    g.fill();
    g.save();
    g.beginPath();
    g.rect(14, 14, 228, 330);
    g.clip();
    g.strokeStyle = 'rgba(255,255,255,0.35)';
    g.lineWidth = 2;
    for (let i = -400; i < 400; i += 16) {
      g.beginPath();
      g.moveTo(14 + i, 14);
      g.lineTo(14 + i + 330, 344);
      g.moveTo(242 - i, 14);
      g.lineTo(242 - i - 330, 344);
      g.stroke();
    }
    g.restore();
    g.strokeStyle = '#fdfcf8';
    g.lineWidth = 6;
    g.strokeRect(14, 14, 228, 330);
  });
}
