import { useEffect, useState } from 'react';
import { App } from '../ui/App';
import { useGame } from '../state/store';
import { useVehicles } from '../state/vehicles';
import { useTouchDevice } from '../ui/useTouchDevice';
import { VersionStatus } from '../ui/VersionStatus';
import { initializeSave, savedBundle, renameGuest, downloadBackup, importSave } from './saves';
import { allowBuilding, joinShared, currentEndpoint, enterOffline, leaveWorld, startSessionTimers, useSession } from './session';
import './session.css';

let initialization: Promise<void> | undefined;
const initialRelay = () => new URLSearchParams(location.search).get('relay') || localStorage.getItem('open-world:relay') || import.meta.env.VITE_WORLD_RELAY || (import.meta.env.DEV ? 'ws://127.0.0.1:8787' : '');
export function SessionRoot() {
  const [ready, setReady] = useState(false), [failure, setFailure] = useState('');
  const screen = useSession(s => s.screen);
  const replaced = useSession(s => s.replaced);
  useEffect(() => { let alive = true; initialization ??= initializeSave();
    initialization.then(() => { if (alive) setReady(true); }).catch(e => { if (alive) setFailure(String(e.message)); });
    return () => { alive = false; };
  }, []);
  useEffect(() => { if (ready) return startSessionTimers(); }, [ready]);
  // Existing regression scripts deliberately bypass the launcher in development only.
  useEffect(() => { if (ready && import.meta.env.DEV && new URLSearchParams(location.search).get('play') === '1') void enterOffline(); }, [ready]);
  if (!ready) return <main className="world-launch"><section className="world-card"><h1>OPEN WORLD</h1><p>{failure || 'ワールドを読み込んでいます…'}</p>{failure && <p>このブラウザの保存領域を利用できるか確認してください。既存セーブは削除していません。</p>}</section></main>;
  return screen === 'menu' ? <Launcher/> : <>{!replaced && <App/>}<SessionHud/></>;
}
function Launcher() {
  const profile = savedBundle().profile, [name, setName] = useState(profile.name), [relay, setRelay] = useState(initialRelay);
  const [error, setError] = useState(''), [working, setWorking] = useState(false);
  const state = useSession();
  const run = async (action: () => Promise<void>) => { setWorking(true); setError(''); try { await renameGuest(name); localStorage.setItem('open-world:relay', relay); await action(); } catch (e) { setError(e instanceof Error ? e.message : '開始できませんでした'); } finally { setWorking(false); } };
  return <main className="world-launch">
    <div className="world-glow" aria-hidden="true" />
    <section className="world-card">
      <p className="world-eyebrow">BUILD A PLACE TOGETHER</p>
      <h1>OPEN WORLD</h1>
      <p className="world-subtitle">今日は、どの町で過ごす？</p>
      <label className="world-field">
        プレイヤー名
        <input aria-label="あなたの名前" maxLength={24} value={name} onChange={e => setName(e.target.value)} autoComplete="nickname" placeholder="名前を入力" />
      </label>
      <div className="world-choices">
        <button className="world-choice world-primary" disabled={working} onClick={() => void run(enterOffline)}>
          <span className="choice-icon">🏠</span>
          <span><strong>ひとりで遊ぶ</strong><span>自分の町を続ける · オフライン対応</span></span>
        </button>
        <button className="world-choice" disabled={working || !relay || state.status === 'connecting'} onClick={() => void run(() => joinShared(relay))}>
          <span className="choice-icon">🌐</span>
          <span><strong>みんなのワールドで遊ぶ</strong><span>みんなで1つの町に住む · 最大10人</span></span>
        </button>
      </div>
      {!relay && <p className="world-note">友達とのプレイは、接続先を設定後に利用できます。</p>}
      <details>
        <summary>接続・バックアップ設定</summary>
        <label className="world-field">オンライン接続先<input value={relay} onChange={e => setRelay(e.target.value)} placeholder="wss://…" type="url"/></label>
        <div className="world-actions">
          <button onClick={downloadBackup}>バックアップを書き出す</button>
          <label className="world-import">バックアップを読み込む<input type="file" accept="application/json,.json" onChange={e => { const f = e.target.files?.[0]; if (!f) return; if (f.size > 10e6) return setError('バックアップは10MBまでです'); void run(async () => { await importSave(await f.text()); setName(savedBundle().profile.name); }); }}/></label>
        </div>
      </details>
      <p className="world-note">ログイン不要。データはこのブラウザに保存されます。</p>
      {!!savedBundle().pending?.length && <p className="world-note">精算待ちの建築が{savedBundle().pending!.length}件あります。同じ町へ再参加するとホストの記録と照合して精算します。</p>}
      {(error || state.message || state.status === 'connecting') && <p className="world-error" role="status">{error || state.message || 'ワールドに接続しています…'}</p>}
      <VersionStatus />
    </section>
  </main>;
}
function SessionHud() {
  const state = useSession(), [open, setOpen] = useState(false), [notice, setNotice] = useState('');
  const invite = async () => { const url = new URL(location.href); url.search = ''; url.searchParams.set('room', state.code); url.searchParams.set('relay', currentEndpoint());
    try { await navigator.clipboard.writeText(url.href); setNotice('招待リンクをコピーしました'); } catch { setNotice(`招待コード: ${state.code}`); } };
  // ひとりで遊ぶときは浮いた表示を出さない（開始画面へ・バックアップはセーブメニューの中）。お店などの画面を開いている間も隠す
  // スマホの建築中は四隅のボタンが多いので出さない（歩いているときだけ上の中央に小さく出す）
  const touch = useTouchDevice(), building = useGame(g => g.mode !== 'walk');
  const inCar = useVehicles(v => !!v.driving || !!v.riding);
  const gameOverlay = useGame(g => g.overlay);
  const overlay = gameOverlay || (touch && (building || inCar));
  return <><aside className="world-session">
    {state.role !== 'home' && !overlay && <button className="world-session-toggle" onClick={() => setOpen(!open)}>{touch ? `👥 ${state.members.length}` : state.shared ? `みんなのワールド · ${state.members.length}人` : `${state.code} · ${state.members.length}/4人`}{state.busy ? ' · 確定中' : ''}</button>}
    {open && state.role !== 'home' && !overlay && <section className="world-session-panel"><h2>一緒に遊んでいる人</h2>
      {state.members.map(m => <div className="world-member" key={m.id}><span>{m.name}{m.host ? '（ホスト）' : ''}</span>{state.role === 'host' && !m.host && <label><input type="checkbox" checked={m.canBuild} onChange={e => allowBuilding(m.id, e.target.checked)}/>共同建築</label>}</div>)}
      {state.shared ? <p className="world-note">町はサーバーに保存され、だれが抜けても残ります。持ち主のいる土地は、その人と持ち主が許可した人だけが建てられます（不動産屋の「この土地の家」で許可）。建築・着工は無料です。土地の購入や買い物にはお金がかかります。</p> : <><p>招待コード: <strong>{state.code}</strong></p><button onClick={() => void invite()}>招待リンクをコピー</button><p className="world-note">建築・着工は無料です。配置したものはこの町に残ります。</p></>}
      <button onClick={downloadBackup}>自分のデータをバックアップ</button><button disabled={state.busy} onClick={() => void leaveWorld()}>保存して開始画面へ</button>
      {(notice || state.message) && <p role="status">{notice || state.message}</p>}
    </section>}
    {state.status === 'reconnecting' && !gameOverlay && <p className="world-network-warning" role="status">{state.message}</p>}
  </aside>
    {state.status === 'closed' && <div className="world-disconnected"><section className="world-card"><h2>接続が終了しました</h2><p>{state.message || '自分の町へ戻れます'}</p><button onClick={() => void leaveWorld()}>{state.replaced ? '開始画面へ戻る' : '自分の町へ戻る'}</button></section></div>}
  </>;
}
