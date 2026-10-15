// カジノ・競技場：スロット、ルーレット、ハイ＆ロー、競馬、競輪、ボートレース。賭け金の上限はなし
import { useState } from 'react';
import { yen } from '../economy/money';
import { useEconomy } from '../state/economy';
import { useGame } from '../state/store';
import { HighLow } from './casino/HighLow';
import { RaceGame } from './casino/RaceGame';
import { Roulette } from './casino/Roulette';
import { Slots } from './casino/Slots';
import { Modal } from './Modal';

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

export function CasinoPanel() {
  const [tab, setTabState] = useState<Tab>(lastTab);
  const setTab = (t: Tab) => {
    lastTab = t;
    setTabState(t);
  };
  const close = useGame((s) => s.setOverlay);
  const money = useEconomy((s) => s.money);
  return (
    <Modal title="🎰 カジノ・競技場" onClose={() => close(null)} tabs={TABS} tab={tab} onTab={setTab}>
      <div className="casino-wallet">
        所持金 <b className="big">{yen(money)}</b>
        <span className="muted">　賭け金に上限はありません。お金が尽きたら不動産屋の「家計簿・バイト」で立て直せます。</span>
      </div>
      {tab === 'slots' && <Slots />}
      {tab === 'roulette' && <Roulette />}
      {tab === 'highlow' && <HighLow />}
      {(tab === 'horse' || tab === 'keirin' || tab === 'boat') && <RaceGame key={tab} kind={tab} />}
    </Modal>
  );
}
