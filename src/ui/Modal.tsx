// 画面の真ん中に開くメニュー（不動産屋・カジノ）。Esc か背景のクリックで閉じる
import { useEffect } from 'react';
import type { ReactNode } from 'react';

interface Props<T extends string> {
  title: string;
  onClose: () => void;
  tabs: { id: T; label: string }[];
  tab: T;
  onTab: (t: T) => void;
  children: ReactNode;
  /** 見た目を変えるための追加のクラス（カジノなど） */
  className?: string;
}

export function Modal<T extends string>({ title, onClose, tabs, tab, onTab, children, className }: Props<T>) {
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
          <div className="modal-title">{title}</div>
          <div className="modal-tabs">
            {tabs.map((t) => (
              <button key={t.id} className={`tool${t.id === tab ? ' on' : ''}`} onClick={() => onTab(t.id)}>
                {t.label}
              </button>
            ))}
          </div>
          <button className="tool close" onClick={onClose} aria-label="閉じる">✕ 閉じる</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
