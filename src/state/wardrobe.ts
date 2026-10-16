// 持っている服と、いま着ている服。お金は economy から払い、localStorage に保存する
import { create } from 'zustand';
import { getGarment, purchase, sanitizeWardrobe, wear } from '../catalog/clothes';
import type { Slot, WardrobeData } from '../catalog/clothes';
import { BOUTIQUE_INFO } from '../building/boutiques';
import { saveEconomy, useEconomy } from './economy';
import { useGame } from './store';

const KEY = 'open-world:wardrobe:v1';

function load(): WardrobeData {
  try { return sanitizeWardrobe(JSON.parse(localStorage.getItem(KEY) ?? 'null')); } catch { return sanitizeWardrobe(null); }
}
function save(d: WardrobeData) {
  try { localStorage.setItem(KEY, JSON.stringify(d)); } catch { /* 保存できなくても遊べる */ }
}

interface WardrobeState extends WardrobeData {
  buy: (id: string) => string | null;
  wear: (slot: Slot, id: string | null) => void;
}

export const useWardrobe = create<WardrobeState>((set, get) => ({
  ...load(),
  buy: (id) => {
    const eco = useEconomy.getState();
    const r = purchase(get(), id, eco.money);
    if (typeof r === 'string') return r;
    const g = getGarment(id)!;
    if (!eco.pay(r.cost, `服（${BOUTIQUE_INFO[g.shop!].name} ${g.name}）`)) return 'お金が足りません';
    set(r.data); save(r.data); saveEconomy();
    useGame.getState().notify(`👕 ${g.name} を買って着替えました`);
    return null;
  },
  wear: (slot, id) => {
    const d = wear(get(), slot, id);
    set(d); save({ owned: d.owned, outfit: d.outfit });
  },
}));
