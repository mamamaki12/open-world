import { useCallback, useEffect, useRef, useState } from 'react';
import { canPlaceStair } from '../building/rules';
import { sampleHouse } from '../building/sample';
import { emptyHouse } from '../building/types';
import { autosave, loadAutosave, loadSlot, saveSlot, slotInfos } from '../save/storage';
import { useVehicles } from '../state/vehicles';
import { useGame } from '../state/store';
import type { Tool } from '../state/store';
import { useInteraction } from '../state/interaction';
import { Scene } from '../world/Scene';
import { Inspector } from './Inspector';
import { ToolOptions } from './ToolOptions';
import { patchPart } from './edit';
import { WalkHud } from './WalkHud';
import { DealerPanel } from './DealerPanel';
import { BoutiquePanel } from './BoutiquePanel';
import { TunerPanel } from './TunerPanel';
import { ExchangePanel } from './ExchangePanel';
import { LooksPanel } from './LooksPanel';
import { useLooks } from '../state/looks';
import { WorldActionHud, LandPurchasePanel } from './WorldActionHud';
import { ShopPanel } from './ShopPanel';
import { RequestsPanel } from './RequestsPanel';
import { ArcadePanel } from './ArcadePanel';
import { CasinoPanel } from './CasinoPanel';
import { EstatePanel } from './EstatePanel';
import { MapPanel } from './MapPanel';
import { BuildChip, MoneyBar, useEconomyClock } from './MoneyBar';
import { JobsPanel } from './jobs/JobsPanel';
import { BuildButton, BuildMenu } from './BuildMenu';
import { yen } from '../economy/money';
import { useEconomy } from '../state/economy';
import { Sheet, TouchCameraPad, TouchWalkControls } from './TouchControls';
import { useTouchDevice } from './useTouchDevice';
import { walkActions } from '../state/touch';
import { QuickBar, ControlsPanel, InventoryPanel } from './QuickBar';
import { reloadLatest } from './reload';
import { FurnitureDesigner } from './FurnitureDesigner';
import { leaveWorld, useSession } from '../session/session';
import { downloadBackup } from '../session/saves';
import { VersionStatus } from './VersionStatus';

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
  const driving = useVehicles(s => s.driving !== null || s.riding !== null);
  const overlay = useGame((s) => s.overlay);
  const touch = useTouchDevice();
  const walking = useGame((s) => s.mode === 'walk');
  const app = useRef<HTMLDivElement>(null);
  useTopBarHeight(app, touch, walking, driving);
  useNoPageZoom(touch);
  // 見た目をまだ作っていなければ、最初に作成画面を出す（前からのセーブも一度だけ）。自動テストのブラウザでは出さない
  useEffect(() => { if (!useLooks.getState().created && !navigator.webdriver) useGame.getState().setOverlay('looks'); }, []);
  return (
    <div ref={app} className={`app ${walking ? 'walk' : 'build'}${touch ? ' touch' : ''}${driving ? ' driving' : ''}${overlay ? ' has-overlay' : ''}`}>
      <Scene />
      {!touch && (
        <>
          {walking ? <div className="topbar walk-toolbar"><ModeButton/><button className="tool" onClick={()=>useGame.getState().setOverlay('jobs')}>バイト</button><button className="tool" onClick={()=>useGame.getState().setOverlay('closet')}>クローゼット</button><button className="tool" onClick={()=>useGame.getState().setOverlay('looks-edit')}>見た目</button><button className="tool" onClick={()=>useGame.getState().setOverlay('controls')}>操作設定</button><SaveMenu/></div> : <TopBar />}
          <MoneyBar />
        </>
      )}
      {touch ? <TouchLayout walking={walking} /> : walking ? (
        <>
          <WalkHud />
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
          <ControlsHelp />
        </>
      )}
      {walking && <WorldActionHud />}
      {walking && <QuickBar />}
      {overlay === 'controls' && <ControlsPanel />}
      {overlay === 'inventory' && <InventoryPanel />}
      {overlay === 'dealer' && <DealerPanel />}
      {overlay === 'tuner' && <TunerPanel />}
      {overlay === 'exchange' && <ExchangePanel />}
      {overlay === 'boutique' && <BoutiquePanel />}
      {overlay === 'closet' && <BoutiquePanel closetOnly />}
      {overlay === 'looks' && <LooksPanel mode="create" />}
      {overlay === 'looks-edit' && <LooksPanel mode="edit" />}
      {overlay === 'salon' && <LooksPanel mode="salon" />}
      {overlay === 'land' && <LandPurchasePanel />}
      {overlay === 'shop' && <ShopPanel />}
      {overlay === 'requests' && <RequestsPanel />}
      {overlay === 'arcade' && <ArcadePanel />}
      {overlay === 'estate' && <EstatePanel />}
      {overlay === 'casino' && <CasinoPanel />}
      {overlay === 'map' && <MapPanel />}
      {overlay === 'jobs' && <JobsPanel />}
      <FurnitureDesigner />
      <Toast />
    </div>
  );
}

