import { useEffect, useState } from 'react';
import { MAX_LEVEL, levelName } from '../building/dimensions';
import { canPlaceStair } from '../building/rules';
import { sampleHouse } from '../building/sample';
import { emptyHouse } from '../building/types';
import { autosave, loadAutosave, loadSlot, saveSlot, slotInfos } from '../save/storage';
import { useGame } from '../state/store';
import type { Tool } from '../state/store';
import { useInteraction } from '../state/interaction';
import { Scene } from '../world/Scene';
import { Inspector } from './Inspector';
import { ToolOptions } from './ToolOptions';
import { patchPart } from './edit';

const TOOLS: { id: Tool; label: string; key: string }[] = [
  { id: 'select', label: '選択', key: 'V' },
  { id: 'floor', label: '床', key: 'F' },
  { id: 'wall', label: '壁', key: 'W' },
  { id: 'door', label: 'ドア', key: 'D' },
  { id: 'window', label: '窓', key: 'N' },
  { id: 'stair', label: '階段', key: 'S' },
  { id: 'roof', label: '屋根', key: 'T' },
  { id: 'furniture', label: '家具', key: 'G' },
  { id: 'erase', label: '削除', key: 'E' },
];

// 起動時：前回の自動セーブがあれば続きから、なければサンプルの家
useGame.setState({ house: loadAutosave() ?? sampleHouse() });

export function App() {
  useKeyboard();
  useAutosave();
  return (
    <div className="app">
      <Scene />
      <TopBar />
      <div className="side left">
        <ToolOptions />
      </div>
      <div className="side right">
        <Inspector />
      </div>
      <LevelBar />
      <ControlsHelp />
      <Toast />
    </div>
  );
}

