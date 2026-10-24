import { iconText } from './AppIcon';
// カジノ・競技場：スロット、ルーレット、ハイ＆ロー、競馬、競輪、ボートレース。賭け金の上限はなし
import { useVenue } from '../state/venue';
import { useEffect, useRef, useState } from 'react';
import { yen } from '../economy/money';
import { useEconomy } from '../state/economy';
import { useGame } from '../state/store';
import { HighLow } from './casino/HighLow';
import { RaceGame } from './casino/RaceGame';
import { Roulette } from './casino/Roulette';
import { Slots } from './casino/Slots';
import { isMuted, setMuted } from './casino/sfx';
import { onVoiceChange, setVoiceWanted, stopSpeaking, voiceStatus } from './casino/voice';
import { Guide } from './casino/Guide';
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
      {iconText(muted ? '🔇' : '🔊')}
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
    return <div className="casino-voice-note subtle">{iconText("🔈 実況の声が聞こえないときは、マナーモードを切って音量を上げてください。")}</div>;
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
  const [tab, setTabState] = useState<Tab | null>(()=>useVenue.getState().game);
  const setTab = (t: Tab | null) => { stopSpeaking(); setTabState(t); };
  const close = useGame((s) => s.setOverlay);
  const race = tab === 'horse' || tab === 'keirin' || tab === 'boat';
  useEffect(() => {
    setVoiceWanted(true);
    return () => { setVoiceWanted(false); stopSpeaking(); };
  }, []);
  return (
    <Modal title={tab ? TABS.find(t => t.id === tab)!.label : '🎰 GRAND STRIP CASINO'} className={`casino-modal ${tab ? 'casino-playing' : 'casino-lobby-modal'}`} onClose={() => close(null)} tabs={[]} tab={tab ?? ''} onTab={() => undefined}>
      <div className="casino-bar">
        <Wallet />
        <MuteButton />
      </div>
      {!tab ? <CasinoLobby onSelect={setTab} /> : <>
      <div className="casino-game-nav">
        <button className="btn casino-back" onClick={() => setTab(null)}>{iconText("← ゲーム選択に戻る")}</button>
        <span>GRAND STRIP <i> / </i> {iconText(TABS.find(t => t.id === tab)!.label)}</span>
      </div>
      <VoiceNotice />
      <div className={race ? `casino-paper ${tab}` : 'casino-felt'}>
        <Guide key={`guide-${tab}`} game={tab} />
        {tab === 'slots' && <Slots />}
        {tab === 'roulette' && <Roulette />}
        {tab === 'highlow' && <HighLow />}
        {race && <RaceGame key={tab} kind={tab} />}
      </div>
      </>}
    </Modal>
  );
}

const GAME_DETAILS: Record<Tab, { tag: string; copy: string; icon: string; scene: string }> = {
  slots: { tag: 'SLOT LOUNGE', copy: 'リールを回して、幸運の一瞬を。', icon: '777', scene: 'slot' },
  roulette: { tag: 'ROULETTE SALON', copy: '一球の行方を見守る、華やかなテーブル。', icon: '◉', scene: 'wheel' },
  highlow: { tag: 'CARD ROOM', copy: '次の一枚を読む、シンプルな駆け引き。', icon: 'A♠', scene: 'cards' },
  horse: { tag: 'TURF CLUB', copy: 'パドックで選んだ一頭と、最後の直線へ。', icon: '🏇', scene: 'turf' },
  keirin: { tag: 'VELODROME', copy: 'ラインと脚質を読み、仕掛けの瞬間を待つ。', icon: '🚴', scene: 'track' },
  boat: { tag: 'MARINA RACE', copy: '水面を切り裂く6艇。ターンが勝負を分ける。', icon: '🚤', scene: 'water' },
};
function CasinoLobby({ onSelect }: { onSelect: (game: Tab) => void }) {
  return <div className="casino-lobby">
    <header className="casino-lobby-hero">
      <span className="lobby-eyebrow">WELCOME TO THE GRAND STRIP</span>
      <h1>今夜は、どこで遊ぶ？</h1>
      <p>華やかなフロアから、お好きなゲームへ。</p>
      <span className="lobby-diamond" aria-hidden="true">✦</span>
    </header>
    <div className="casino-game-grid">
      {TABS.map(game => { const detail = GAME_DETAILS[game.id]; return (
        <button key={game.id} className="casino-game-card" data-scene={detail.scene} onClick={() => onSelect(game.id)}>
          <div className="casino-card-scene" aria-hidden="true"><span>{iconText(detail.icon)}</span><i /><i /><i /></div>
          <div className="casino-card-copy"><small>{detail.tag}</small><h2>{iconText(game.label)}</h2><p>{detail.copy}</p><b>このゲームで遊ぶ <span>{iconText("↗")}</span></b></div>
        </button>
      ); })}
    </div>
    <p className="casino-lobby-note">各ゲームの画面から、いつでもこのロビーに戻れます。</p>
  </div>;
}

