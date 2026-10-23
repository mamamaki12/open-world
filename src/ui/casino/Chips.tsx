import { iconText } from '../AppIcon';
// カジノのチップ（額ごとに色が決まっている）と、当たったときのコインの演出
import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { yen } from '../../economy/money';

export const CHIP_VALUES = [1_000, 10_000, 100_000, 1_000_000, 10_000_000] as const;
const CHIP_COLORS: Record<number, string> = {
  1_000: '#f4f1ea',
  10_000: '#c62828',
  100_000: '#1f5fbf',
  1_000_000: '#1c1c1c',
  10_000_000: '#c9a03c',
};

export function chipLabel(v: number): string {
  if (v >= 100_000_000) return `${+(v / 100_000_000).toFixed(1)}億`;
  if (v >= 10_000_000) return `${+(v / 10_000_000).toFixed(1)}千万`;
  if (v >= 10_000) return `${+(v / 10_000).toFixed(1)}万`;
  if (v >= 1_000) return `${+(v / 1_000).toFixed(1)}千`;
  return String(v);
}

/** 額にいちばん近いチップの色（台に積んだ額の表示用） */
function colorFor(v: number) {
  let c = CHIP_VALUES[0] as number;
  for (const x of CHIP_VALUES) if (v >= x) c = x;
  return CHIP_COLORS[c];
}

export function Chip({ value, size = 48, label, on, onClick, disabled, title }: {
  value: number;
  size?: number;
  label?: string;
  on?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
}) {
  const bg = colorFor(value);
  const light = bg === CHIP_COLORS[1_000] || bg === CHIP_COLORS[10_000_000];
  const text = label ?? chipLabel(value);
  const fontSize = Math.round(size * (text.length >= 4 ? 0.19 : text.length === 3 ? 0.23 : 0.27));
  const style = { '--chip': bg, '--chip-ink': light ? '#222' : '#fff', width: size, height: size, fontSize } as CSSProperties;
  const content = <span>{iconText(text)}</span>;
  if (!onClick) return <span className="ow-chip" style={style} title={title}>{content}</span>;
  return (
    <button type="button" className={`ow-chip${on ? ' on' : ''}`} style={style} onClick={onClick} disabled={disabled} title={title ?? yen(value)}>
      {content}
    </button>
  );
}

/** 額を大きいチップから順に分けて、積んだ山として見せる（最大 max 枚） */
export function ChipStack({ amount, max = 10 }: { amount: number; max?: number }) {
  const chips = useMemo(() => {
    const out: number[] = [];
    let rest = amount;
    for (let i = CHIP_VALUES.length - 1; i >= 0 && out.length < max; i--) {
      while (rest >= CHIP_VALUES[i] && out.length < max) {
        out.push(CHIP_VALUES[i]);
        rest -= CHIP_VALUES[i];
      }
    }
    return out.reverse();
  }, [amount, max]);
  return (
    <span className="chip-stack" aria-hidden>
      {chips.map((v, i) => (
        <span key={i} className="stack-chip" style={{ '--chip': CHIP_COLORS[v], bottom: i * 4 } as CSSProperties} />
      ))}
    </span>
  );
}

/** 当たったときに降ってくるコインと、真ん中の文字。key を変えると何度でも出る */
export function WinBurst({ text, amount, level }: { text: string; amount: number; level: 0 | 1 | 2 }) {
  const [alive, setAlive] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setAlive(false), level === 2 ? 4200 : 2600);
    return () => clearTimeout(t);
  }, [level]);
  const coins = useMemo(
    () =>
      Array.from({ length: level === 2 ? 60 : level === 1 ? 32 : 14 }, () => ({
        left: Math.random() * 100,
        delay: Math.random() * (level === 2 ? 1.6 : 0.9),
        dur: 1.1 + Math.random() * 0.9,
        size: 14 + Math.random() * 14,
        spin: Math.random() > 0.5 ? 1 : -1,
      })),
    [level],
  );
  if (!alive) return null;
  return (
    <div className={`win-burst level-${level}`} aria-live="polite">
      {coins.map((c, i) => (
        <i
          key={i}
          className="coin"
          style={{ left: `${c.left}%`, animationDelay: `${c.delay}s`, animationDuration: `${c.dur}s`, width: c.size, height: c.size, '--spin': c.spin } as CSSProperties}
        />
      ))}
      <div className="win-text">
        <b>{iconText(text)}</b>
        <span>+{yen(amount)}</span>
      </div>
    </div>
  );
}
