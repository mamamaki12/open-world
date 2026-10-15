// ドアの効果音を、音声ファイルを使わずにその場で合成する（Web Audio）
let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function noiseBuffer(a: AudioContext, seconds: number): AudioBuffer {
  const buf = a.createBuffer(1, Math.floor(a.sampleRate * seconds), a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

/** 金属のラッチの「カチャ」 */
function latch(a: AudioContext, at: number, gain = 0.25) {
  const src = a.createBufferSource();
  src.buffer = noiseBuffer(a, 0.05);
  const band = a.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = 3200;
  band.Q.value = 6;
  const g = a.createGain();
  g.gain.setValueAtTime(gain, at);
  g.gain.exponentialRampToValueAtTime(0.001, at + 0.05);
  src.connect(band).connect(g).connect(a.destination);
  src.start(at);
}

/** 蝶番のきしみ（音程が少し揺れる低めの音） */
function creak(a: AudioContext, at: number, duration: number) {
  const osc = a.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(190, at);
  osc.frequency.linearRampToValueAtTime(260, at + duration * 0.4);
  osc.frequency.linearRampToValueAtTime(170, at + duration);
  const lfo = a.createOscillator();
  lfo.frequency.value = 23;
  const lfoGain = a.createGain();
  lfoGain.gain.value = 18;
  lfo.connect(lfoGain).connect(osc.frequency);
  const band = a.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = 900;
  band.Q.value = 3;
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(0.05, at + 0.08);
  g.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  osc.connect(band).connect(g).connect(a.destination);
  osc.start(at);
  lfo.start(at);
  osc.stop(at + duration);
  lfo.stop(at + duration);
}

/** 閉まるときの「バタン」 */
function thud(a: AudioContext, at: number) {
  const osc = a.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(120, at);
  osc.frequency.exponentialRampToValueAtTime(45, at + 0.18);
  const g = a.createGain();
  g.gain.setValueAtTime(0.5, at);
  g.gain.exponentialRampToValueAtTime(0.001, at + 0.22);
  osc.connect(g).connect(a.destination);
  osc.start(at);
  osc.stop(at + 0.25);
}

/** 引き戸の「スーッ」 */
function slide(a: AudioContext, at: number, duration: number) {
  const src = a.createBufferSource();
  src.buffer = noiseBuffer(a, duration);
  const low = a.createBiquadFilter();
  low.type = 'lowpass';
  low.frequency.value = 900;
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(0.12, at + 0.1);
  g.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  src.connect(low).connect(g).connect(a.destination);
  src.start(at);
}

export function playDoorSound(opening: boolean, sliding: boolean) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + 0.01;
  if (sliding) {
    slide(a, t, 0.5);
    if (!opening) latch(a, t + 0.48, 0.15);
    return;
  }
  if (opening) {
    latch(a, t);
    creak(a, t + 0.06, 0.55);
  } else {
    creak(a, t, 0.35);
    thud(a, t + 0.4);
    latch(a, t + 0.42);
  }
}

/** 窓の開け閉め：引き違いは「スーッ」と軽い「カチャ」、すべり出しは「カチャ」と小さなきしみ */
export function playWindowSound(opening: boolean, sliding: boolean) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + 0.01;
  if (sliding) {
    if (opening) latch(a, t, 0.12);
    slide(a, t + (opening ? 0.04 : 0), 0.45);
    if (!opening) latch(a, t + 0.44, 0.14);
    return;
  }
  latch(a, t, 0.18);
  creak(a, t + 0.05, 0.3);
}

/** 服がこすれる「ザッ」（よじ登るとき） */
export function playClimbSound() {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + 0.01;
  for (const [at, len] of [[0, 0.18], [0.32, 0.22]] as const) {
    const src = a.createBufferSource();
    src.buffer = noiseBuffer(a, len);
    const band = a.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 1400;
    band.Q.value = 0.8;
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, t + at);
    g.gain.exponentialRampToValueAtTime(0.09, t + at + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, t + at + len);
    src.connect(band).connect(g).connect(a.destination);
    src.start(t + at);
  }
}

/** 着地の「ドスッ」と砂利の音。strength は 0..1（高いところから落ちるほど大きい） */
export function playLandSound(strength: number) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + 0.01;
  const s = Math.min(Math.max(strength, 0.15), 1);
  const osc = a.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(95, t);
  osc.frequency.exponentialRampToValueAtTime(38, t + 0.2);
  const g = a.createGain();
  g.gain.setValueAtTime(0.55 * s, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
  osc.connect(g).connect(a.destination);
  osc.start(t);
  osc.stop(t + 0.3);
  const src = a.createBufferSource();
  src.buffer = noiseBuffer(a, 0.3);
  const low = a.createBiquadFilter();
  low.type = 'lowpass';
  low.frequency.value = 2200;
  const ng = a.createGain();
  ng.gain.setValueAtTime(0.0001, t);
  ng.gain.exponentialRampToValueAtTime(0.16 * s, t + 0.02);
  ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
  src.connect(low).connect(ng).connect(a.destination);
  src.start(t);
}
