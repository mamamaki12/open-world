// 画面のすみの小さなガイド。はじめはチュートリアルの手順、終わったら「次にやること」（引き受けた依頼の足りない条件）を1行で出す
import { useEffect, useMemo } from 'react';
import { useGame } from '../state/store';
import { useEconomy, useCurrentLot } from '../state/economy';
import { useGuide } from '../state/guide';
import { checkQuest, missingText } from '../economy/quests';
import { onlineWorld } from '../session/gate';
import { useTouchDevice } from './useTouchDevice';
import { IconLabel, iconText } from './AppIcon';
import './guide.css';

export function tutorialSteps(s: { floors: number; walls: number; door: boolean; built: boolean; sold: boolean }) {
  return [
    { label: '床を置く', hint: '「建てる」→「床」で地面をなぞって、床を張ろう', ok: s.floors > 0 },
    { label: '壁で囲む', hint: '「壁」で床のまわりに壁を4枚立てよう', ok: s.walls >= 4 },
    { label: 'ドアを付ける', hint: '「ドア」で壁をタップして、玄関ドアを付けよう', ok: s.door },
    { label: '着工する', hint: '地図から不動産屋へワープして「着工する」（無料）', ok: s.built },
    { label: '売ってみる', hint: '工事が終わったら不動産屋で売るか、建築の依頼に納品しよう', ok: s.sold },
  ];
}

export function GuideCard() {
  const overlay = useGame((s) => s.overlay);
  // スマホで道具を持って置いている間は、指でなぞる場所をふさがないよう隠す
  const holding = useGame((s) => s.tool !== 'select');
  const touch = useTouchDevice();
  const placing = holding && touch;
  const house = useGame((s) => s.house);
  const lot = useCurrentLot();
  const sold = useEconomy((s) => s.ledger.some((t) => t.label.startsWith('売却')));
  const g = useGuide();
  const quest = g.activeQuest();
  const steps = useMemo(() => tutorialSteps({
    floors: house.floors.length,
    walls: house.walls.length,
    door: house.openings.some((o) => o.kind === 'door'),
    built: !!lot?.built || !!lot?.construction || sold || g.delivered > 0,
    sold: sold || g.delivered > 0,
  }), [house, lot?.built, lot?.construction, sold, g.delivered]);
  const checks = useMemo(() => (quest ? checkQuest(quest, house, lot?.location ?? null) : []), [quest, house, lot?.location]);
  const stepIndex = steps.findIndex((s) => !s.ok);
  useEffect(() => { if (g.tutorial === 'active' && stepIndex < 0) useGuide.getState().finishTutorial('done'); }, [g.tutorial, stepIndex]);
  if (overlay || placing || onlineWorld()) return null;
  const open = () => useGame.getState().setOverlay('quests');

  if (g.tutorial === 'active') {
    const i = stepIndex;
    if (i < 0) return null;
    if (g.folded) return <button className="guide-card folded" onClick={() => g.setFolded(false)} aria-label="ガイドを開く">{iconText('🔰')} {i + 1}/{steps.length}</button>;
    return (
      <div className="guide-card" role="status">
        <div className="guide-head">
          <b>{iconText('🔰')} はじめての家づくり {i + 1}/{steps.length}</b>
          <button className="guide-x" onClick={() => g.setFolded(true)} aria-label="ガイドをたたむ">–</button>
        </div>
        <div className="guide-step">{steps[i].label}</div>
        <div className="guide-hint">{steps[i].hint}</div>
        <div className="guide-dots">{steps.map((s, k) => <span key={k} className={s.ok ? 'on' : k === i ? 'now' : ''} />)}</div>
        <button className="guide-skip" onClick={() => g.finishTutorial('skipped')} title="ガイドを終わる"><IconLabel icon="close" text="ガイドを終わる" short="終わる" /></button>
      </div>
    );
  }
  if (g.folded) return <button className="guide-card folded" onClick={() => g.setFolded(false)} aria-label="次にやることを開く">{iconText('📋')}</button>;
  return (
    <div className="guide-card line" role="status">
      <button className="guide-line" onClick={open}>
        {quest ? <><b>{iconText('📋')} {quest.title}</b><span>{missingText(checks)}</span></> : <><b>{iconText('📋')} 建築の依頼</b><span>依頼を受けて家を建てると、お礼がもらえます</span></>}
      </button>
      <button className="guide-x" onClick={() => g.setFolded(true)} aria-label="たたむ">–</button>
    </div>
  );
}
