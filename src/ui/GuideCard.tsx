// 画面のすみの小さなガイド。はじめはチュートリアルの手順、終わったら「次にやること」（引き受けた依頼の足りない条件）を1行で出す
import { useEffect, useMemo, useState } from 'react';
import { useGame } from '../state/store';
import { useEconomy, useCurrentLot } from '../state/economy';
import { useGuide } from '../state/guide';
import { checkQuest, missingText } from '../economy/quests';
import { onlineWorld } from '../session/gate';
import { useTouchDevice } from './useTouchDevice';
import { AppIcon, IconLabel, iconText } from './AppIcon';
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
  // スマホでは最初は「今やること」の1行にたたみ、押すと開く（保存しない。出し直すと1行に戻る）。PC は保存した folded に従う
  const [touchOpen, setTouchOpen] = useState(false);
  const folded = touch ? !touchOpen : g.folded;
  const setFolded = (v: boolean) => (touch ? setTouchOpen(!v) : g.setFolded(v));
  const quest = g.activeQuest();
  // 見本の家（最初から建っている分）は数えず、チュートリアルを始めてから増えた分で進める
  const lotId = lot?.id ?? null;
  const count = { floors: house.floors.length, walls: house.walls.length, doors: house.openings.filter((o) => o.kind === 'door').length };
  const start = g.start;
  useEffect(() => {
    if (g.tutorial !== 'active') return;
    // 始めたとき・別の土地に移ったときは今の数から数える。部品を消して減ったら、減った数を新しい起点にする
    if (!start || start.lot !== lotId) g.setStart({ lot: lotId, ...count });
    else if (count.floors < start.floors || count.walls < start.walls || count.doors < start.doors)
      g.setStart({ lot: lotId, floors: Math.min(count.floors, start.floors), walls: Math.min(count.walls, start.walls), doors: Math.min(count.doors, start.doors) });
  });
  const base = start && start.lot === lotId ? start : { floors: count.floors, walls: count.walls, doors: count.doors };
  const steps = useMemo(() => tutorialSteps({
    floors: count.floors - base.floors,
    walls: count.walls - base.walls,
    door: count.doors > base.doors,
    built: !!lot?.built || !!lot?.construction || sold || g.delivered > 0,
    sold: sold || g.delivered > 0,
  }), [house, base.floors, base.walls, base.doors, lot?.built, lot?.construction, sold, g.delivered]);
  const checks = useMemo(() => (quest ? checkQuest(quest, house, lot?.location ?? null) : []), [quest, house, lot?.location]);
  const stepIndex = steps.findIndex((s) => !s.ok);
  useEffect(() => { if (g.tutorial === 'active' && stepIndex < 0) useGuide.getState().finishTutorial('done'); }, [g.tutorial, stepIndex]);
  if (overlay || placing || onlineWorld()) return null;
  const open = () => useGame.getState().setOverlay('quests');

  if (g.tutorial === 'active') {
    const i = stepIndex;
    if (i < 0) return null;
    if (folded) {
      return (
        <button className="guide-card mini" onClick={() => setFolded(false)} aria-expanded={false} title="ガイドを開く">
          <AppIcon name="star" /><span className="guide-vh">ガイド：</span><span className="guide-count">{i + 1}/{steps.length}</span><span className="guide-now">{steps[i].label}</span><AppIcon name="more" className="guide-caret" />
        </button>
      );
    }
    return (
      <div className="guide-card open" role="status">
        <div className="guide-head">
          <b><AppIcon name="star" /> はじめての家づくり {i + 1}/{steps.length}</b>
          <button className="tool guide-fold" onClick={() => setFolded(true)} aria-label="ガイドをたたむ" aria-expanded title="ガイドをたたむ"><AppIcon name="less" /></button>
        </div>
        <div className="guide-body">
          <div className="guide-step">{steps[i].label}</div>
          <div className="guide-hint">{steps[i].hint}</div>
          <div className="guide-dots">{steps.map((s, k) => <span key={k} className={s.ok ? 'on' : k === i ? 'now' : ''} />)}</div>
          <button className="guide-skip" onClick={() => g.finishTutorial('skipped')} title="ガイドを終わる"><IconLabel icon="close" text="ガイドを終わる" short="終わる" /></button>
        </div>
      </div>
    );
  }
  if (g.folded) return <button className="guide-card folded" onClick={() => g.setFolded(false)} aria-label="次にやることを開く">{iconText('📋')}</button>;
  return (
    <div className="guide-card line" role="status">
      <button className="guide-line" onClick={open}>
        {quest ? <><b>{iconText('📋')} {quest.title}</b><span>{missingText(checks)}</span></> : <><b>{iconText('📋')} 建築の依頼</b><span>依頼を受けて家を建てると、お礼がもらえます</span></>}
      </button>
      <button className="guide-x" onClick={() => g.setFolded(true)} aria-label="依頼をたたむ" title="依頼をたたむ"><AppIcon name="less" /></button>
    </div>
  );
}
