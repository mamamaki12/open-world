import { useEffect, useState } from 'react';
import { App } from '../ui/App';
import { initializeSave, savedBundle, renameGuest, downloadBackup, importSave } from './saves';
import { allowBuilding, connectWorld, currentEndpoint, enterOffline, leaveWorld, startSessionTimers, useSession } from './session';
import './session.css';

let initialization: Promise<void> | undefined;
const initialRelay = () => new URLSearchParams(location.search).get('relay') || localStorage.getItem('open-world:relay') || import.meta.env.VITE_WORLD_RELAY || (import.meta.env.DEV ? 'ws://127.0.0.1:8787' : '');
export function SessionRoot() {
  const [ready, setReady] = useState(false), [failure, setFailure] = useState('');
  const screen = useSession(s => s.screen);
  useEffect(() => { let alive = true; initialization ??= initializeSave();
    initialization.then(() => { if (alive) setReady(true); }).catch(e => { if (alive) setFailure(String(e.message)); });
    return () => { alive = false; };
  }, []);
  useEffect(() => { if (ready) return startSessionTimers(); }, [ready]);
  // Existing regression scripts deliberately bypass the launcher in development only.
  useEffect(() => { if (ready && import.meta.env.DEV && new URLSearchParams(location.search).get('play') === '1') void enterOffline(); }, [ready]);
  if (!ready) return <main className="world-launch"><section className="world-card"><h1>OPEN WORLD</h1><p>{failure || 'ワールドを読み込んでいます…'}</p>{failure && <p>このブラウザの保存領域を利用できるか確認してください。既存セーブは削除していません。</p>}</section></main>;
  return screen === 'menu' ? <Launcher/> : <><App/><SessionHud/></>;
}
function Launcher() {
  const profile = savedBundle().profile, [name, setName] = useState(profile.name), [relay, setRelay] = useState(initialRelay);
  const [code, setCode] = useState(() => new URLSearchParams(location.search).get('room') || '');
  const [error, setError] = useState(''), [working, setWorking] = useState(false);
  const state = useSession();
  const run = async (action: () => Promise<void>) => { setWorking(true); setError(''); try { await renameGuest(name); localStorage.setItem('open-world:relay', relay); await action(); } catch (e) { setError(e instanceof Error ? e.message : '開始できませんでした'); } finally { setWorking(false); } };
  return <main className="world-launch"><section className="world-card">
    <p className="world-eyebrow">BUILD A PLACE TOGETHER</p><h1>OPEN WORLD</h1><p className="world-subtitle">今日は、どの町で過ごす？</p>
    <label className="world-field">あなたの名前<input maxLength={24} value={name} onChange={e => setName(e.target.value)} autoComplete="nickname"/></label>
    <button className="world-choice world-primary" disabled={working} onClick={() => void run(enterOffline)}><strong>ひとりで遊ぶ</strong><span>自分の町を続ける · オフライン対応</span></button>
    <button className="world-choice" disabled={working || !relay || state.status === 'connecting'} onClick={() => void run(() => connectWorld(relay))}><strong>自分のワールドを開く</strong><span>友達を招待して、一緒に町をつくる</span></button>
    <div className="world-join"><label className="world-field">招待コード<input value={code} onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-F0-9]/g, '').slice(0, 8))} maxLength={8} placeholder="8文字のコード"/></label><button disabled={working || !relay || code.length !== 8 || state.status === 'connecting'} onClick={() => void run(() => connectWorld(relay, code))}>友達のワールドに入る</button></div>
    {!relay && <p className="world-note">友達とのプレイは、オンライン接続先の設定後に利用できます。</p>}
    <details><summary>接続・バックアップ</summary><label className="world-field">オンライン接続先<input value={relay} onChange={e => setRelay(e.target.value)} placeholder="wss://…" type="url"/></label>
      <div className="world-actions"><button onClick={downloadBackup}>バックアップを書き出す</button><label className="world-import">バックアップを読み込む<input type="file" accept="application/json,.json" onChange={e => { const f = e.target.files?.[0]; if (!f) return; if (f.size > 10e6) return setError('バックアップは10MBまでです'); void run(async () => { await importSave(await f.text()); setName(savedBundle().profile.name); }); }}/></label></div>
    </details><p className="world-note">ログイン不要。データはこのブラウザに保存されます。</p>
    {!!savedBundle().pending?.length && <p className="world-note">精算待ちの建築が{savedBundle().pending!.length}件あります。同じ町へ再参加するとホストの記録と照合して精算します。</p>}
    {(error || state.message || state.status === 'connecting') && <p className="world-error" role="status">{error || state.message || 'ワールドに接続しています…'}</p>}
  </section></main>;
}
function SessionHud() {
  const state = useSession(), [open, setOpen] = useState(false), [notice, setNotice] = useState('');
  const invite = async () => { const url = new URL(location.href); url.search = ''; url.searchParams.set('room', state.code); url.searchParams.set('relay', currentEndpoint());
    try { await navigator.clipboard.writeText(url.href); setNotice('招待リンクをコピーしました'); } catch { setNotice(`招待コード: ${state.code}`); } };
  return <aside className="world-session">
    <button className="world-session-toggle" onClick={() => setOpen(!open)}>{state.role === 'home' ? 'ひとりでプレイ中' : `${state.code} · ${state.members.length}/4人`}{state.busy ? ' · 確定中' : ''}</button>
    {open && <section className="world-session-panel"><h2>{state.role === 'home' ? '自分のワールド' : '一緒に遊んでいる人'}</h2>
      {state.members.map(m => <div className="world-member" key={m.id}><span>{m.name}{m.host ? '（ホスト）' : ''}</span>{state.role === 'host' && !m.host && <label><input type="checkbox" checked={m.canBuild} onChange={e => allowBuilding(m.id, e.target.checked)}/>共同建築</label>}</div>)}
      {state.role !== 'home' && <><p>招待コード: <strong>{state.code}</strong></p><button onClick={() => void invite()}>招待リンクをコピー</button><p className="world-note">建築費は建てた本人が支払います。配置したものはこの町に残ります。元に戻しても支払った建材費は戻りません。</p></>}
      <button onClick={downloadBackup}>自分のデータをバックアップ</button><button disabled={state.busy} onClick={() => void leaveWorld()}>保存して開始画面へ</button>
      {(notice || state.message) && <p role="status">{notice || state.message}</p>}
    </section>}
    {state.status === 'reconnecting' && <p className="world-network-warning" role="status">{state.message}</p>}
    {state.status === 'closed' && <div className="world-disconnected"><section className="world-card"><h2>接続が終了しました</h2><p>{state.message || '自分の町へ戻れます'}</p><button onClick={() => void leaveWorld()}>自分の町へ戻る</button></section></div>}
  </aside>;
}