function TopBar() {
  const tool = useGame((s) => s.tool);
  const setTool = useGame((s) => s.setTool);
  const undo = useGame((s) => s.undo);
  const redo = useGame((s) => s.redo);
  const canUndo = useGame((s) => s.past.length > 0);
  const canRedo = useGame((s) => s.future.length > 0);
  return (
    <div className="topbar">
      <div className="brand">家づくり</div>
      <div className="tools">
        {TOOLS.map((t) => (
          <button key={t.id} className={`tool${tool === t.id ? ' on' : ''}`} onClick={() => setTool(t.id)} title={`ショートカット：${t.key}`}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="tools">
        <button className="tool" disabled={!canUndo} onClick={undo} title="Ctrl+Z">
          ↶ 取り消し
        </button>
        <button className="tool" disabled={!canRedo} onClick={redo} title="Ctrl+Y">
          ↷ やり直し
        </button>
      </div>
      <SaveMenu />
    </div>
  );
}

function LevelBar() {
  const level = useGame((s) => s.activeLevel);
  const showAll = useGame((s) => s.showAll);
  const setLevel = useGame((s) => s.setLevel);
  const setShowAll = useGame((s) => s.setShowAll);
  const levels = Array.from({ length: MAX_LEVEL + 1 }, (_, i) => i);
  return (
    <div className="levelbar">
      <span className="levelbar-label">作業する階</span>
      {levels
        .slice()
        .reverse()
        .map((l) => (
          <button
            key={l}
            className={`tool${level === l ? ' on' : ''}`}
            onClick={() => {
              setLevel(l);
              setShowAll(false);
            }}
          >
            {levelName(l)}
          </button>
        ))}
      <label className="check">
        <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
        上の階と屋根も表示
      </label>
    </div>
  );
}

function SaveMenu() {
  const [open, setOpen] = useState(false);
  const [, refresh] = useState(0);
  const house = useGame((s) => s.house);
  const replaceHouse = useGame((s) => s.replaceHouse);
  const notify = useGame((s) => s.notify);
  return (
    <div className="save">
      <button className="tool" onClick={() => setOpen(!open)}>
        セーブ / ロード ▾
      </button>
      {open && (
        <div className="save-menu">
          <p className="info">自動セーブされています。別の家を残したいときはスロットに保存します。</p>
          {slotInfos().map(({ slot, savedAt }) => (
            <div key={slot} className="slot">
              <span>
                スロット{slot}
                <small>{savedAt ? new Date(savedAt).toLocaleString('ja-JP') : '空き'}</small>
              </span>
              <button
                className="btn small"
                onClick={() => {
                  notify(saveSlot(slot, house) ? `スロット${slot}に保存しました` : '保存できませんでした');
                  refresh((n) => n + 1);
                }}
              >
                保存
              </button>
              <button
                className="btn small"
                disabled={!savedAt}
                onClick={() => {
                  const h = loadSlot(slot);
                  if (h) {
                    replaceHouse(h);
                    notify(`スロット${slot}を読み込みました`);
                    setOpen(false);
                  }
                }}
              >
                読込
              </button>
            </div>
          ))}
          <div className="row">
            <button
              className="btn"
              onClick={() => {
                replaceHouse(sampleHouse());
                setOpen(false);
              }}
            >
              サンプルの家
            </button>
            <button
              className="btn danger"
              onClick={() => {
                if (confirm('いまの家をすべて消して、更地から始めますか？（取り消しで戻せます）')) {
                  replaceHouse(emptyHouse());
                  setOpen(false);
                }
              }}
            >
              更地にする
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ControlsHelp() {
  const tool = useGame((s) => s.tool);
  const building = tool !== 'select' && tool !== 'erase';
  return (
    <div className="controls-help">
      {building ? '右ドラッグ：回転　中ドラッグ / Shift+右ドラッグ：移動' : '左ドラッグ：回転　右ドラッグ：移動'}　ホイール：ズーム　Ctrl+Z：取り消し
    </div>
  );
}

function Toast() {
  const message = useGame((s) => s.message);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!message) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 2500);
    return () => clearTimeout(t);
  }, [message]);
  if (!message || !visible) return null;
  return <div className="toast">{message.text}</div>;
}

function useAutosave() {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsub = useGame.subscribe((s, prev) => {
      if (s.house === prev.house || s.dragBase) return;
      clearTimeout(timer);
      timer = setTimeout(() => autosave(useGame.getState().house), 400);
    });
    return () => {
      clearTimeout(timer);
      unsub();
    };
  }, []);
}

function useKeyboard() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA') return;
      const s = useGame.getState();
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) s.redo();
        else s.undo();
        return;
      }
      if (ctrl && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        s.redo();
        return;
      }
      if (ctrl) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        s.deleteSelected();
        return;
      }
      if (e.key === 'Escape') {
        s.select(null);
        s.setTool('select');
        return;
      }
      const sel = s.selection;
      if (e.key.toLowerCase() === 'r') {
        if (s.tool === 'stair') {
          const ui = useInteraction.getState();
          ui.setStairRot(((ui.stairRot + 1) % 4) as 0 | 1 | 2 | 3);
        } else if (s.tool === 'furniture') {
          s.setDefaults({ furnitureRotation: (s.defaults.furnitureRotation + 90) % 360 });
        } else if (sel?.kind === 'furniture') {
          const f = s.house.furniture.find((p) => p.id === sel.id);
          if (f) patchPart('furniture', f.id, { rotation: (f.rotation + 90) % 360 });
        } else if (sel?.kind === 'stair') {
          const st = s.house.stairs.find((p) => p.id === sel.id);
          if (st) {
            const rot = ((st.rot + 1) % 4) as 0 | 1 | 2 | 3;
            const err = canPlaceStair(s.house, { level: st.level, x: st.x, z: st.z, rot }, st.id);
            if (err) s.notify(err);
            else patchPart('stair', st.id, { rot });
          }
        }
        return;
      }
      const arrows: Record<string, [number, number]> = {
        ArrowLeft: [-0.05, 0],
        ArrowRight: [0.05, 0],
        ArrowUp: [0, -0.05],
        ArrowDown: [0, 0.05],
      };
      if (arrows[e.key] && sel?.kind === 'furniture') {
        e.preventDefault();
        const f = s.house.furniture.find((p) => p.id === sel.id);
        if (f) {
          const [dx, dz] = arrows[e.key];
          patchPart('furniture', f.id, { x: +(f.x + dx).toFixed(3), z: +(f.z + dz).toFixed(3) });
        }
        return;
      }
      if (e.key === '1' || e.key === '2') {
        s.setLevel(Number(e.key) - 1);
        s.setShowAll(false);
        return;
      }
      const tool = TOOLS.find((t) => t.key === e.key.toUpperCase());
      if (tool) s.setTool(tool.id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
