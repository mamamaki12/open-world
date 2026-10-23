// 実況やディーラーの声。ブラウザの読み上げ（Web Speech API）で日本語の声を出す。効果音と同じ 🔊 で消せる
//
// 声が出ないことがある理由と、その対策：
// - iPhone・iPad（Safari）は、画面をタップした「その場」で一度読み上げないと、あとから声を出せない
//   → 画面に触れるたびに無音の読み上げをして、読み上げを使える状態にしておく（primeVoice）
// - 声の一覧は少し遅れて読み込まれる → 声を出すたびに日本語の声を探し直す
// - 止めてすぐ次を読むと、Chrome では黙ってしまうことがある → 話している途中なら、終わってから最新の1つだけを読む
// - 無音の読み上げをすると、スマホで流している音楽が止まることがある
//   → 声の準備はカジノを開いているあいだだけにする（setVoiceWanted）。音楽と混ぜる設定は audioSession.ts
// - 日本語の声が入っていない端末もある → そのときは読まず、画面に「字幕だけ」と出す（voiceStatus）
import { isMuted } from './sfx';

let voice: SpeechSynthesisVoice | null = null;
let primed = false;
/** 話し終わったら読む、最新の1つ */
let pending: { text: string; opts: SpeakOptions } | null = null;
let current: SpeechSynthesisUtterance | null = null;
let watchdog = 0;

function synth(): SpeechSynthesis | null {
  return typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
}

const isJapanese = (v: SpeechSynthesisVoice) => v.lang.replace('_', '-').toLowerCase().startsWith('ja');

/** 日本語の声を選ぶ（なるべく自然に聞こえるものを優先） */
function pickVoice(): SpeechSynthesisVoice | null {
  const s = synth();
  if (!s) return null;
  const ja = s.getVoices().filter(isJapanese);
  if (ja.length === 0) return null;
  const rank = (v: SpeechSynthesisVoice) =>
    (/google|natural|online|kyoko|o-ren|nanami|haruka|otoya/i.test(v.name) ? 0 : 2) + (v.localService ? 0 : 1);
  return [...ja].sort((a, b) => rank(a) - rank(b))[0];
}

const listeners = new Set<() => void>();
function notify() {
  listeners.forEach((f) => f());
}

export type VoiceStatus = 'ok' | 'loading' | 'no-japanese' | 'unsupported';

/** 読み上げが使えるか。声の一覧がまだ来ていないあいだは loading */
export function voiceStatus(): VoiceStatus {
  const s = synth();
  if (!s) return 'unsupported';
  if (!voice) voice = pickVoice();
  if (voice) return 'ok';
  return s.getVoices().length === 0 ? 'loading' : 'no-japanese';
}

/** 状態が変わったら知らせる（声の一覧が届いたときなど） */
export function onVoiceChange(f: () => void) {
  listeners.add(f);
  return () => listeners.delete(f);
}

let wanted = false;
/** カジノを開いているあいだだけ声の準備をする（ほかの画面で音楽を止めないため） */
export function setVoiceWanted(v: boolean) {
  wanted = v;
}

/** 画面に触れたその場で無音の読み上げをして、iPhone などでも声を出せるようにする */
export function primeVoice() {
  if (!wanted || isMuted()) return;
  const s = synth();
  if (!s || primed) return;
  primed = true;
  try {
    s.resume();
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    u.lang = 'ja-JP';
    s.speak(u);
  } catch {
    primed = false;
  }
}

if (synth()) {
  synth()!.addEventListener?.('voiceschanged', () => {
    voice = pickVoice();
    notify();
  });
  // 一覧が届いたことを知らせない端末のために、少しのあいだ見に行く
  let tries = 0;
  const poll = window.setInterval(() => {
    if (voiceStatus() !== 'loading' || ++tries > 20) {
      window.clearInterval(poll);
      notify();
    }
  }, 250);
  for (const type of ['pointerdown', 'touchend', 'keydown', 'click']) {
    window.addEventListener(type, primeVoice, { capture: true, passive: true });
  }
}

/** 読み上げに向かない記号や（かっこ書き）を外す */
function speakable(text: string) {
  return text
    .replace(/（[^）]*）/g, '')
    .replace(/[★▲△◎○☆！!]/g, (m) => (m === '！' || m === '!' ? '、' : ''))
    .replace(/\s+/g, ' ')
    .trim();
}

export interface SpeakOptions {
  /** 話す速さ（1 が普通）。実況は速め */
  rate?: number;
  pitch?: number;
  /** いま話している途中のものを止めて、すぐ話す */
  interrupt?: boolean;
}

function start(s: SpeechSynthesis, text: string, opts: SpeakOptions, delay = 0) {
  const u = new SpeechSynthesisUtterance(speakable(text));
  u.lang = 'ja-JP';
  if (voice) u.voice = voice;
  u.rate = opts.rate ?? 1.1;
  u.pitch = opts.pitch ?? 1;
  u.volume = 1;
  const finish = () => {
    if (current !== u) return;
    current = null;
    window.clearTimeout(watchdog);
    const next = pending;
    pending = null;
    if (next && !isMuted()) start(s, next.text, next.opts);
  };
  u.onend = finish;
  u.onerror = finish;
  // 終わりの知らせが来ない端末があるので、長すぎたら次へ進む
  window.clearTimeout(watchdog);
  watchdog = window.setTimeout(finish, 1500 + text.length * 260);
  current = u;
  const go = () => {
    if (current !== u) return;
    s.resume();
    s.speak(u);
  };
  if (delay) window.setTimeout(go, delay);
  else go();
}

export function speak(text: string, opts: SpeakOptions = {}) {
  const s = synth();
  if (!s || isMuted()) return;
  if (!voice) voice = pickVoice();
  // 日本語の声がない端末では、英語の声が変な読み方をするので読まない（字幕だけ）
  if (!voice && s.getVoices().length > 0) return;
  if (opts.interrupt) {
    pending = null;
    current = null;
    s.cancel();
    // 止めた直後に読むと黙ってしまう端末があるので、ひと呼吸おく
    start(s, text, opts, 60);
    return;
  }
  if (current) {
    // 話している途中なら、終わってから最新の1つだけを読む（古い実況は捨てる）
    pending = { text, opts };
    return;
  }
  start(s, text, opts);
}

export function stopSpeaking() {
  pending = null;
  current = null;
  window.clearTimeout(watchdog);
  synth()?.cancel();
}
