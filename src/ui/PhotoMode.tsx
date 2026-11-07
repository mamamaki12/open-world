// 写真モード：画面の表示を全部消し、時間帯・天気を選んで景色を撮る。撮った写真は保存・共有できる
import { useEffect, useState } from 'react';
import { usePhoto } from '../state/photo';
import { iconText } from './AppIcon';
import type { Weather } from '../world/climate';
import './guide.css';

const HOURS: { label: string; hour: number | null }[] = [
  { label: 'いま', hour: null }, { label: '朝', hour: 7 }, { label: '昼', hour: 12 }, { label: '夕方', hour: 17.6 }, { label: '夜', hour: 21 },
];
const WEATHERS: { label: string; weather: Weather | null }[] = [
  { label: 'いま', weather: null }, { label: '晴れ', weather: 'clear' }, { label: 'くもり', weather: 'cloudy' }, { label: '雨', weather: 'rain' }, { label: '雪', weather: 'snow' },
];

function capture(): string | null {
  const src = [...document.querySelectorAll('canvas')].sort((a, b) => b.width * b.height - a.width * a.height)[0];
  if (!src?.width) return null;
  try { return src.toDataURL('image/jpeg', 0.92); } catch { return null; }
}

async function share(url: string) {
  const name = `open-world-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.jpg`;
  try {
    const file = new File([await (await fetch(url)).blob()], name, { type: 'image/jpeg' });
    if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: 'Open World の写真' }); return; }
  } catch { /* 共有できなければ保存にする */ }
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
}

export function PhotoMode() {
  const { hour, weather, set } = usePhoto();
  const [shot, setShot] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  const [panel, setPanel] = useState(true);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') set({ on: false }); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [set]);
  const take = () => {
    // 写す一瞬だけ操作パネルも消す
    requestAnimationFrame(() => { const url = capture(); if (url) setShot(url); setFlash(true); setTimeout(() => setFlash(false), 180); });
  };
  return (
    <div className="photo-bar">
      {flash && <div className="photo-flash" />}
      {shot ? (
        <div className="photo-preview">
          <img src={shot} alt="撮った写真" />
          <div className="photo-row">
            <button className="btn primary" onClick={() => share(shot)}>{iconText('💾 保存・共有')}</button>
            <button className="btn" onClick={() => setShot(null)}>もう一枚</button>
          </div>
        </div>
      ) : (
        <div className="photo-controls">
          {panel && <>
            <div className="photo-row"><span>時間</span>{HOURS.map((h) => <button key={h.label} className={`tool${hour === h.hour ? ' on' : ''}`} onClick={() => set({ hour: h.hour })}>{h.label}</button>)}</div>
            <div className="photo-row"><span>天気</span>{WEATHERS.map((w) => <button key={w.label} className={`tool${weather === w.weather ? ' on' : ''}`} onClick={() => set({ weather: w.weather })}>{w.label}</button>)}</div>
          </>}
          <div className="photo-row main">
            <button className="tool" onClick={() => setPanel(!panel)}>{panel ? '設定をしまう' : '設定'}</button>
            <button className="photo-shutter" onClick={take} aria-label="撮る">{iconText('📷')}</button>
            <button className="tool" onClick={() => set({ on: false })}>{iconText('✕ 終わる')}</button>
          </div>
          <p className="photo-tip">ドラッグで向きを変えてから撮ります。時間と天気はあなたの画面だけ変わります。</p>
        </div>
      )}
    </div>
  );
}
