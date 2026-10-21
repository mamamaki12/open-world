// スマホ用の建築メニュー：「建てる」ボタンから開き、道具を大きなカードで選び、その下で種類・素材・色を選ぶ
import { useEffect } from 'react';
import { buildMenuOpen } from '../state/controls';
import { useGame } from '../state/store';
import type { Tool } from '../state/store';
import { ToolOptions } from './ToolOptions';
import { PREFABS, placePrefab } from '../building/prefabs';
import { lotSize } from '../building/dimensions';
import { sessionGate } from '../session/gate';

const PREFAB_ICONS: Record<string, string> = { 'prefab-shop': '🏪', stall: '🏮', tent: '⛺' };

/** すぐ建つお店を、いまの土地の空いている場所に置く */
function placeShop(id: string, done: () => void) {
  const g = useGame.getState();
  const next = placePrefab(g.house, id, lotSize, crypto.randomUUID().slice(0, 8));
  if (typeof next === 'string') { g.notify(next); return; }
  g.commit(next);
  // 共有中はサーバーの確定を待つ。拒否や土地なしの通知を成功表示で上書きしない。
  if (!sessionGate.edit) g.notify('🏪 建てました。中のレジの前で F を押すとお店を開けます');
  done();
}

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
  select: '選んで変える',
  floor: 'なぞって張る',
  wall: 'なぞって立てる',
  door: '壁をタップ',
  window: '壁をタップ',
  stair: 'タップして置く',
  roof: 'なぞって載せる',
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
  onClose,
}: {
  tools: { id: Tool; label: string }[];
  walking: boolean;
  onClose: () => void;
}) {
  const tool = useGame((s) => s.tool);
  const setTool = useGame((s) => s.setTool);
  useEffect(() => {
    buildMenuOpen.current = true;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => { buildMenuOpen.current = false; window.removeEventListener('keydown', onKey); };
  }, [onClose]);
  return (
    <div className="overlay build-menu-overlay" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="build-menu" role="dialog" aria-label="建築メニュー">
        <div className="build-menu-head">
          <span className="build-menu-title">🔨 建てる</span>
          <button className="btn" onClick={() => { useGame.getState().select(null); setTool('select'); onClose(); }}>道具をしまう</button>
          <button className="btn primary build-menu-done" onClick={onClose}>
            決定
          </button>
        </div>
        <div className="build-menu-body">
          <div className="build-menu-catalog">
          <div className="build-menu-tools">
            {tools.map((t) => (
              <button key={t.id} data-tool={t.id} className={`tool-card${tool === t.id ? ' on' : ''}`} onClick={() => setTool(t.id)}>
                <span className="tool-card-icon">{ICONS[t.id]}</span>
                <span className="tool-card-name">{walking && t.id === 'select' ? '手ぶら' : t.label}</span>
                <span className="tool-card-desc">{walking && t.id === 'select' ? '何も持たずに歩く' : DESCRIPTIONS[t.id]}</span>
              </button>
            ))}
          </div>
          <div className="build-menu-tools build-menu-prefabs" aria-label="すぐ建つお店">
            {PREFABS.map((p) => (
              <button key={p.id} className="tool-card" onClick={() => placeShop(p.id, onClose)}>
                <span className="tool-card-icon">{PREFAB_ICONS[p.id]}</span>
                <span className="tool-card-name">{p.name}</span>
                <span className="tool-card-desc">{p.desc}</span>
              </button>
            ))}
          </div>
          </div>
          <div className="build-menu-options">
            <ToolOptions />
          </div>
        </div>
      </div>
    </div>
  );
}
