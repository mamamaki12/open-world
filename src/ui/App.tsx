import { useEffect, useRef, useState } from 'react';
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
import { WalkHud } from './WalkHud';
import { CasinoPanel } from './CasinoPanel';
import { EstatePanel } from './EstatePanel';
import { MoneyBar, useEconomyClock } from './MoneyBar';
import { Sheet, TouchCameraPad, TouchWalkControls } from './TouchControls';
import { useTouchDevice } from './useTouchDevice';

// ツールは数字キーで持ち替える（WASD はカメラ・歩く操作に使う）
const TOOLS: { id: Tool; label: string; key: string }[] = [
  { id: 'select', label: '選択', key: '1' },
  { id: 'floor', label: '床', key: '2' },
  { id: 'wall', label: '壁', key: '3' },
  { id: 'door', label: 'ドア', key: '4' },
  { id: 'window', label: '窓', key: '5' },
  { id: 'stair', label: '階段', key: '6' },
  { id: 'roof', label: '屋根', key: '7' },
  { id: 'furniture', label: '家具', key: '8' },
  { id: 'erase', label: '削除', key: '9' },
];

// 起動時：前回の自動セーブがあれば続きから、なければサンプルの家
useGame.setState({ house: loadAutosave() ?? sampleHouse() });

export function App() {
  useKeyboard();
  useAutosave();
  useEconomyClock();
  const overlay = useGame((s) => s.overlay);
  const touch = useTouchDevice();
  const walking = useGame((s) => s.mode === 'walk');
  const holding = useGame((s) => s.tool !== 'select');
  const app = useRef<HTMLDivElement>(null);
  useTopBarHeight(app);
  return (
    <div ref={app} className={`app ${walking ? 'walk' : 'build'}${touch ? ' touch' : ''}`}>
      <Scene />
      <TopBar />
      <MoneyBar />
      {touch ? <TouchLayout walking={walking} holding={holding} /> : walking ? (
        <>
          <WalkHud />
          {holding && (
            <>
              <div className="side left">
                <ToolOptions />
              </div>
              <LevelBar />
            </>
          )}
          <ControlsHelp />
        </>
      ) : (
        <>
          <div className="side left">
            <ToolOptions />
          </div>
          <div className="side right">
            <Inspector />
          </div>
          <LevelBar />
          <ControlsHelp />
        </>
      )}
      {overlay === 'estate' && <EstatePanel />}
      {overlay === 'casino' && <CasinoPanel />}
      <Toast />
    </div>
  );
}

/** スマホ・タブレットの画面：パネルは下の引き出しにまとめ、指で操作するボタンを出す */
function TouchLayout({ walking, holding }: { walking: boolean; holding: boolean }) {
  const tool = useGame((s) => s.tool);
  const selected = useGame((s) => s.selection !== null);
  const label = TOOLS.find((t) => t.id === tool)?.label ?? '';
  if (walking) {
    return (
      <>
        <WalkHud />
        <TouchWalkControls />
        {holding && (
          <div className="touch-top">
            <LevelBar />
            <Sheet title={`${label}の設定`} className="compact">
              <ToolOptions />
            </Sheet>
          </div>
        )}
        <ControlsHelp />
      </>
    );
  }
  return (
    <>
      <TouchCameraPad />
      <div className="touch-dock">
        <LevelBar />
        {selected ? (
          <Sheet key="inspector" title="選んだパーツ" defaultOpen>
            <Inspector />
          </Sheet>
        ) : (
          <Sheet key={tool} title={tool === 'select' ? '使い方' : `${label}の設定`}>
            <ToolOptions />
          </Sheet>
        )}
      </div>
      <ControlsHelp />
    </>
  );
}

/** 上のバーの高さ（折り返すと変わる）を CSS 変数にして、その下に他の表示を並べる */
function useTopBarHeight(app: React.RefObject<HTMLDivElement>) {
  useEffect(() => {
    const root = app.current;
    const bar = root?.querySelector('.topbar');
    if (!root || !bar) return;
    const update = () => root.style.setProperty('--top-h', `${Math.ceil(bar.getBoundingClientRect().bottom)}px`);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(bar);
    return () => ro.disconnect();
  }, [app]);
}

function ModeButton() {
  const mode = useGame((s) => s.mode);
  const setMode = useGame((s) => s.setMode);
  return (
    <button
      className="tool mode on"
      onClick={(e) => {
        e.currentTarget.blur(); // Space（ジャンプ）でボタンが押し直されないように
        setMode(mode === 'walk' ? 'build' : 'walk');
      }} title="Tab キーでも切り替えられます">
      {mode === 'walk' ? '建築に戻る' : '歩いてみる'}
      <span className="kbd-hint">（Tab）</span>
    </button>
  );
}

