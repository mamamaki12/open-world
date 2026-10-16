// エンジン音を Web Audio で合成する。気筒数で爆発の間隔（音の高さとざらつき）が変わり、EVはモーターのうなり。
import { ENGINES } from '../catalog/carMods';
import type { EngineId } from '../catalog/carMods';
import { audio } from './sound';

const IDLE = 850, REDLINE = 6800;
/** 回転数(rpm)から聞こえる基本の高さ(Hz)。4ストロークでは2回転で全気筒が1回ずつ爆発する。 */
export function firingHz(engine: EngineId, rpm: number) {
  const e = ENGINES.find(x => x.id === engine)!;
  if (!e.cylinders) return 120 + rpm / 9;
  return rpm / 60 * (engine === 'rotary' ? 3 : e.cylinders / 2);
}
interface Voice { a: AudioContext; osc: OscillatorNode; sub: OscillatorNode; filter: BiquadFilterNode; gain: GainNode; engine: EngineId }
function voice(a: AudioContext, engine: EngineId): Voice {
  const ev = engine === 'electric', osc = a.createOscillator(), sub = a.createOscillator();
  osc.type = ev ? 'sine' : 'sawtooth'; sub.type = ev ? 'triangle' : 'square';
  const filter = a.createBiquadFilter(); filter.type = 'lowpass'; filter.Q.value = ev ? 4 : 1.5;
  const gain = a.createGain(), subGain = a.createGain();
  // V8 は半分の高さを強めて「ドロドロ」した音に
  subGain.gain.value = engine === 'v8' ? .8 : ev ? .25 : .35;
  gain.gain.value = .0001;
  osc.connect(filter); sub.connect(subGain).connect(filter); filter.connect(gain).connect(a.destination);
  osc.start(); sub.start();
  return { a, osc, sub, filter, gain, engine };
}
function tune(v: Voice, rpm: number, load: number, at: number, ramp: number) {
  const hz = firingHz(v.engine, rpm), ev = v.engine === 'electric';
  v.osc.frequency.linearRampToValueAtTime(hz, at + ramp);
  v.sub.frequency.linearRampToValueAtTime(ev ? hz * 2 : hz / 2, at + ramp);
  v.filter.frequency.linearRampToValueAtTime(ev ? hz * 3 : 300 + hz * (2 + load * 3), at + ramp);
}
/** カスタムショップで「エンジン音を聞く」：アイドリングから2回ふかす */
export function playEngineRev(engine: EngineId) {
  const a = audio(); if (!a) return;
  const v = voice(a, engine), t = a.currentTime + .02, top = engine === 'rotary' ? 8800 : engine === 'v12' ? 7800 : REDLINE;
  v.osc.frequency.setValueAtTime(firingHz(engine, IDLE), t); v.sub.frequency.setValueAtTime(firingHz(engine, IDLE) / 2, t);
  v.filter.frequency.setValueAtTime(500, t);
  v.gain.gain.setValueAtTime(.0001, t); v.gain.gain.exponentialRampToValueAtTime(.12, t + .15);
  tune(v, IDLE, 0, t, .5);
  tune(v, top * .7, 1, t + .5, .35); tune(v, IDLE * 1.2, 0, t + .85, .5);
  tune(v, top, 1, t + 1.4, .45); tune(v, IDLE, 0, t + 1.85, .7);
  v.gain.gain.setValueAtTime(.12, t + 2.6); v.gain.gain.exponentialRampToValueAtTime(.0001, t + 3);
  v.osc.stop(t + 3.05); v.sub.stop(t + 3.05);
}
let hum: Voice | null = null;
/** 運転中のエンジン音。engine が null なら止める。speed は最高速に対する割合(0〜1)。 */
export function engineHum(engine: EngineId | null, speed: number, throttle: number) {
  if (!engine) {
    if (hum) { const h = hum; hum = null; const t = h.a.currentTime; h.gain.gain.setTargetAtTime(.0001, t, .08); h.osc.stop(t + .4); h.sub.stop(t + .4); }
    return;
  }
  if (!hum || hum.engine !== engine) { engineHum(null, 0, 0); const a = audio(); if (!a) return; hum = voice(a, engine); }
  // 速度に合わせて回転が上がり、ギアが変わると少し下がる（4速）
  const gear = Math.min(3, Math.floor(speed * 4)), inGear = speed * 4 - gear;
  const rpm = IDLE + (REDLINE - IDLE) * Math.min(1, speed < .02 ? 0 : .25 + inGear * .7) * (1 - gear * .06) + Math.abs(throttle) * 400;
  const t = hum.a.currentTime;
  tune(hum, rpm, Math.abs(throttle), t, .08);
  hum.gain.gain.setTargetAtTime(.035 + Math.abs(throttle) * .03, t, .1);
}
