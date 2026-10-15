// 素材の質感を出すテクスチャを、画像ファイルを使わずにその場で描いて作る。
// 白〜灰色で描き、素材の色を掛け合わせて使う。同じ絵を凹凸（バンプ）にも使う。
import * as THREE from 'three';
import type { Pattern } from '../catalog';

const SIZE = 512;

interface PatternSpec {
  /** テクスチャ1枚が表す実寸（m） */
  meters: [number, number];
  draw: (g: CanvasRenderingContext2D, rnd: () => number) => void;
}

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function fill(g: CanvasRenderingContext2D, v: number) {
  g.fillStyle = gray(v);
  g.fillRect(0, 0, SIZE, SIZE);
}

function gray(v: number, a = 1) {
  const c = Math.max(0, Math.min(255, Math.round(v)));
  return `rgba(${c},${c},${c},${a})`;
}

function noise(g: CanvasRenderingContext2D, rnd: () => number, amount: number, count = 9000, size = 2) {
  for (let i = 0; i < count; i++) {
    const v = 128 + (rnd() - 0.5) * 255;
    g.fillStyle = gray(v, amount);
    g.fillRect(rnd() * SIZE, rnd() * SIZE, size, size);
  }
}

function hline(g: CanvasRenderingContext2D, y: number, w: number, v: number) {
  g.fillStyle = gray(v);
  g.fillRect(0, y, SIZE, w);
}

function vline(g: CanvasRenderingContext2D, x: number, w: number, v: number) {
  g.fillStyle = gray(v);
  g.fillRect(x, 0, w, SIZE);
}