function TopBar() {
  const tool = useGame((s) => s.tool);
  const setTool = useGame((s) => s.setTool);
  const undo = useGame((s) => s.undo);
  const redo = useGame((s) => s.redo);
  const canUndo = useGame((s) => s.past.length > 0);
  const canRedo = useGame((s) => s.future.length > 0);
  const walking = useGame((s) => s.mode === 'walk');
  return (
    <div className="topbar">
      <div className="brand">家づくり</div>
      <ModeButton />
      <div className="tools tool-list">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            className={`tool${tool === t.id ? ' on' : ''}`}
            onClick={(e) => {
              e.currentTarget.blur(); // Space（ジャンプ）でボタンが押し直されないように
              setTool(t.id);
            }}
            title={`ショートカット：${t.key}`}
          >
            <kbd className="key">{t.key}</kbd>
            {walking && t.id === 'select' ? '手ぶら' : t.label}
          </button>
        ))}
      </div>
      <div className="tools history">
        <button className="tool" disabled={!canUndo} onClick={(e) => {
            e.currentTarget.blur();
            undo();
          }} title="Ctrl+Z">
          ↶<span className="btn-label"> 取り消し</span>
        </button>
        <button className="tool" disabled={!canRedo} onClick={(e) => {
            e.currentTarget.blur();
            redo();
          }} title="Ctrl+Y">
          ↷<span className="btn-label"> やり直し</span>
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
  const walking = useGame((s) => s.mode === 'walk');
  const levels = Array.from({ length: MAX_LEVEL + 1 }, (_, i) => i);
  return (
    <div className="levelbar">
      <span className="levelbar-label">作業する階<span className="kbd-hint">（Z / X）</span></span>
      {levels
        .slice()
        .reverse()
        .map((l) => (
          <button
            key={l}
            className={`tool${level === l ? ' on' : ''}`}
            onClick={(e) => {
              e.currentTarget.blur();
              setLevel(l);
              if (!walking) setShowAll(false);
            }}
          >
            {levelName(l)}
          </button>
        ))}
      {walking ? (
        <span className="levelbar-label auto-hint">階を移動すると自動で切り替わります</span>
      ) : (
        <label className="check">
          <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
          上の階<span className="btn-label">と</span>屋根も表示
        </label>
      )}
    </div>
  );
}

function SaveMenu() {
  const [open, setOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [, refresh] = useState(0);
  const house = useGame((s) => s.house);
  const replaceHouse = useGame((s) => s.replaceHouse);
  const notify = useGame((s) => s.notify);
  return (
    <div className="save">
      <button
        className="tool"
        onClick={() => {
          setOpen(!open);
          setConfirmClear(false);
        }}
      >
        セーブ<span className="btn-label"> / ロード</span> ▾
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
              title="取り消し（Ctrl+Z）で戻せます"
              onClick={() => {
                // 誤操作防止のため2回押しで実行する
                if (!confirmClear) return setConfirmClear(true);
                replaceHouse(emptyHouse());
                setConfirmClear(false);
                setOpen(false);
              }}
            >
              {confirmClear ? 'もう一度押すと全部消します' : '更地にする'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ControlsHelp() {
  const tool = useGame((s) => s.tool);
  const walking = useGame((s) => s.mode === 'walk');
  const building = tool !== 'select' && tool !== 'erase';
  const touch = useTouchDevice();
  let text: string;
  if (touch) {
    const place = tool === 'erase' ? 'タップ：消す' : tool === 'floor' || tool === 'roof' || tool === 'wall' ? 'なぞる：置く' : 'タップ：置く';
    if (walking) text = tool === 'select' ? 'スティック：歩く（端まで倒すと走る）　なぞる：見回す' : `${place}　2本指：見回す`;
    else text = building || tool === 'erase' ? `${place}　2本指：移動・ズーム` : 'タップ：選ぶ　なぞる：回す　2本指：移動・ズーム';
  } else if (walking) {
    text =
      tool === 'select'
        ? '数字キー 2〜9：建てるツールを持つ'
        : `左クリック：${tool === 'erase' ? '消す' : '置く'}　右ドラッグ：見回す　WASD：歩く　1 / Esc：手ぶらに戻る`;
  } else {
    text = `WASD / 矢印：移動　Q / E：回る　${
      building ? '右ドラッグ：回転　中ドラッグ / Shift+右ドラッグ：移動' : '左ドラッグ：回転　右ドラッグ：移動'
    }　ホイール：ズーム`;
  }
  return <div className="controls-help">{text}</div>;
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
      // 不動産屋・カジノを開いている間はゲームのキー操作を止める（Esc で閉じるのはメニュー側）
      if (s.overlay) return;
      if (e.key === 'Tab') {
        e.preventDefault();
        s.setMode(s.mode === 'walk' ? 'build' : 'walk');
        return;
      }
      // 歩く・カメラを動かすキー（WASD など）はプレイヤー側・カメラ側で受ける
      const walking = s.mode === 'walk';
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
      const digit = /^(?:Digit|Numpad)([1-9])$/.exec(e.code);
      if (digit) {
        const t = TOOLS.find((x) => x.key === digit[1]);
        if (t) s.setTool(t.id);
        return;
      }
      if (e.key === 'Escape') {
        s.select(null);
        s.setTool('select');
        return;
      }
      // Z：下の階 / X：上の階
      if (e.code === 'KeyZ' || e.code === 'PageDown' || e.code === 'KeyX' || e.code === 'PageUp') {
        const up = e.code === 'KeyX' || e.code === 'PageUp';
        const next = Math.min(Math.max(s.activeLevel + (up ? 1 : -1), 0), MAX_LEVEL);
        if (next !== s.activeLevel) {
          s.setLevel(next);
          if (!walking) s.setShowAll(false);
          s.notify(`作業する階：${levelName(next)}`);
        }
        return;
      }
      if (walking) {
        // 歩きながらでも、置く前の階段・家具の向きは R で変えられる
        if (e.code === 'KeyR') {
          if (s.tool === 'stair') {
            const ui = useInteraction.getState();
            ui.setStairRot(((ui.stairRot + 1) % 4) as 0 | 1 | 2 | 3);
          } else if (s.tool === 'furniture') {
            s.setDefaults({ furnitureRotation: (s.defaults.furnitureRotation + 90) % 360 });
          }
        }
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        s.deleteSelected();
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
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
