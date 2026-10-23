import { iconText } from './AppIcon';
import { useEffect, useState } from 'react';
import { useSession } from '../session/session';
import { reloadLatest } from './reload';
import { compareBuild, fetchLatestBuild } from './version';
import type { AppBuild, VersionResult } from './version';
import './version.css';

type Result = VersionResult | { status: 'checking' | 'offline' | 'error' };
const date = (value: string) => new Date(value).toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
export function VersionStatus() {
  const currentBuild: AppBuild = __APP_BUILD__;
  const [result, setResult] = useState<Result>({ status: 'checking' });
  const [attempt, setAttempt] = useState(0), [updating, setUpdating] = useState(false), [error, setError] = useState('');
  const busy = useSession(s => s.busy);
  useEffect(() => {
    const recheck = () => setAttempt(n => n + 1);
    window.addEventListener('online', recheck); window.addEventListener('offline', recheck);
    return () => { window.removeEventListener('online', recheck); window.removeEventListener('offline', recheck); };
  }, []);
  useEffect(() => {
    if (!navigator.onLine) { setResult({ status: 'offline' }); return; }
    let active = true;
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 8000);
    setResult({ status: 'checking' });
    void fetchLatestBuild(controller.signal).then(latest => {
      if (active) setResult(compareBuild(currentBuild, latest));
    }).catch(() => { if (active) setResult({ status: navigator.onLine ? 'error' : 'offline' }); })
      .finally(() => clearTimeout(timeout));
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, [attempt]);
  const update = async () => {
    setError(''); setUpdating(true);
    try { await reloadLatest(); }
    catch { setError('保存できなかったため更新を中止しました。もう一度お試しください。'); setUpdating(false); }
  };
  const message = result.status === 'checking' ? '最新版を確認中…' : result.status === 'current' ? '最新版です' :
    result.status === 'update' ? '新しいWeb版があります' : result.status === 'offline' ? 'オフラインのため最新版を確認できません' :
    result.status === 'unavailable' ? '公開情報の反映待ちです。少し後でもう一度確認してください' : '最新版を確認できません。接続を確認して再確認してください';
  return <section className="app-version" aria-label="Web版のバージョン">
    <div className="version-current"><strong>Web版 {currentBuild.version}</strong><time dateTime={currentBuild.builtAt}>{date(currentBuild.builtAt)}</time></div>
    <p className={'version-status ' + result.status} role="status">{message}</p>
    {result.status === 'update' && result.latest && <p className="version-latest">最新版：{result.latest.version}（{date(result.latest.builtAt)}）</p>}
    <div className="version-actions">
      <button className="version-button" onClick={() => setAttempt(n => n + 1)} disabled={result.status === 'checking' || updating}>最新版を確認</button>
      <button className="version-button version-update" onClick={() => void update()} disabled={busy || updating || result.status === 'offline'}>{iconText(updating ? '保存して更新中…' : '🔄 最新版にする')}</button>
    </div>
    {error && <p className="version-error" role="alert">{error}</p>}
  </section>;
}
