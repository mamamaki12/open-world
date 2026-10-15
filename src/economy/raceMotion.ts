// レース映像の動き。コースの形、走る速さの移り変わり、各馬（車・艇）の位置を時間から計算する。
// 着順は先に drawOrder で決まっていて、ここではその着順どおりにゴールする「走り方」を作る。
import type { Race } from './race';
import type { Rng } from './rng';
import { gauss } from './rng';

export interface Course {
  kind: Race['kind'];
  /** 1周の長さ（内ラチ・ブイ・内圏線に沿って、m） */
  circumference: number;
  /** 直線の長さ（m） */
  straight: number;
  /** コーナーの半径（m） */
  radius: number;
  /** 走れる幅（m） */
  width: number;
  /** 右回り（中山・阪神など）なら左右を反転して描く */
  right: boolean;
  /** ゴールの位置（周回上の位置、m） */
  finishP: number;
  /** スタートの位置 */
  startP: number;
  /** 走る距離 */
  distance: number;
}

/** 実際の競馬場のおおよその形（周長・直線、芝） */
const HORSE_COURSES: Record<string, { c: number; s: number; right: boolean }> = {
  東京: { c: 2083, s: 525, right: false },
  中山: { c: 1840, s: 310, right: true },
  阪神: { c: 2089, s: 473, right: true },
  京都: { c: 1894, s: 404, right: true },
  札幌: { c: 1640, s: 266, right: true },
  小倉: { c: 1615, s: 293, right: true },
};

/** 333m バンクの競輪場 */
const BANK_333 = new Set(['松戸', '伊東']);

export function makeCourse(race: Race): Course {
  const L = race.distance;
  if (race.kind === 'horse') {
    const base = HORSE_COURSES[race.venue] ?? HORSE_COURSES['東京'];
    const dirt = race.surface === 'ダート';
    const C = dirt ? base.c * 0.86 : base.c;
    const S = dirt ? base.s * 0.95 : base.s;
    const finishP = S * 0.82;
    return {
      kind: race.kind,
      circumference: C,
      straight: S,
      radius: (C - 2 * S) / (2 * Math.PI),
      width: 24,
      right: base.right,
      finishP,
      startP: mod(finishP - L, C),
      distance: L,
    };
  }
  if (race.kind === 'keirin') {
    const C = BANK_333.has(race.venue) ? 333.3 : 400;
    const S = C * 0.15;
    const finishP = S * 0.8;
    return {
      kind: race.kind,
      circumference: C,
      straight: S,
      radius: (C - 2 * S) / (2 * Math.PI),
      width: 8,
      right: false,
      finishP,
      startP: mod(finishP - L, C),
      distance: L,
    };
  }
  // ボート：1周600m。両端の「ターンマーク」をブイのまわりで小さく回る
  const C = 600;
  const R = 12;
  const S = (C - 2 * Math.PI * R) / 2;
  const finishP = S * 0.55;
  return { kind: race.kind, circumference: C, straight: S, radius: R, width: 50, right: false, finishP, startP: finishP, distance: L };
}

export function mod(a: number, m: number): number {
  return ((a % m) + m) % m;
}

export interface Pt {
  x: number;
  y: number;
  /** 進む向き（ラジアン、画面座標） */
  angle: number;
}

/**
 * 周回上の位置 p（m）と、内側からの距離 lateral（m）から画面の座標（m）を出す。
 * 下の直線（ホームストレッチ）を右へ進み、反時計回りに回る。右回りのコースは左右を反転する。
 */
export function pointAt(c: Course, p: number, lateral: number): Pt {
  const S = c.straight;
  const R = c.radius;
  const r = R + lateral;
  let q = mod(p, c.circumference);
  let x: number, y: number, angle: number;
  if (q < S) {
    x = -S / 2 + q;
    y = r;
    angle = 0;
  } else if ((q -= S) < Math.PI * R) {
    const th = q / R;
    x = S / 2 + r * Math.cos(Math.PI / 2 - th);
    y = r * Math.sin(Math.PI / 2 - th);
    angle = -th;
  } else if ((q -= Math.PI * R) < S) {
    x = S / 2 - q;
    y = -r;
    angle = Math.PI;
  } else {
    q -= S;
    const th = q / R;
    x = -S / 2 + r * Math.cos(-Math.PI / 2 - th);
    y = r * Math.sin(-Math.PI / 2 - th);
    angle = Math.PI - th;
  }
  if (c.right) {
    x = -x;
    angle = Math.PI - angle;
  }
  return { x, y, angle };
}

/** スタートからの距離 d の周回上の位置 */
export const courseP = (c: Course, d: number) => mod(c.startP + d, c.circumference);

/** その位置がコーナー（ターン）の中か */
export function inTurn(c: Course, p: number): boolean {
  const q = mod(p, c.circumference);
  const S = c.straight;
  const arc = Math.PI * c.radius;
  return (q >= S && q < S + arc) || q >= 2 * S + arc;
}