const PATTERNS: Record<Pattern, PatternSpec> = {
  // 横張りサイディング：板の継ぎ目と影
  siding: {
    meters: [1.82, 0.91],
    draw: (g, rnd) => {
      fill(g, 236);
      noise(g, rnd, 0.06);
      const rows = 4;
      for (let i = 0; i < rows; i++) {
        const y = (i * SIZE) / rows;
        const grad = g.createLinearGradient(0, y, 0, y + SIZE / rows);
        grad.addColorStop(0, gray(250, 0.5));
        grad.addColorStop(1, gray(200, 0.5));
        g.fillStyle = grad;
        g.fillRect(0, y, SIZE, SIZE / rows);
        hline(g, y, 4, 120);
      }
      vline(g, SIZE * 0.5, 2, 170);
    },
  },
  // タイル（レンガ積み）
  brick: {
    meters: [0.9, 0.6],
    draw: (g, rnd) => {
      fill(g, 165);
      const rows = 8;
      const cols = 4;
      const h = SIZE / rows;
      const w = SIZE / cols;
      for (let r = 0; r < rows; r++) {
        for (let c = -1; c < cols + 1; c++) {
          const x = c * w + (r % 2 ? w / 2 : 0);
          g.fillStyle = gray(215 + (rnd() - 0.5) * 50);
          g.fillRect(x + 3, r * h + 3, w - 6, h - 6);
        }
      }
      noise(g, rnd, 0.08);
    },
  },
  // 塗り壁：細かいムラ
  stucco: {
    meters: [1, 1],
    draw: (g, rnd) => {
      fill(g, 232);
      noise(g, rnd, 0.12, 20000, 3);
      noise(g, rnd, 0.05, 2000, 8);
    },
  },
  // 縦張りの板
  boardV: {
    meters: [1, 1],
    draw: (g, rnd) => {
      fill(g, 220);
      const n = 8;
      const w = SIZE / n;
      for (let i = 0; i < n; i++) {
        g.fillStyle = gray(200 + rnd() * 45);
        g.fillRect(i * w, 0, w, SIZE);
        for (let k = 0; k < 14; k++) {
          g.fillStyle = gray(150 + rnd() * 40, 0.25);
          g.fillRect(i * w + rnd() * w, 0, 1 + rnd() * 2, SIZE);
        }
        vline(g, i * w, 3, 90);
      }
    },
  },
  // 角波の金属板
  rib: {
    meters: [1, 1],
    draw: (g) => {
      const n = 5;
      const w = SIZE / n;
      for (let i = 0; i < n; i++) {
        const grad = g.createLinearGradient(i * w, 0, (i + 1) * w, 0);
        grad.addColorStop(0, gray(150));
        grad.addColorStop(0.15, gray(235));
        grad.addColorStop(0.35, gray(235));
        grad.addColorStop(0.5, gray(170));
        grad.addColorStop(1, gray(215));
        g.fillStyle = grad;
        g.fillRect(i * w, 0, w, SIZE);
      }
    },
  },
  // 布・クロス
  fabric: {
    meters: [0.5, 0.5],
    draw: (g, rnd) => {
      fill(g, 238);
      for (let i = 0; i < SIZE; i += 4) {
        hline(g, i, 1, 225);
        vline(g, i, 1, 228);
      }
      noise(g, rnd, 0.06);
    },
  },
  // 瓦：段ごとの影と丸み
  kawara: {
    meters: [1.2, 1.2],
    draw: (g) => {
      fill(g, 210);
      const rows = 4;
      const cols = 4;
      const h = SIZE / rows;
      const w = SIZE / cols;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const grad = g.createLinearGradient(c * w, 0, (c + 1) * w, 0);
          grad.addColorStop(0, gray(150));
          grad.addColorStop(0.35, gray(245));
          grad.addColorStop(0.7, gray(210));
          grad.addColorStop(1, gray(140));
          g.fillStyle = grad;
          g.fillRect(c * w, r * h, w, h);
        }
        const sh = g.createLinearGradient(0, r * h, 0, r * h + h * 0.25);
        sh.addColorStop(0, gray(60, 0.7));
        sh.addColorStop(1, gray(60, 0));
        g.fillStyle = sh;
        g.fillRect(0, r * h, SIZE, h * 0.25);
      }
    },
  },
  // スレート：段ずれの継ぎ目
  slate: {
    meters: [0.91, 0.91],
    draw: (g, rnd) => {
      fill(g, 215);
      const rows = 4;
      const h = SIZE / rows;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < 3; c++) {
          g.fillStyle = gray(200 + rnd() * 40);
          const x = c * (SIZE / 3) + (r % 2 ? SIZE / 6 : 0);
          g.fillRect(x, r * h, SIZE / 3, h);
          vline(g, x, 3, 110);
          if (x + SIZE / 3 > SIZE) g.fillRect(x - SIZE, r * h, SIZE / 3, h);
        }
        hline(g, r * h, 5, 90);
      }
      noise(g, rnd, 0.08);
    },
  },
  // 立平葺き：流れ方向の継ぎ目
  seam: {
    meters: [0.91, 0.91],
    draw: (g, rnd) => {
      fill(g, 225);
      noise(g, rnd, 0.03);
      for (let i = 0; i < 2; i++) {
        const x = (i * SIZE) / 2;
        vline(g, x, 4, 255);
        vline(g, x + 4, 3, 120);
      }
    },
  },
  // フローリング：幅の狭い板を乱尺で
  planks: {
    meters: [0.91, 0.91],
    draw: (g, rnd) => {
      fill(g, 210);
      const rows = 6;
      const h = SIZE / rows;
      for (let r = 0; r < rows; r++) {
        let x = -rnd() * SIZE * 0.6;
        while (x < SIZE) {
          const len = SIZE * (0.4 + rnd() * 0.7);
          g.fillStyle = gray(195 + rnd() * 55);
          g.fillRect(x, r * h, len, h);
          for (let k = 0; k < 10; k++) {
            g.fillStyle = gray(150 + rnd() * 40, 0.2);
            g.fillRect(x, r * h + rnd() * h, len, 1);
          }
          g.fillStyle = gray(110);
          g.fillRect(x, r * h, 2, h);
          x += len;
        }
        hline(g, r * h, 2, 110);
      }
    },
  },
  // 畳：い草の目と縁
  tatami: {
    meters: [1.82, 1.82],
    draw: (g, rnd) => {
      fill(g, 220);
      for (let y = 0; y < SIZE; y += 3) hline(g, y, 1, 195 + rnd() * 20);
      // 縁（1畳 = 0.91 × 1.82 を2枚並べた図柄）
      g.fillStyle = gray(80);
      g.fillRect(0, 0, SIZE, 10);
      g.fillRect(0, SIZE / 2 - 5, SIZE, 10);
      vline(g, 0, 3, 150);
      vline(g, SIZE / 2, 3, 150);
    },
  },
  tile: {
    meters: [0.6, 0.6],
    draw: (g, rnd) => {
      fill(g, 160);
      const n = 2;
      const w = SIZE / n;
      for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++) {
          g.fillStyle = gray(225 + (rnd() - 0.5) * 20);
          g.fillRect(i * w + 3, j * w + 3, w - 6, w - 6);
        }
      noise(g, rnd, 0.05);
    },
  },
  grain: {
    meters: [1, 1],
    draw: (g, rnd) => {
      fill(g, 215);
      for (let k = 0; k < 160; k++) {
        g.fillStyle = gray(160 + rnd() * 70, 0.35);
        const y = rnd() * SIZE;
        g.fillRect(0, y, SIZE, 1 + rnd() * 3);
      }
    },
  },
  // 縦張りの金属サイディング：細い縦の溝
  sidingV: {
    meters: [0.9, 0.9],
    draw: (g, rnd) => {
      fill(g, 228);
      noise(g, rnd, 0.03);
      const n = 4;
      for (let i = 0; i < n; i++) {
        const x = (i * SIZE) / n;
        const grad = g.createLinearGradient(x, 0, x + SIZE / n, 0);
        grad.addColorStop(0, gray(205));
        grad.addColorStop(0.5, gray(240));
        grad.addColorStop(1, gray(215));
        g.fillStyle = grad;
        g.fillRect(x, 0, SIZE / n, SIZE);
        vline(g, x, 6, 120);
        vline(g, x + SIZE / n / 2, 2, 190);
      }
    },
  },
  // 石積み：大きさのちがう石を段ごとに
  stone: {
    meters: [1.2, 1.2],
    draw: (g, rnd) => {
      fill(g, 120);
      let y = 0;
      while (y < SIZE) {
        const h = 40 + rnd() * 50;
        let x = -rnd() * 60;
        while (x < SIZE) {
          const w = 60 + rnd() * 110;
          g.fillStyle = gray(170 + rnd() * 75);
          g.beginPath();
          g.roundRect(x + 4, y + 4, w - 8, Math.min(h, SIZE - y) - 8, 8);
          g.fill();
          x += w;
        }
        y += h;
      }
      noise(g, rnd, 0.12, 14000, 3);
    },
  },
  // コンクリート打ち放し：型枠の継ぎ目とPコンの穴
  concrete: {
    meters: [1.8, 0.9],
    draw: (g, rnd) => {
      fill(g, 215);
      noise(g, rnd, 0.1, 16000, 3);
      noise(g, rnd, 0.06, 1500, 14);
      vline(g, 0, 2, 165);
      hline(g, 0, 2, 165);
      g.fillStyle = gray(120);
      for (const [fx, fy] of [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]]) {
        g.beginPath();
        g.arc(fx * SIZE, fy * SIZE, 9, 0, Math.PI * 2);
        g.fill();
      }
    },
  },
  // 下見板張り：横板が少しずつ重なって影ができる
  clapboard: {
    meters: [1.2, 0.9],
    draw: (g, rnd) => {
      fill(g, 220);
      const rows = 5;
      const h = SIZE / rows;
      for (let r = 0; r < rows; r++) {
        const grad = g.createLinearGradient(0, r * h, 0, (r + 1) * h);
        grad.addColorStop(0, gray(150));
        grad.addColorStop(0.18, gray(230));
        grad.addColorStop(1, gray(205));
        g.fillStyle = grad;
        g.fillRect(0, r * h, SIZE, h);
        for (let k = 0; k < 8; k++) {
          g.fillStyle = gray(150 + rnd() * 50, 0.25);
          g.fillRect(0, r * h + rnd() * h, SIZE, 1 + rnd() * 2);
        }
      }
    },
  },
  // ヘリンボーン：短い板をV字に
  herringbone: {
    meters: [0.6, 0.6],
    draw: (g, rnd) => {
      fill(g, 120);
      const u = SIZE / 8;
      for (let col = -2; col < 10; col++) {
        for (let k = -2; k < 10; k++) {
          const x = col * u;
          const y = k * u * 2 + (col % 2 ? u : 0);
          g.save();
          g.translate(x, y);
          g.transform(1, col % 2 ? -1 : 1, 0, 1, 0, 0);
          g.fillStyle = gray(185 + rnd() * 60);
          g.fillRect(1, 1, u - 2, u * 2 - 2);
          for (let s = 0; s < 4; s++) {
            g.fillStyle = gray(150 + rnd() * 40, 0.25);
            g.fillRect(1 + rnd() * (u - 2), 1, 1, u * 2 - 2);
          }
          g.restore();
        }
      }
    },
  },
  // 無垢の幅広フローリング：長い板と節
  wideplank: {
    meters: [1.82, 1.2],
    draw: (g, rnd) => {
      fill(g, 210);
      const rows = 4;
      const h = SIZE / rows;
      for (let r = 0; r < rows; r++) {
        let x = -rnd() * SIZE * 0.8;
        while (x < SIZE) {
          const len = SIZE * (0.7 + rnd() * 0.6);
          g.fillStyle = gray(185 + rnd() * 60);
          g.fillRect(x, r * h, len, h);
          for (let k = 0; k < 16; k++) {
            g.fillStyle = gray(140 + rnd() * 50, 0.22);
            g.fillRect(x, r * h + rnd() * h, len, 1 + rnd());
          }
          if (rnd() < 0.5) {
            g.fillStyle = gray(110, 0.6);
            g.beginPath();
            g.ellipse(x + rnd() * len, r * h + h / 2, 7, 4, 0, 0, Math.PI * 2);
            g.fill();
          }
          g.fillStyle = gray(100);
          g.fillRect(x, r * h, 2, h);
          x += len;
        }
        hline(g, r * h, 2, 100);
      }
    },
  },
  // 大理石：やわらかい筋
  marble: {
    meters: [0.8, 0.8],
    draw: (g, rnd) => {
      fill(g, 240);
      noise(g, rnd, 0.04, 4000, 10);
      for (let v = 0; v < 7; v++) {
        g.strokeStyle = gray(150 + rnd() * 60, 0.5);
        g.lineWidth = 0.6 + rnd() * 2;
        g.beginPath();
        let x = rnd() * SIZE;
        let y = 0;
        g.moveTo(x, y);
        while (y < SIZE) {
          x += (rnd() - 0.4) * 40;
          y += 15 + rnd() * 25;
          g.lineTo(x, y);
        }
        g.stroke();
      }
      hline(g, 0, 2, 200);
      vline(g, 0, 2, 200);
    },
  },
  // 小さなタイル（モザイク）
  mosaic: {
    meters: [0.3, 0.3],
    draw: (g, rnd) => {
      fill(g, 150);
      const n = 6;
      const w = SIZE / n;
      for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++) {
          g.fillStyle = gray(200 + (rnd() - 0.5) * 60);
          g.fillRect(i * w + 4, j * w + 4, w - 8, w - 8);
        }
    },
  },
  // ボーダータイル：細長いタイルを段ずらしで
  border: {
    meters: [0.45, 0.45],
    draw: (g, rnd) => {
      fill(g, 150);
      const rows = 9;
      const h = SIZE / rows;
      for (let r = 0; r < rows; r++) {
        const w = SIZE / 2;
        for (let c = -1; c < 3; c++) {
          const x = c * w + (r % 2 ? w / 2 : 0);
          g.fillStyle = gray(200 + (rnd() - 0.5) * 70);
          g.fillRect(x + 3, r * h + 3, w - 6, h - 6);
        }
      }
      noise(g, rnd, 0.06);
    },
  },
  // アスファルトシングル：段ずれのタブと粒
  shingle: {
    meters: [1, 1],
    draw: (g, rnd) => {
      fill(g, 200);
      const rows = 6;
      const h = SIZE / rows;
      for (let r = 0; r < rows; r++) {
        const cols = 4;
        const w = SIZE / cols;
        for (let c = -1; c < cols + 1; c++) {
          const x = c * w + (r % 2 ? w / 2 : 0);
          g.fillStyle = gray(170 + rnd() * 70);
          g.fillRect(x + 2, r * h, w - 4, h);
        }
        hline(g, r * h + h - 6, 6, 80);
      }
      noise(g, rnd, 0.2, 30000, 2);
    },
  },
  // S形瓦（洋瓦）：大きな波
  spanish: {
    meters: [0.9, 0.9],
    draw: (g) => {
      const rows = 3;
      const cols = 3;
      const h = SIZE / rows;
      const w = SIZE / cols;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const grad = g.createLinearGradient(c * w, 0, (c + 1) * w, 0);
          grad.addColorStop(0, gray(120));
          grad.addColorStop(0.25, gray(250));
          grad.addColorStop(0.5, gray(170));
          grad.addColorStop(0.62, gray(110));
          grad.addColorStop(0.85, gray(200));
          grad.addColorStop(1, gray(120));
          g.fillStyle = grad;
          g.fillRect(c * w, r * h, w, h);
        }
        const sh = g.createLinearGradient(0, r * h, 0, r * h + h * 0.22);
        sh.addColorStop(0, gray(40, 0.75));
        sh.addColorStop(1, gray(40, 0));
        g.fillStyle = sh;
        g.fillRect(0, r * h, SIZE, h * 0.22);
      }
    },
  },
  // 平板瓦（F形）：平らで大きめ、段の影がはっきり
  flatTile: {
    meters: [1.0, 1.0],
    draw: (g, rnd) => {
      fill(g, 210);
      const rows = 3;
      const h = SIZE / rows;
      for (let r = 0; r < rows; r++) {
        const cols = 3;
        const w = SIZE / cols;
        for (let c = -1; c < cols + 1; c++) {
          const x = c * w + (r % 2 ? w / 2 : 0);
          const grad = g.createLinearGradient(0, r * h, 0, (r + 1) * h);
          grad.addColorStop(0, gray(235));
          grad.addColorStop(1, gray(190));
          g.fillStyle = grad;
          g.fillRect(x + 2, r * h, w - 4, h);
          vline(g, x, 4, 100);
        }
        const sh = g.createLinearGradient(0, r * h, 0, r * h + h * 0.18);
        sh.addColorStop(0, gray(40, 0.7));
        sh.addColorStop(1, gray(40, 0));
        g.fillStyle = sh;
        g.fillRect(0, r * h, SIZE, h * 0.18);
      }
      noise(g, rnd, 0.05);
    },
  },
  // 大判タイル（600×1200）
  bigTile: {
    meters: [1.2, 1.2],
    draw: (g, rnd) => {
      fill(g, 170);
      for (let i = 0; i < 2; i++)
        for (let j = 0; j < 2; j++) {
          const x = (i * SIZE) / 2 + (j % 2 ? SIZE / 4 : 0);
          const y = (j * SIZE) / 2;
          for (const dx of [0, -SIZE]) {
            g.fillStyle = gray(228 + (rnd() - 0.5) * 16);
            g.fillRect(x + dx + 2, y + 2, SIZE / 2 - 4, SIZE / 2 - 4);
          }
        }
      noise(g, rnd, 0.06, 9000, 3);
    },
  },
  // 琉球畳（縁なしの半畳を市松に）
  ryukyu: {
    meters: [1.82, 1.82],
    draw: (g, rnd) => {
      const n = 2;
      const w = SIZE / n;
      for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++) {
          const across = (i + j) % 2 === 0;
          g.fillStyle = gray(across ? 225 : 205);
          g.fillRect(i * w, j * w, w, w);
          for (let k = 0; k < w; k += 3) {
            g.fillStyle = gray(180 + rnd() * 30, 0.5);
            if (across) g.fillRect(i * w, j * w + k, w, 1);
            else g.fillRect(i * w + k, j * w, 1, w);
          }
          g.strokeStyle = gray(130);
          g.lineWidth = 3;
          g.strokeRect(i * w + 1.5, j * w + 1.5, w - 3, w - 3);
        }
    },
  },
  // ALCパネル：大きな板の横目地と細かい気泡
  alc: {
    meters: [1.8, 1.8],
    draw: (g, rnd) => {
      fill(g, 232);
      noise(g, rnd, 0.1, 22000, 2);
      for (let i = 0; i < 3; i++) hline(g, (i * SIZE) / 3, 5, 135);
      vline(g, 0, 4, 150);
    },
  },
  // 太陽光パネル：セルの格子と枠
  solar: {
    meters: [1.0, 1.65],
    draw: (g) => {
      fill(g, 70);
      const cols = 6;
      const rows = 10;
      const w = (SIZE - 16) / cols;
      const h = (SIZE - 16) / rows;
      for (let i = 0; i < cols; i++)
        for (let j = 0; j < rows; j++) {
          const grad = g.createLinearGradient(0, 8 + j * h, 0, 8 + (j + 1) * h);
          grad.addColorStop(0, gray(150));
          grad.addColorStop(1, gray(110));
          g.fillStyle = grad;
          g.fillRect(8 + i * w + 2, 8 + j * h + 2, w - 4, h - 4);
        }
      g.strokeStyle = gray(225);
      g.lineWidth = 8;
      g.strokeRect(4, 4, SIZE - 8, SIZE - 8);
    },
  },
  // 芝・屋上緑化
  turf: {
    meters: [1, 1],
    draw: (g, rnd) => {
      fill(g, 190);
      for (let i = 0; i < 26000; i++) {
        g.fillStyle = gray(130 + rnd() * 125, 0.55);
        g.fillRect(rnd() * SIZE, rnd() * SIZE, 2, 4);
      }
    },
  },
};