/** スマホ・タブレットの画面：上のバーの代わりに小さなボタンを四隅に置き、建築は「建てる」ボタンから大きなメニューで選ぶ */
function TouchLayout({ walking }: { walking: boolean }) {
  const overlay = useGame(s => s.overlay);
  const tool = useGame((s) => s.tool);
  const setTool = useGame((s) => s.setTool);
  const selected = useGame((s) => s.selection !== null);
  const label = TOOLS.find((t) => t.id === tool)?.label ?? '';
  const [menu, setMenu] = useState(false);
  const closeMenu = useCallback(() => setMenu(false), []);
  // 歩いているとき（何も持っていない）は、画面には歩く操作と建てるボタンだけを出し、ほかはメニューにしまう。
  // 歩きながら道具を持っているときは、右下のボタンで手ぶらに戻る
  const bare = walking && tool === 'select';
  return (
    <>
      {walking ? <WalkMenu /> : <TouchHud />}
      {!walking && (
        <div className="touch-right">
          <BuildButton label={label} onOpen={() => setMenu(true)} />
          <TouchCameraPad />
        </div>
      )}
      {walking ? (
        <>
          <WalkHud />
          <MapButton />
          {!overlay && !menu && <TouchWalkControls build={<BuildButton label={label} onOpen={() => (tool === 'select' ? setMenu(true) : setTool('select'))} />} />}
        </>
      ) : (
        <div className="touch-dock">
          {selected && (
            <Sheet key="inspector" title="選んだパーツ" defaultOpen>
              <Inspector />
            </Sheet>
          )}
        </div>
      )}
      {!bare && <ControlsHelp />}
      {menu && <BuildMenu tools={TOOLS} walking={walking} onClose={closeMenu} />}
    </>
  );
}

/** 歩いているときの左上：メニューボタンと所持金だけ。建築に戻る・建てる・地図・取り消し・セーブはメニューの中 */
/** 歩いているときの右上の丸い地図ボタン */
function MapButton() {
  const setOverlay = useGame((s) => s.setOverlay);
  return (
    <button className="touch-map" onClick={() => setOverlay('map')} aria-label="町の地図">
      🗺️
    </button>
  );
}

