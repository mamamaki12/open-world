import type { ReactNode } from 'react';
import './icons.css';

// Original 24px drawings for Open World. No font glyphs or external icon library.
import { ICON_PATHS as drawings, type IconName } from './iconPaths';
export type { IconName } from './iconPaths';

export function AppIcon({ name, className = '' }: { name: IconName; className?: string }) {
  return <svg className={`app-icon ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.7" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true" focusable="false" data-icon={name}>
    <path d={drawings[name]} />
  </svg>;
}

const legacy: Record<string, IconName> = {
  '⬜':'floor','🧱':'wall','🚪':'door','🪟':'window','🪜':'stair','🏠':'house','🛋':'furniture','🗑':'erase','🔨':'hammer','🏗':'hammer','👆':'hand',
  '🏪':'store','🏮':'stall','⛺':'tent','🗺':'map','📍':'pin','💼':'briefcase','👥':'people','🤝':'handshake','⚙':'settings','👁':'eye',
  '👕':'shirt','🙂':'face','💇':'hair','🚶':'walk','🚗':'car','🚤':'boat','🚴':'bike','🏇':'horse','🏞':'landscape','🕹':'arcade','🐹':'hamster',
  '🎰':'slots','🎡':'wheel','🃏':'cards','🎟':'ticket','🎫':'ticket','🔔':'bell','🍉':'watermelon','🍒':'cherry','🍋':'lemon',
  '★':'star','⭐':'star','📖':'book','♠':'spade','♥':'heart','♦':'diamond','♣':'club','♚':'crown','♛':'crown','♞':'horse','🎉':'celebration',
  '⛶':'fullscreen','🔊':'volume','🔈':'volume','🔇':'mute','🔑':'key','📈':'chart','📅':'calendar','🧰':'toolbox',
  '📣':'megaphone','📷':'camera','🎨':'palette','🔧':'wrench','☀':'sun','☁':'cloud','☂':'rain','❄':'snow','🔗':'link','🔄':'refresh',
  '⟲':'undo','⟳':'rotate','◉':'wheel','◆':'diamond','●':'bell','☰':'menu','↶':'undo','↷':'redo','↺':'undo','↻':'rotate','↗':'expand','◀':'left','▶':'right','←':'left','→':'right',
  '↑':'up','↓':'down','▲':'up','▼':'down','▴':'up','▾':'down','✕':'close','×':'close','✓':'check','✔':'check','💾':'save','⏰':'clock',
};
const pictograph = /\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*|[★♠♥♦♣♚♛♞⛶☰⟲⟳◉◆●↶↷↺↻↗◀▶←→↑↓▲▼▴▾✕✓✔]/gu;

/** Convert application-owned labels only; user input and form values stay untouched. */
export function iconText(value: ReactNode): ReactNode {
  if (typeof value !== 'string') return value;
  // Mathematical symbols in labels are text; these are icons only on their own.
  const leading = /^([+＋−－\-×✕])(?=\s)/.exec(value);
  if (leading) return <><AppIcon name={['+','＋'].includes(leading[1]) ? 'plus' : ['×','✕'].includes(leading[1]) ? 'close' : 'minus'} />{value.slice(1)}</>;
  const standalone = value.trim();
  if (standalone === '×' || standalone === '✕') return <AppIcon name="close" />;
  if (standalone === '+' || standalone === '＋' || standalone === '−' || standalone === '-' || standalone === '－') {
    return <AppIcon name={standalone === '+' || standalone === '＋' ? 'plus' : 'minus'} />;
  }
  const matches = [...value.matchAll(pictograph)];
  if (!matches.length) return value;
  const parts: ReactNode[] = [];
  let from = 0;
  for (const match of matches) {
    const at = match.index!;
    if (at > from) parts.push(value.slice(from, at));
    parts.push(<AppIcon key={at} name={legacy[match[0].replace(/\uFE0F/g, '')] ?? 'spark'} />);
    from = at + match[0].length;
  }
  if (from < value.length) parts.push(value.slice(from));
  return parts;
}

