// いまの見た目。最初は作成画面で選び、髪はあとから美容室で変える。localStorage に保存する
import { create } from 'zustand';
import { HAIR_COLORS, getHair, salonCost, sanitizeLooks } from '../catalog/looks';
import type { Looks } from '../catalog/looks';
import { saveEconomy, useEconomy } from './economy';
import { useGame } from './store';

const KEY = 'open-world:looks:v1';

function load(): { looks: Looks; created: boolean } {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    return { looks: sanitizeLooks(raw), created: !!raw };
  } catch { return { looks: sanitizeLooks(null), created: false }; }
}
function save(l: Looks) {
  try { localStorage.setItem(KEY, JSON.stringify(l)); } catch { /* 保存できなくても遊べる */ }
}

interface LooksState {
  looks: Looks;
  /** 作成画面を一度でも終えたか（まだなら起動時に作成画面を出す） */
  created: boolean;
  /** 作成画面・見た目の変更（無料） */
  set: (l: Looks) => void;
  /** 美容室で髪を切る・染める。エラー文を返す */
  salon: (hair: string, hairColor: number) => string | null;
}

export const useLooks = create<LooksState>((set, get) => ({
  ...load(),
  set: (l) => { const v = sanitizeLooks(l); set({ looks: v, created: true }); save(v); },
  salon: (hair, hairColor) => {
    const now = get().looks, cost = salonCost(now, { hair, hairColor });
    if (!cost) return '今と同じ髪型です';
    if (!useEconomy.getState().pay(cost, `美容室（${getHair(hair).name}・${HAIR_COLORS[hairColor]?.name ?? ''}）`)) return 'お金が足りません';
    const v = sanitizeLooks({ ...now, hair, hairColor });
    set({ looks: v }); save(v); saveEconomy();
    useGame.getState().notify(`💇 ${getHair(hair).name}にしました`);
    return null;
  },
}));