function WalkMenu() {
  const [open, setOpen] = useState(false);
  const setMode = useGame((s) => s.setMode);
  const undo = useGame((s) => s.undo);
  const canUndo = useGame((s) => s.past.length > 0);
  const money = useEconomy((s) => s.money);
  const pick = (f: () => void) => () => {
    setOpen(false);
    f();
  };
  return (
    <div className="touch-hud walk-menu">
      <div className="touch-hud-row">
        <button className={`tool icon${open ? ' on' : ''}`} onClick={() => setOpen(!open)} aria-label="メニュー" aria-expanded={open}>
          ☰
        </button>
        <span className={`touch-cash plain${money < 0 ? ' minus' : ''}`}>{yen(money)}</span>
      </div>
      {open && (
        <div className="walk-menu-list">
          <button className="walk-menu-item" onClick={pick(() => setMode('build'))}>🏗️ 建築に戻る</button>
          <button className="walk-menu-item" onClick={pick(() => walkActions.toggleView())}>👁 視点を切り替え</button>
          <button className="walk-menu-item" onClick={pick(() => useGame.getState().setOverlay('closet'))}>👕 クローゼット</button>
          <button className="walk-menu-item" onClick={pick(() => useGame.getState().setOverlay('looks-edit'))}>🙂 見た目を変える</button>
          <button className="walk-menu-item" onClick={pick(() => useGame.getState().setOverlay('controls'))}>⚙ 操作設定</button>
          <button className="walk-menu-item" disabled={!canUndo} onClick={pick(undo)}>↶ 取り消し</button>
          <SaveMenu />
          <button className="walk-menu-item" onClick={pick(reloadLatest)}>🔄 最新版にする</button>
        </div>
      )}
    </div>
  );
}

/** スマホの左上：モード切り替え・取り消し・セーブと、所持金・不動産屋・カジノ */
function TouchHud() {
  const holding=useGame(s=>s.tool!=='select');
  const undo = useGame((s) => s.undo);
  const redo = useGame((s) => s.redo);
  const canUndo = useGame((s) => s.past.length > 0);
  const canRedo = useGame((s) => s.future.length > 0);
  const setOverlay = useGame((s) => s.setOverlay);
  const money = useEconomy((s) => s.money);
  return (
    <div className="touch-hud">
      <div className="touch-hud-row">
        <ModeButton />
        <button className={`tool icon${holding?' history-label':''}`} disabled={!canUndo} onClick={undo} aria-label="取り消し">
          ↶{holding&&' 取り消す'}
        </button>
        <button className={`tool icon${holding?' history-label':''}`} disabled={!canRedo} onClick={redo} aria-label="やり直し">
          ↷{holding&&' やり直す'}
        </button>
        <SaveMenu />
      </div>
      <div className="touch-hud-row">
        <span className={`touch-cash${money < 0 ? ' minus' : ''}`}>{yen(money)}</span>
        <button className="tool icon labeled" onClick={() => setOverlay('map')} aria-label="町の地図">
          🗺<span>地図</span>
        </button>
        <button className="tool icon labeled" onClick={() => setOverlay('jobs')} aria-label="バイト">
          💼<span>バイト</span>
        </button>
        <BuildChip />
      </div>
    </div>
  );
}

/** iPhone の Safari はページの拡大を止める指定を無視するので、2本指のつまみで画面ごと拡大されないようにする */
function useNoPageZoom(touch: boolean) {
  useEffect(() => {
    if (!touch) return;
    const stop = (e: Event) => e.preventDefault();
    document.addEventListener('gesturestart', stop);
    document.addEventListener('gesturechange', stop);
    return () => {
      document.removeEventListener('gesturestart', stop);
      document.removeEventListener('gesturechange', stop);
    };
  }, [touch]);
}