// ---- 速さの移り変わり ----

/** レースの流れ（距離に対する速さの割合）。先頭の馬の「時間 → 距離」の形を作る */
function paceAt(c: Course, d: number): number {
  const L = c.distance;
  if (c.kind === 'horse') {
    const start = 0.35 + 0.65 * Math.min(1, d / 90);
    const late = d > L - 600 ? 1.03 : 0.97;
    const tired = d > L - 120 ? 0.98 : 1;
    return start * late * tired;
  }
  if (c.kind === 'keirin') {
    // 誘導員の後ろでゆっくり → 打鐘（残り1周半）で一気に上がる
    const start = 0.35 + 0.65 * Math.min(1, d / 60);
    let v = 0.62;
    if (d > L - 900) v = 0.62 + (Math.min(d, L - 600) - (L - 900)) / 300 * 0.23;
    if (d > L - 600) v = 0.85 + (Math.min(d, L - 400) - (L - 600)) / 200 * 0.3;
    if (d > L - 400) v = 1.18;
    if (d > L - 60) v = 1.12;
    return start * v;
  }
  // ボート：ターンマークでは減速する
  return inTurn(c, courseP(c, d)) ? 0.7 : 1;
}

/** 先頭の「時間の割合 u → 距離の割合 s」の表 */
export function paceTable(c: Course, samples = 600): (u: number) => number {
  const L = c.distance;
  const tau: number[] = [0];
  for (let k = 1; k <= samples; k++) {
    const d = ((k - 0.5) / samples) * L;
    tau.push(tau[k - 1] + 1 / paceAt(c, d));
  }
  const total = tau[samples];
  for (let k = 0; k <= samples; k++) tau[k] /= total;
  return (u: number) => {
    if (u <= 0) return 0;
    if (u >= 1) return 1;
    let lo = 0, hi = samples;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (tau[mid] < u) lo = mid;
      else hi = mid;
    }
    const f = (u - tau[lo]) / (tau[hi] - tau[lo] || 1);
    return (lo + f) / samples;
  };
}

// ---- 各馬の走り方 ----

export interface Motion {
  course: Course;
  /** ゴールの時刻（秒） */
  finish: number[];
  /** 前半の位置取り（+ なら前へ行く） */
  early: number[];
  /** スタートの遅れ（ボートのスタートタイミング、m） */
  startOffset: number[];
  /** ボートのスタートタイミング（秒） */
  st: number[];
  pace: (u: number) => number;
  /** 1着の時計（秒） */
  winTime: number;
  /** 前後の着差（秒） */
  gaps: number[];
}

export function makeMotion(race: Race, order: number[], rng: Rng): Motion {
  const course = makeCourse(race);
  const L = race.distance;
  const n = race.runners.length;
  let winTime: number;
  let gapMean: number;
  if (race.kind === 'horse') {
    const v = (race.surface === 'ダート' ? 16.4 : 17.2) * (race.condition === '重' || race.condition === '不良' ? 0.98 : 1);
    winTime = (L / v) * (1 + gauss(rng) * 0.008);
    gapMean = 0.2;
  } else if (race.kind === 'keirin') {
    winTime = (L / 13.6) * (1 + gauss(rng) * 0.01);
    gapMean = 0.12;
  } else {
    winTime = 108 + gauss(rng) * 1.2;
    gapMean = 1.1;
  }
  const finish = Array(n).fill(0);
  const gaps: number[] = [];
  let t = winTime;
  order.forEach((i, k) => {
    if (k > 0) {
      const tiny = rng() < 0.18;
      const g = tiny ? 0.004 + rng() * 0.03 : -Math.log(Math.max(rng(), 1e-6)) * gapMean + 0.02;
      gaps.push(g);
      t += g;
    }
    finish[i] = t;
  });
  const early = Array(n).fill(0);
  const startOffset = Array(n).fill(0);
  const st = Array(n).fill(0);
  if (race.kind === 'horse') {
    const STYLE: Record<string, number> = { 逃げ: 0.1, 先行: 0.05, 差し: -0.02, 追込: -0.06 };
    race.runners.forEach((r) => (early[r.index] = (STYLE[r.style] ?? 0) + gauss(rng) * 0.012));
  } else if (race.kind === 'keirin') {
    // 周回中の並び：前を取ったライン → 次のライン…の順に一列（ライン内は番手どおり）
    const lines = [...new Set(race.runners.map((r) => r.line!))].sort(() => rng() - 0.5);
    const formation = [...race.runners].sort((a, b) => lines.indexOf(a.line!) - lines.indexOf(b.line!) || a.linePos! - b.linePos!);
    formation.forEach((r, k) => (early[r.index] = 0.04 - k * 0.009));
  } else {
    race.runners.forEach((r) => {
      st[r.index] = Math.round((0.06 + rng() * 0.16) * 100) / 100;
      startOffset[r.index] = -st[r.index] * 16;
      // 内のコースほど1マークを先に回る
      early[r.index] = 0.05 - r.index * 0.012;
    });
  }
  return { course, finish, early, startOffset, st, pace: paceTable(course), winTime, gaps };
}

