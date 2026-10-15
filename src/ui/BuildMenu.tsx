// スマホ用の建築メニュー：「建てる」ボタンから開き、道具を大きなカードで選び、その下で種類・素材・色を選ぶ
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useGame } from '../state/store';
import type { Tool } from '../state/store';
import { ToolOptions } from './ToolOptions';

const ICONS: Record<Tool, string> = {
  select: '👆',
  floor: '⬜',
  wall: '🧱',
  door: '🚪',
  window: '🪟',
  stair: '🪜',
  roof: '🏠',
  furniture: '🛋️',
  erase: '🗑️',
};

const DESCRIPTIONS: Record<Tool, string> = {
  select: 'パーツを選んで変える',
  floor: 'なぞって床を張る',
  wall: 'なぞって壁を立てる',
  door: '壁をタップして付ける',
  window: '壁をタップして付ける',
  stair: 'タップして置く',
  roof: 'なぞって屋根を載せる',
  furniture: 'タップして置く',
  erase: 'タップして消す',
};

export function toolIcon(tool: Tool) {
  return ICONS[tool];
}

/** 画面の右上に出す、建築メニューを開くボタン。いま持っている道具も表示する */
export function BuildButton({ label, onOpen }: { label: string; onOpen: () => void }) {
  const tool = useGame((s) => s.tool);
  const holding = tool !== 'select';
  return (
    <button className={`build-fab${holding ? ' holding' : ''}`} onClick={onOpen} aria-label="建築メニューを開く">
      <span className="build-fab-icon">{holding ? ICONS[tool] : '🔨'}</span>
      <span className="build-fab-label">{holding ? label : '建てる'}</span>
    </button>
  );
}

export function BuildMenu({
  tools,
  walking,
  levelBar,
  onClose,
}: {
  tools: { id: Tool; label: string }[];
  walking: boolean;
  levelBar: ReactNode;
  onClose: () => void;
}) {
  const tool = useGame((s) => s.tool);
  const setTool = useGame((s) => s.setTool);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="overlay build-menu-overlay" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="build-menu" role="dialog" aria-label="建築メニュー">
        <div className="build-menu-head">
          <span className="build-menu-title">🔨 建てる</span>
          <button className="btn primary build-menu-done" onClick={onClose}>
            決定
          </button>
        </div>
        <div className="build-menu-body">
          <div className="build-menu-tools">
            {tools.map((t) => (
              <button key={t.id} className={`tool-card${tool === t.id ? ' on' : ''}`} onClick={() => setTool(t.id)}>
                <span className="tool-card-icon">{ICONS[t.id]}</span>
                <span className="tool-card-name">{walking && t.id === 'select' ? '手ぶら' : t.label}</span>
                <span className="tool-card-desc">{walking && t.id === 'select' ? '何も持たずに歩く' : DESCRIPTIONS[t.id]}</span>
              </button>
            ))}
          </div>
          <div className="build-menu-options">
            {levelBar}
            <ToolOptions />
          </div>
        </div>
      </div>
    </div>
  );
}
