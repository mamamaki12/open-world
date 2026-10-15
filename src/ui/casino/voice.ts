// 実況やディーラーの声。ブラウザの読み上げ（Web Speech API）で日本語の声を出す。効果音と同じ 🔊 で消せる
import { isMuted } from './sfx';

let voice: SpeechSynthesisVoice | null | undefined;

function synth(): SpeechSynthesis | null {
  return typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
}

/** 日本語の声を選ぶ（なるべく自然に聞こえるものを優先） */
function pickVoice(): SpeechSynthesisVoice | null {
  const s = synth();
  if (!s) return null;
  const ja = s.getVoices().filter((v) => v.lang.replace('_', '-').toLowerCase().startsWith('ja'));
  if (ja.length === 0) return null;
  const rank = (v: SpeechSynthesisVoice) => (/google|natural|online|kyoko|o-ren|nanami|haruka/i.test(v.name) ? 0 : 1);
  return [...ja].sort((a, b) => rank(a) - rank(b))[0];
}

if (synth()) {
  synth()!.addEventListener?.('voiceschanged', () => {
    voice = pickVoice();
  });
}

/** 読み上げに向かない記号や（かっこ書き）を外す */
function speakable(text: string) {
  return text
    .replace(/（[^）]*）/g, '')
    .replace(/[★▲△◎○☆]/g, '')
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

export function speak(text: string, opts: SpeakOptions = {}) {
  const s = synth();
  if (!s || isMuted()) return;
  if (voice === undefined) voice = pickVoice();
  const u = new SpeechSynthesisUtterance(speakable(text));
  u.lang = 'ja-JP';
  if (voice) u.voice = voice;
  u.rate = opts.rate ?? 1.1;
  u.pitch = opts.pitch ?? 1;
  u.volume = 1;
  // 遅れて古い実況が流れないよう、たまっている分は捨てる
  if (opts.interrupt || s.speaking || s.pending) s.cancel();
  s.speak(u);
}

export function stopSpeaking() {
  synth()?.cancel();
}
