// カジノ・競技場：スロット、ルーレット、ハイ＆ロー、競馬、競輪、ボートレース。賭け金の上限はなし
import { useEffect, useRef, useState } from 'react';
import { yen } from '../economy/money';
import { useEconomy } from '../state/economy';
import { useGame } from '../state/store';
import { HighLow } from './casino/HighLow';
import { RaceGame } from './casino/RaceGame';
import { Roulette } from './casino/Roulette';
import { Slots } from './casino/Slots';
import { isMuted, setMuted } from './casino/sfx';
import { onVoiceChange, stopSpeaking, voiceStatus } from './casino/voice';
import { Modal } from './Modal';
import './casino/casino.css';

type Tab = 'slots' | 'roulette' | 'highlow' | 'horse' | 'keirin' | 'boat';
const TABS: { id: Tab; label: string }[] = [
  { id: 'slots', label: '🎰 スロット' },
  { id: 'roulette', label: '🎡 ルーレット' },
  { id: 'highlow', label: '🃏 ハイ＆ロー' },
  { id: 'horse', label: '🏇 競馬' },
  { id: 'keirin', label: '🚴 競輪' },
  { id: 'boat', label: '🚤 ボートレース' },
];

let lastTab: Tab = 'slots';

/** 所持金の表示：増えたり減ったりしたら、数字が回って色が光る */
function Wallet() {
  const money = useEconomy((s) => s.money);
  const [shown, setShown] = useState(money);
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);
  const from = useRef(money);
  useEffect(() => {
    const start = performance.now();
    const a = from.current;
    if (a === money) return;
    setFlash(money > a ? 'up' : 'down');
    let raf = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / 700);
      const v = Math.round(a + (money - a) * (1 - (1 - t) ** 3));
      from.current = v;
      setShown(v);
      if (t < 1) raf = requestAnimationFrame(step);
      else setFlash(null);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [money]);
  return (
    <div className={`casino-wallet${flash ? ` ${flash}` : ''}`}>
      <span className="wallet-label">所持金</span>
      <b className={`wallet-amount${money < 0 ? ' minus' : ''}`}>{yen(shown)}</b>
      <span className="wallet-note">賭け金に上限はありません。お金が尽きたら不動産屋の「家計簿・バイト」で立て直せます。</span>
    </div>
  );
}

function MuteButton() {
  const [muted, set] = useState(isMuted());
  return (
    <button
      className="btn small mute"
      onClick={() => {
        setMuted(!muted);
        set(!muted);
        if (!muted) stopSpeaking();
      }}
      aria-pressed={muted}
      title={muted ? '効果音と声を出す' : '効果音と声を消す'}
    >
      {muted ? '🔇' : '🔊'}
    </button>
  );
}

/** 日本語の読み上げが使えない端末では、実況が字幕だけになることを知らせる */
function VoiceNotice() {
  const [status, setStatus] = useState(voiceStatus);
  useEffect(() => {
    const off = onVoiceChange(() => setStatus(voiceStatus()));
    return () => {
      off();
    };
  }, []);
  if (status === 'ok' || status === 'loading') {
    // iPhone・iPad はマナーモードだと音が小さくなったり消えたりすることがある
    const ios = typeof navigator !== 'undefined' && (/iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
    if (!ios || isMuted()) return null;
    return <div className="casino-voice-note subtle">🔈 実況の声が聞こえないときは、マナーモードを切って音量を上げてください。</div>;
  }
  return (
    <div className="casino-voice-note" role="status">
      {status === 'unsupported'
        ? 'このブラウザは読み上げに対応していないので、実況とディーラーの声は字幕だけになります。'
        : 'この端末には日本語の読み上げ音声が入っていないので、実況とディーラーの声は字幕だけになります。'}
    </div>
  );
}

export function CasinoPanel() {
  const [tab, setTabState] = useState<Tab>(lastTab);
  const setTab = (t: Tab) => {
    lastTab = t;
    setTabState(t);
  };
  const close = useGame((s) => s.setOverlay);
  const race = tab === 'horse' || tab === 'keirin' || tab === 'boat';
  return (
    <Modal title="🎰 カジノ・競技場" className="casino-modal" onClose={() => close(null)} tabs={TABS} tab={tab} onTab={setTab}>
      <div className="casino-bar">
        <Wallet />
        <MuteButton />
      </div>
      <VoiceNotice />
      <div className={race ? `casino-paper ${tab}` : 'casino-felt'}>
        {tab === 'slots' && <Slots />}
        {tab === 'roulette' && <Roulette />}
        {tab === 'highlow' && <HighLow />}
        {race && <RaceGame key={tab} kind={tab} />}
      </div>
    </Modal>
  );
}
