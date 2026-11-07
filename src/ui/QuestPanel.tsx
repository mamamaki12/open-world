// 建築の依頼（NPC）。依頼を1つ引き受け、条件に合う家を建てて納品すると、売値にお礼が上乗せされる
import { useState } from 'react';
import { Modal } from './Modal';
import { useGame } from '../state/store';
import { useCurrentLot } from '../state/economy';
import { useGuide } from '../state/guide';
import { checkQuest, questDone } from '../economy/quests';
import type { Quest } from '../economy/quests';
import { onlineWorld } from '../session/gate';
import { yen } from '../economy/money';
import './guide.css';

export function QuestPanel() {
  const close = useGame((s) => s.setOverlay);
  const lot = useCurrentLot();
  const design = useGame((s) => s.house);
  const g = useGuide();
  const [error, setError] = useState('');
  const active = g.activeQuest();
  const board = g.board();
  const card = (q: Quest, isActive: boolean) => {
    const checks = checkQuest(q, design, lot?.location ?? null);
    const builtOk = !!lot?.built && !lot.construction && questDone(checkQuest(q, lot.built, lot.location));
    const n = Number(q.id.slice(1));
    return (
      <div key={q.id} className={`quest${isActive ? ' active' : ''}`}>
        <h4>{q.title}</h4>
        <div className="who">{q.client}「{q.text}」</div>
        <ul>{checks.map((c) => <li key={c.label} className={isActive && c.ok ? 'ok' : ''}>{c.label}</li>)}</ul>
        <div className="row">
          <span>お礼 <b>{yen(q.bonus)}</b>（＋家の売値）</span>
          {isActive ? <>
            <button className="btn primary" disabled={!builtOk} onClick={() => setError(g.deliver() ?? '')}>納品する</button>
            <button className="btn small" onClick={() => g.drop()}>やめる</button>
            {!builtOk && questDone(checks) && <span className="who">設計はOK。不動産屋で着工して、完成したら納品できます</span>}
          </> : <button className="btn" disabled={!!active} onClick={() => g.accept(n)}>引き受ける</button>}
        </div>
      </div>
    );
  };
  return (
    <Modal title="📋 建築の依頼" onClose={() => close(null)} tabs={[]} tab="" onTab={() => undefined}>
      {onlineWorld() ? <p>建築の依頼は、ひとりで遊ぶモードで受けられます。</p> : <>
        <p className="info">町の人からの依頼です。条件に合う家を建てて（不動産屋で着工して完成させて）、その土地で「納品する」を押すと、依頼主が家を土地ごと買い取り、お礼を上乗せしてくれます。条件は、いまの設計で確かめます（納品は着工して完成した家で）。これまでの納品：{g.delivered}件</p>
        {error && <p className="info" style={{ color: 'var(--danger)' }}>{error}</p>}
        <div className="quest-list">
          {active && card(active, true)}
          {board.filter((q) => q.id !== active?.id).map((q) => card(q, false))}
        </div>
        {g.tutorial !== 'active' && <p className="info"><button className="btn small" onClick={() => { g.restartTutorial(); close(null); }}>はじめてのガイドをもう一度見る</button></p>}
      </>}
    </Modal>
  );
}
