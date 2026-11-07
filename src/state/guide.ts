// はじめてのチュートリアルと、NPCの建築依頼の進み具合。localStorage に保存する
import { create } from 'zustand';
import { useEconomy, lotNumbers } from './economy';
import { useGame } from './store';
import { onlineWorld } from '../session/gate';
import { checkQuest, questAt, questBoard, questDone } from '../economy/quests';
import type { Quest } from '../economy/quests';
import { yen } from '../economy/money';

const KEY = 'open-world:guide:v1';

interface GuideData {
  /** チュートリアル：まだ（active）・終わった・飛ばした */
  tutorial: 'active' | 'done' | 'skipped';
  /** 掲示板に出す依頼の番号の始まり */
  next: number;
  /** 引き受けている依頼の番号 */
  active: number | null;
  delivered: number;
  /** ヒントを小さくたたんでいる */
  folded: boolean;
}

interface GuideState extends GuideData {
  board: () => Quest[];
  activeQuest: () => Quest | null;
  accept: (n: number) => void;
  drop: () => void;
  /** いまの土地の家を納品する。だめなら理由 */
  deliver: () => string | null;
  finishTutorial: (how: 'done' | 'skipped') => void;
  restartTutorial: () => void;
  setFolded: (folded: boolean) => void;
}

function load(): GuideData {
  const base: GuideData = { tutorial: 'active', next: 0, active: null, delivered: 0, folded: false };
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (v && typeof v === 'object') return { ...base, ...v };
    // 前から遊んでいる人（売ったことがある）はチュートリアルを出さない
    if (useEconomy.getState().ledger.some((t) => t.label.startsWith('売却'))) base.tutorial = 'done';
  } catch { /* 初めから */ }
  return base;
}

export const useGuide = create<GuideState>((set, get) => ({
  ...load(),
  board: () => questBoard(get().next),
  activeQuest: () => (get().active === null ? null : questAt(get().active!)),
  accept: (n) => set({ active: n }),
  drop: () => set({ active: null }),
  deliver: () => {
    const q = get().activeQuest();
    if (!q) return '依頼を引き受けていません';
    if (onlineWorld()) return '依頼の納品はひとりで遊ぶモードで行ってください';
    const eco = useEconomy.getState();
    const lot = eco.lots.find((l) => l.id === eco.currentLotId);
    if (!lot) return '自分の土地にいるときに納品できます';
    if (lot.town) return '町の家は納品できません';
    if (lot.construction) return '工事が終わってから納品できます';
    if (!lot.built) return 'まだ家が建っていません（不動産屋で着工してください）';
    if (!questDone(checkQuest(q, lot.built, lot.location))) return '建っている家が条件を満たしていません（設計を変えたら着工し直してください）';
    const price = lotNumbers(lot, eco.market).sale;
    const err = eco.sell(lot.id);
    if (err) return err;
    useEconomy.getState().receive(q.bonus, `依頼のお礼（${q.client}）`);
    const n = get().active!;
    // 納品した依頼の枠に、新しい依頼を出す
    const board = get().board().map((x) => Number(x.id.slice(1)));
    set({ active: null, delivered: get().delivered + 1, next: board.includes(n) ? get().next + 1 : get().next });
    useGame.getState().notify(`🎉 ${q.client}に納品しました：売値 ${yen(price)}＋お礼 ${yen(q.bonus)}`);
    return null;
  },
  finishTutorial: (tutorial) => set({ tutorial }),
  restartTutorial: () => set({ tutorial: 'active', folded: false }),
  setFolded: (folded) => set({ folded }),
}));

useGuide.subscribe((s) => {
  const { tutorial, next, active, delivered, folded } = s;
  try { localStorage.setItem(KEY, JSON.stringify({ tutorial, next, active, delivered, folded })); } catch { /* 保存できなくても遊べる */ }
});
