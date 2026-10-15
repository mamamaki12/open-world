// カジノの効果音。音声ファイルは使わず、その場で合成する（Web Audio）。消音の設定はブラウザに覚えておく
let ctx: AudioContext | null = null;
const MUTE_KEY = 'open-world:casino-mute';

let muted = (() => {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
})();

export function isMuted() {
  return muted;
}

export function setMuted(v: boolean) {
  muted = v;
  try {
    localStorage.setItem(MUTE_KEY, v ? '1' : '0');
  } catch {
    /* 覚えられなくても音は止まる */
  }
}

function audio(): AudioContext | null {
  if (muted) return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(a: AudioContext, freq: number, at: number, dur: number, gain = 0.12, type: OscillatorType = 'square') {
  const o = a.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, at);
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(gain, at + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g).connect(a.destination);
  o.start(at);
  o.stop(at + dur + 0.02);
}

function noise(a: AudioContext, at: number, dur: number, freq: number, gain = 0.2, q = 2) {
  const buf = a.createBuffer(1, Math.max(1, Math.floor(a.sampleRate * dur)), a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freq;
  f.Q.value = q;
  const g = a.createGain();
  g.gain.setValueAtTime(gain, at);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  src.connect(f).connect(g).connect(a.destination);
  src.start(at);
}

/** チップを置く「カチッ」 */
export function sfxChip() {
  const a = audio();
  if (!a) return;
  noise(a, a.currentTime, 0.06, 4200, 0.25, 8);
  tone(a, 2400, a.currentTime, 0.05, 0.03, 'triangle');
}

/** レバーを引く */
export function sfxLever() {
  const a = audio();
  if (!a) return;
  noise(a, a.currentTime, 0.18, 700, 0.25, 1.5);
}

/** リールが止まる「ガコン」 */
export function sfxReelStop(i: number) {
  const a = audio();
  if (!a) return;
  noise(a, a.currentTime, 0.08, 900, 0.35, 3);
  tone(a, 180 + i * 30, a.currentTime, 0.08, 0.08, 'triangle');
}

/** 当たりのファンファーレ。big ほど長く */
export function sfxWin(big: 0 | 1 | 2) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime;
  const notes = big === 2 ? [523, 659, 784, 1047, 784, 1047, 1319, 1568] : big === 1 ? [523, 659, 784, 1047, 1319] : [784, 1047];
  notes.forEach((f, i) => tone(a, f, t + i * 0.09, 0.16, 0.08));
  if (big > 0) {
    // コインがじゃらじゃら
    for (let i = 0; i < (big === 2 ? 26 : 12); i++) noise(a, t + 0.3 + i * 0.05 + Math.random() * 0.03, 0.05, 5000 + Math.random() * 2000, 0.12, 10);
  }
}

/** はずれ */
export function sfxLose() {
  const a = audio();
  if (!a) return;
  tone(a, 220, a.currentTime, 0.18, 0.05, 'triangle');
  tone(a, 165, a.currentTime + 0.15, 0.25, 0.05, 'triangle');
}

/** ルーレットの玉が転がる音（長さ秒） */
export function sfxBallRoll(seconds: number) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime;
  const n = Math.floor(seconds * 14);
  for (let i = 0; i < n; i++) {
    // だんだん間隔が広がる（玉が遅くなる）
    const u = i / n;
    noise(a, t + seconds * (1 - Math.sqrt(1 - u)), 0.03, 3000, 0.06 + u * 0.05, 6);
  }
  noise(a, t + seconds, 0.09, 1800, 0.3, 4);
}

/** カードをめくる */
export function sfxCard() {
  const a = audio();
  if (!a) return;
  noise(a, a.currentTime, 0.12, 2500, 0.25, 1);
}