/** 時刻 t（秒）にスタートから何m進んでいるか */
export function distanceAt(m: Motion, i: number, t: number): number {
  const L = m.course.distance;
  const T = m.finish[i];
  if (t >= T) {
    // ゴールしたあとは流して止まる
    const v = L / T;
    return L + v * 7 * (1 - Math.exp(-(t - T) / 7));
  }
  const u = Math.max(0, t / T);
  const c = m.early[i];
  // 前半は位置取りの差、後半は実力どおり。ボートは1マークまでで決まりやすい
  // 競輪は周回中ずっと一列の車間を保ち、打鐘のあたりから崩れる
  const shape =
    m.course.kind === 'boat'
      ? u * (1 - u) ** 4 * 3
      : m.course.kind === 'keirin'
        ? (1 - u) * Math.min(1, u * 10) * 0.25
        : u * (1 - u);
  const f = Math.min(1, Math.max(0, u + c * shape));
  return L * m.pace(f) + m.startOffset[i] * (1 - u) ** 3;
}

// ---- 横の位置（ぶつからないように外へ持ち出す） ----

export interface PackStyle {
  /** 1頭（台・艇）の長さと幅（m） */
  length: number;
  breadth: number;
  /** 横の動きのなめらかさ（1秒あたりの寄り方） */
  rate: number;
}

export const PACK: Record<Race['kind'], PackStyle> = {
  horse: { length: 2.7, breadth: 1.3, rate: 1.2 },
  keirin: { length: 2.0, breadth: 0.95, rate: 1.6 },
  boat: { length: 3.6, breadth: 2.6, rate: 0.9 },
};

export class Packer {
  lateral: number[];
  constructor(initial: number[]) {
    this.lateral = [...initial];
  }

  /** dist：今の距離、pref：行きたい横の位置。前から順に、重なる相手がいれば外へずらす */
  update(dt: number, dist: number[], pref: number[], style: PackStyle, maxLat: number): number[] {
    const order = dist.map((_, i) => i).sort((a, b) => dist[b] - dist[a]);
    const target: number[] = Array(dist.length).fill(0);
    const placed: number[] = [];
    for (const i of order) {
      let x = pref[i];
      for (let guard = 0; guard < 24; guard++) {
        const hit = placed.find(
          (j) => Math.abs(dist[i] - dist[j]) < style.length * 1.15 && Math.abs(x - target[j]) < style.breadth * 1.25,
        );
        if (hit === undefined) break;
        x = target[hit] + style.breadth * 1.25;
      }
      target[i] = Math.min(x, maxLat);
      placed.push(i);
    }
    const k = Math.min(1, dt * style.rate);
    this.lateral = this.lateral.map((l, i) => l + (target[i] - l) * k);
    return this.lateral;
  }
}

/** 着差の表し方 */
export function marginLabel(kind: Race['kind'], gapSeconds: number, speed: number): string {
  const meters = gapSeconds * speed;
  if (kind === 'boat') return '';
  if (kind === 'keirin') {
    const b = meters / 1.8; // 自転車1台の長さ
    if (b < 0.05) return 'タイヤ差';
    if (b < 0.15) return '1/4車輪';
    if (b < 0.25) return '1/2車輪';
    if (b < 0.4) return '3/4車輪';
    if (b < 0.6) return '1/2車身';
    if (b < 0.85) return '3/4車身';
    if (b < 1.5) return '1車身';
    if (b < 2.5) return '2車身';
    if (b < 4) return '3車身';
    return '大差';
  }
  const b = meters / 2.4; // 馬1頭の長さ
  if (b < 0.06) return 'ハナ';
  if (b < 0.14) return 'アタマ';
  if (b < 0.3) return 'クビ';
  if (b < 0.6) return '1/2';
  if (b < 0.85) return '3/4';
  if (b < 1.1) return '1';
  if (b < 1.35) return '1 1/4';
  if (b < 1.6) return '1 1/2';
  if (b < 1.85) return '1 3/4';
  if (b < 2.5) return '2';
  if (b < 3.5) return '3';
  if (b < 4.5) return '4';
  if (b < 6) return '5';
  if (b < 10) return '大差手前';
  return '大差';
}

/** 1:34.8 の形 */
export function raceTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec - m * 60;
  return `${m}:${s < 10 ? '0' : ''}${s.toFixed(1)}`;
}

/** ボートの決まり手 */
export function boatKimarite(winnerLane: number, rng: Rng): string {
  if (winnerLane === 0) return rng() < 0.92 ? '逃げ' : '恵まれ';
  if (winnerLane === 1) return rng() < 0.6 ? '差し' : 'まくり';
  return rng() < 0.5 ? 'まくり' : rng() < 0.7 ? 'まくり差し' : '抜き';
}