/** 上のバー（折り返すと高さが変わる）とお金のバーの下端を CSS 変数にして、その下に他の表示を並べる */
function useTopBarHeight(app: React.RefObject<HTMLDivElement>, touch: boolean, walking: boolean, driving: boolean) {
  useEffect(() => {
    const root = app.current;
    const bars = root ? [...root.querySelectorAll('.topbar, .moneybar, .touch-hud-row')] : [];
    if (!root || bars.length === 0) return;
    const update = () => {
      const top = root.getBoundingClientRect().top;
      const bottom = (sel: string) => Math.ceil((root.querySelector(sel)?.getBoundingClientRect().bottom ?? top) - top);
      root.style.setProperty('--top-h', `${bottom('.topbar')}px`);
      root.style.setProperty('--hud-top', `${Math.max(bottom('.topbar'), bottom('.moneybar'), ...Array.from(root.querySelectorAll('.touch-hud-row'), b => Math.ceil(b.getBoundingClientRect().bottom - top)))}px`);
    };
    update();
    const ro = new ResizeObserver(update);
    bars.forEach((b) => ro.observe(b));
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [app, touch, walking, driving]);
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
              setTool(tool === t.id ? 'select' : t.id); // もう一度押すと手ぶらに戻る
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

function SaveMenu() {
  const [open, setOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [, refresh] = useState(0);
  const house = useGame((s) => s.house);
  const replaceHouse = useGame((s) => s.replaceHouse);
  const notify = useGame((s) => s.notify);
  // スマホの共有建築中も、ここから開始画面へ戻れるようにする。
  const busy = useSession((s) => s.busy);
  const sessionMessage = useSession((s) => s.message);
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
          <div className="row">
            <button className="btn" onClick={downloadBackup}>バックアップ</button>
            <button className="btn" disabled={busy} onClick={() => void leaveWorld()}>保存して開始画面へ</button>
          </div>
          {sessionMessage && <p className="info" role="status">{sessionMessage}</p>}
          <VersionStatus />
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
  const eraseMulti = useGame((s) => s.eraseMulti);
  let text: string;
  if (tool === 'erase' && !walking) {
    const click = eraseMulti ? (touch ? 'タップ：選ぶ・外す' : 'クリック：選ぶ・外す') : touch ? 'タップ：消す' : 'クリック：消す';
    text = touch
      ? `${click}　${eraseMulti ? 'なぞる：範囲で選ぶ' : 'なぞる：回す'}　2本指：移動・ズーム`
      : `${click}　ドラッグ：範囲で選ぶ　${eraseMulti ? 'Delete：まとめて削除　' : ''}右ドラッグ：回転`;
  } else if (touch) {
    const place = tool === 'erase' ? 'タップ：消す' : tool === 'floor' || tool === 'roof' || tool === 'wall' ? 'なぞる：置く' : 'タップ：置く';
    if (walking) text = tool === 'select' ? 'スティック：歩く（端まで倒すと走る）　なぞる：見回す' : `${place}　${['floor', 'roof', 'wall'].includes(tool) ? '2本指：見回す' : 'なぞる：見回す'}`;
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
  // スマホでは画面が狭いので、道具やモードを変えたときだけ少しの間出して消す
  const [faded, setFaded] = useState(false);
  useEffect(() => {
    setFaded(false);
    if (!touch) return;
    const t = setTimeout(() => setFaded(true), 6000);
    return () => clearTimeout(t);
  }, [text, touch]);
  // 「　」で区切った操作ごとに折り返す（途中で折れて読みにくくならないように）
  return (
    <div className={`controls-help${faded ? ' faded' : ''}`}>
      {text.split('　').map((t) => (
        <span key={t}>{t}</span>
      ))}
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
      if ((s.house === prev.house && !(prev.dragBase && !s.dragBase)) || s.dragBase) return;
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
      if (e.code === 'KeyB' && walking) { e.preventDefault();s.setOverlay('inventory');return; }
      if (e.code === 'KeyM') {
        s.setOverlay('map');
        return;
      }
      const digit = /^(?:Digit|Numpad)([1-9])$/.exec(e.code);
      if (digit) {
        const t = TOOLS.find((x) => x.key === digit[1]);
        // 持っているツールの数字をもう一度押すと手ぶら（選択）に戻る
        if (t) s.setTool(walking ? t.id : t.id === s.tool ? 'select' : t.id);
        return;
      }
      if (e.key === 'Escape') {
        s.select(null);
        s.setTool('select');
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
        if (s.marked.length) s.deleteMarked();
        else s.deleteSelected();
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
          if (f && !f.wallMount) patchPart('furniture', f.id, { rotation: (f.rotation + 90) % 360 });
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
        if (f && !f.wallMount) {
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

