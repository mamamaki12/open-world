// レース場の3Dで使う絵（芝・ダート・水面・観客・ゼッケンなど）。キャンバスに描いて使い回す
import * as THREE from 'three';
import { canvasTexture } from './textures';

/** 同じ乱数で毎回同じ絵になるように */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function repeat(t: THREE.Texture) {
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** ざらざらした細かい点を散らす */
function speckle(g: CanvasRenderingContext2D, w: number, h: number, n: number, colors: string[], size: [number, number], seed: number) {
  const r = rng(seed);
  for (let k = 0; k < n; k++) {
    g.fillStyle = colors[Math.floor(r() * colors.length)];
    const s = size[0] + r() * (size[1] - size[0]);
    g.fillRect(r() * w, r() * h, s, s);
  }
}

/** 芝のコース。横切る刈り目のしま（明るい・暗いが交互） */
export function turfTexture() {
  return repeat(
    canvasTexture('race:turf', 256, 128, (g) => {
      g.fillStyle = '#4f9a3c';
      g.fillRect(0, 0, 256, 128);
      g.fillStyle = '#5aa846';
      g.fillRect(0, 0, 128, 128);
      speckle(g, 256, 128, 2600, ['#3f8a30', '#66b352', '#4a9437', '#72bd5c'], [1, 2], 1);
    }),
  );
}

/** ダートのコース。ならした筋がコースに沿って入る */
export function dirtTexture() {
  return repeat(
    canvasTexture('race:dirt', 256, 128, (g) => {
      g.fillStyle = '#a77d52';
      g.fillRect(0, 0, 256, 128);
      speckle(g, 256, 128, 3000, ['#8e6740', '#b88d61', '#9a7148', '#c39a6c'], [1, 2.5], 2);
      g.strokeStyle = 'rgba(80,50,25,0.18)';
      for (let y = 4; y < 128; y += 7) {
        g.beginPath();
        g.moveTo(0, y);
        g.lineTo(256, y);
        g.stroke();
      }
    }),
  );
}

/** コースの外の芝生 */
export function grassTexture() {
  return repeat(
    canvasTexture('race:grass', 256, 256, (g) => {
      g.fillStyle = '#5b9a45';
      g.fillRect(0, 0, 256, 256);
      speckle(g, 256, 256, 5000, ['#4d8a3a', '#68a852', '#558f40', '#73b05c', '#4a8236'], [1, 3], 3);
    }),
  );
}

/** 競輪のバンク（走路）の舗装 */
export function bankTexture() {
  return repeat(
    canvasTexture('race:bank', 256, 128, (g) => {
      g.fillStyle = '#8b9196';
      g.fillRect(0, 0, 256, 128);
      speckle(g, 256, 128, 3500, ['#7d8388', '#979da2', '#858b90', '#a3a8ac'], [1, 2], 4);
    }),
  );
}

/** 水面のさざ波 */
export function waterTexture() {
  return repeat(
    canvasTexture('race:water', 512, 512, (g) => {
      const grad = g.createLinearGradient(0, 0, 0, 512);
      grad.addColorStop(0, '#1d5f8f');
      grad.addColorStop(1, '#22699b');
      g.fillStyle = grad;
      g.fillRect(0, 0, 512, 512);
      const r = rng(5);
      for (let k = 0; k < 900; k++) {
        const x = r() * 512;
        const y = r() * 512;
        const w = 6 + r() * 22;
        g.strokeStyle = r() < 0.5 ? 'rgba(255,255,255,0.16)' : 'rgba(10,40,70,0.25)';
        g.lineWidth = 1 + r() * 1.5;
        g.beginPath();
        g.moveTo(x, y);
        g.quadraticCurveTo(x + w / 2, y - 2 - r() * 2, x + w, y);
        g.stroke();
      }
    }),
  );
}

/** スタンドの客席（人の頭と服が並ぶ） */
export function crowdTexture() {
  return repeat(
    canvasTexture('race:crowd', 512, 256, (g) => {
      g.fillStyle = '#3a3f48';
      g.fillRect(0, 0, 512, 256);
      const r = rng(6);
      const shirts = ['#e8e8e8', '#2b4f8f', '#b23a3a', '#222', '#d9b54a', '#4f7f4f', '#8a8a8a', '#f2f2f2', '#6b4b8f', '#c46a2a'];
      for (let row = 0; row < 16; row++) {
        const y = row * 16;
        g.fillStyle = '#4a505a';
        g.fillRect(0, y + 13, 512, 3);
        for (let x = 0; x < 512; x += 7 + r() * 3) {
          if (r() < 0.12) continue;
          g.fillStyle = shirts[Math.floor(r() * shirts.length)];
          g.fillRect(x, y + 6, 6, 7);
          g.fillStyle = r() < 0.8 ? '#2a1f18' : '#d9d2c4';
          g.beginPath();
          g.arc(x + 3, y + 4, 2.6, 0, Math.PI * 2);
          g.fill();
        }
      }
    }),
  );
}

/** 影（ぼかした丸） */
export function blobTexture() {
  return canvasTexture('race:blob', 128, 128, (g) => {
    const grad = g.createRadialGradient(64, 64, 4, 64, 64, 62);
    grad.addColorStop(0, 'rgba(0,0,0,0.55)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
  });
}

/** 番号の札・ゼッケン */
export function numberTexture(no: number, bg: string, fg: string, border = 'rgba(0,0,0,0.6)') {
  return canvasTexture(`race:no:${no}:${bg}:${fg}`, 96, 96, (g) => {
    g.fillStyle = bg;
    g.strokeStyle = border;
    g.lineWidth = 6;
    g.beginPath();
    g.roundRect(5, 5, 86, 86, 14);
    g.fill();
    g.stroke();
    g.fillStyle = fg;
    g.font = `900 ${no >= 10 ? 52 : 62}px system-ui, -apple-system, "Helvetica Neue", sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(String(no), 48, 52);
  });
}

/** 柵の外の広告板 */
export function boardTexture() {
  return repeat(
    canvasTexture('race:boards', 512, 64, (g) => {
      const colors = ['#c62828', '#1e63d6', '#f4c430', '#2e9d4a', '#ffffff', '#222'];
      const words = ['FINAL', 'GOAL', 'SPEED', 'STAR', 'DREAM', 'ACE', 'GO!', 'WIN'];
      for (let k = 0; k < 8; k++) {
        const bg = colors[k % colors.length];
        g.fillStyle = bg;
        g.fillRect(k * 64, 0, 64, 64);
        g.fillStyle = bg === '#ffffff' || bg === '#f4c430' ? '#222' : '#fff';
        g.font = '900 18px system-ui, sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(words[k], k * 64 + 32, 33);
      }
    }),
  );
}

/** 大型ビジョン（場内の大きな画面） */
export function visionTexture(title: string) {
  return canvasTexture(`race:vision:${title}`, 512, 256, (g) => {
    const grad = g.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#0d2340');
    grad.addColorStop(1, '#173d6b');
    g.fillStyle = grad;
    g.fillRect(0, 0, 512, 256);
    g.fillStyle = '#ffcf4a';
    g.font = '900 64px system-ui, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(title, 256, 128);
  });
}