const canvasCache = new Map<Pattern, HTMLCanvasElement>();

/** 素材の模様（白〜灰色の絵）。テクスチャとカタログの見本画像で共通に使う */
export function patternCanvas(pattern: Pattern): HTMLCanvasElement {
  const hit = canvasCache.get(pattern);
  if (hit) return hit;
  const spec = PATTERNS[pattern];
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const g = canvas.getContext('2d')!;
  spec.draw(g, rng(pattern.length * 7919 + pattern.charCodeAt(0)));
  canvasCache.set(pattern, canvas);
  return canvas;
}

/** 模様1枚が表す実寸（m） */
export const patternMeters = (pattern: Pattern): [number, number] => PATTERNS[pattern].meters;

const cache = new Map<Pattern, THREE.CanvasTexture>();

/** 素材の模様テクスチャ（UVは実寸m基準で使う） */
export function patternTexture(pattern: Pattern): THREE.CanvasTexture {
  const hit = cache.get(pattern);
  if (hit) return hit;
  const spec = PATTERNS[pattern];
  const tex = new THREE.CanvasTexture(patternCanvas(pattern));
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1 / spec.meters[0], 1 / spec.meters[1]);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  cache.set(pattern, tex);
  return tex;
}

let grass: THREE.CanvasTexture | null = null;
export function grassTexture(): THREE.CanvasTexture {
  if (grass) return grass;
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const g = canvas.getContext('2d')!;
  const rnd = rng(42);
  g.fillStyle = '#6f8f4e';
  g.fillRect(0, 0, SIZE, SIZE);
  for (let i = 0; i < 30000; i++) {
    const v = rnd();
    g.fillStyle = v < 0.5 ? 'rgba(90,120,60,0.5)' : 'rgba(140,170,95,0.4)';
    g.fillRect(rnd() * SIZE, rnd() * SIZE, 2, 3);
  }
  grass = new THREE.CanvasTexture(canvas);
  grass.wrapS = THREE.RepeatWrapping;
  grass.wrapT = THREE.RepeatWrapping;
  grass.repeat.set(1 / 3, 1 / 3);
  grass.colorSpace = THREE.SRGBColorSpace;
  return grass;
}
