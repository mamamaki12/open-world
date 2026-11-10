import { IconLabel, iconText, type IconName } from './AppIcon';
// 画面の真ん中に開くメニュー（不動産屋・カジノ）。Esc か背景のクリックで閉じる
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useSession } from '../session/session';

interface Props<T extends string> {
  title: string;
  onClose: () => void;
  /** icon・short があれば、スマホではアイコン＋短い文字にする */
  tabs: { id: T; label: string; icon?: IconName; short?: string }[];
  tab: T;
  onTab: (t: T) => void;
  children: ReactNode;
  /** 見た目を変えるための追加のクラス（カジノなど） */
  className?: string;
}

export function Modal<T extends string>({ title, onClose, tabs, tab, onTab, children, className }: Props<T>) {
  const reconnecting = useSession(s => s.status === 'reconnecting');
  const networkMessage = useSession(s => s.message);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="overlay" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal${className ? ` ${className}` : ''}`} role="dialog" aria-label={title}>
        <div className="modal-head">
          <div className="modal-title">{iconText(title)}</div>
          <div className="modal-tabs">
            {tabs.map((t) => (
              <button key={t.id} className={`tool${t.id === tab ? ' on' : ''}`} onClick={() => onTab(t.id)} title={t.icon ? t.label : undefined}>
                {t.icon ? <IconLabel icon={t.icon} text={t.label} short={t.short} /> : iconText(t.label)}
              </button>
            ))}
          </div>
          <button className="tool close" onClick={onClose} aria-label="閉じる" title="閉じる"><IconLabel icon="close" text="閉じる" pcIcon /></button>
        </div>
        <div className="modal-body">{reconnecting && <p className="modal-network-warning" role="status">{networkMessage}</p>}{children}</div>
      </div>
    </div>
  );
}
