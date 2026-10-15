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
