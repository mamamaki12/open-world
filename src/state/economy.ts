// お金と不動産の状態（所持金、日付、相場、持っている土地と家、工事、家計簿）。
// いま画面に出している土地の設計図は useGame の house。ほかの土地の設計図は lot.design に預けておく。
import { create } from 'zustand';
import { emptyHouse } from '../building/types';
import type { House } from '../building/types';
import { autosave, isHouse } from '../save/storage';
import { DAY_SECONDS, dailyBill, getLocation, landOffers, landPrice, salePrice, stepMarket } from '../economy/market';
import type { LandOffer } from '../economy/market';
import { appraiseBuilding, buildSeconds, estimateCost, renovationCost } from '../economy/pricing';
import { yen } from '../economy/money';
import { START_PLOT, assignPlots, freePlot, plotX, plotZ, CIVIC_SITE, JOINED_W, JOIN_SHIFT, joinNeighbor, joinPair } from '../economy/town';
import { LOT_D, LOT_W, lotSize } from '../building/dimensions';
import { mergeHouses } from '../building/join';
import { useGame } from './store';
import { useInteraction } from './interaction';

export const START_MONEY = 20_000_000;
const SAVE_KEY = 'open-world:economy:v1';
const LEDGER_LIMIT = 120;
const HISTORY_LIMIT = 60;

export interface Construction {
  /** 完成したらこの形になる */
  target: House;
  cost: number;
  total: number;
  remaining: number;
}

export interface Lot {
  id: string;
  name: string;
  location: string;
  variance: number;
  /** 建っている家（まだなら null） */
  built: House | null;
  /** いま画面に出していない土地の設計図 */
  design: House | null;
  construction: Construction | null;
  rented: boolean;
  /** 土地代と工事費の合計（もうけの計算用） */
  invested: number;
  /** 町のどの区画にあるか（マップとワープに使う。src/economy/town.ts） */
  plot?: number;
  /** 隣の区画とつなげて1つの土地にしているとき、その東側の区画（plot は西側） */
  joined?: number;
}

/** その土地が使っている区画（つなげていれば2つ） */
export function lotPlots(l: Pick<Lot, 'plot' | 'joined'>): number[] {
  return [l.plot, l.joined].filter((p): p is number => typeof p === 'number');
}

/** 持っている土地で使っている区画すべて */
export function ownedPlots(lots: Pick<Lot, 'plot' | 'joined'>[]): number[] {
  return lots.flatMap(lotPlots);
}

/** 土地の広さ（マス） */
export function lotCells(l: Pick<Lot, 'joined'> | null | undefined): { w: number; d: number } {
  return { w: typeof l?.joined === 'number' ? JOINED_W : LOT_W, d: LOT_D };
}

/** 隣の区画にある自分の土地のうち、つなげられるもの（まだつなげていない2つの土地） */
export function joinCandidate(lots: Lot[], id: string): Lot | null {
  const lot = lots.find((l) => l.id === id);
  if (!lot || typeof lot.plot !== 'number' || typeof lot.joined === 'number') return null;
  const other = joinNeighbor(lot.plot);
  return lots.find((l) => l.id !== id && l.plot === other && typeof l.joined !== 'number') ?? null;
}

export interface Txn {
  day: number;
  label: string;
  amount: number;
}

export interface Job {
  label: string;
  pay: number;
  total: number;
  remaining: number;
}

interface EconomyData {
  money: number;
  day: number;
  /** 今日が始まってからの秒数 */
  clock: number;
  market: number;
  marketHistory: number[];
  lots: Lot[];
  currentLotId: string | null;
  offers: LandOffer[];
  ledger: Txn[];
  gamble: { bet: number; won: number };
  job: Job | null;
}

interface EconomyState extends EconomyData {
  tick: (dt: number) => void;
  /** お金を払う。足りなければ false */
  pay: (amount: number, label: string) => boolean;
  receive: (amount: number, label: string) => void;
  /** ギャンブルの賭け金を払う */
  placeBet: (amount: number, label: string) => boolean;
  /** ギャンブルの払い戻し */
  collect: (amount: number, label: string) => void;
  startConstruction: () => string | null;
  sell: (lotId: string) => string | null;
  setRented: (lotId: string, rented: boolean) => string | null;
  buyLand: (offerId: string) => string | null;
  switchLot: (lotId: string) => void;
  /** 隣り合う2つの自分の土地をつなげて1つにする。できなければ理由を返す */
  joinLots: (lotId: string) => string | null;
  startJob: () => void;
  reset: () => void;
}

let lotCounter = 0;
const lotId = () => `lot-${Date.now().toString(36)}-${(++lotCounter).toString(36)}`;

/** 売り土地に、持っている土地と重ならない区画を割り当てる（空きがない立地の売り土地は出さない） */
export function placeOffers(offers: LandOffer[], lots: Lot[]): LandOffer[] {
  const taken = new Set(ownedPlots(lots));
  const out: LandOffer[] = [];
  for (const o of offers) {
    const plot = typeof o.plot === 'number' && !taken.has(o.plot) ? o.plot : freePlot(o.location, taken, Math.random);
    if (plot === null) continue;
    taken.add(plot);
    out.push({ ...o, plot });
  }
  return out;
}

function initialData(): EconomyData {
  const first: Lot = {
    id: lotId(),
    name: '若葉1丁目（はじめの土地）',
    location: 'rural',
    variance: 1,
    built: null,
    design: null,
    construction: null,
    rented: false,
    // はじめの土地ももらい物ではなく、土地代ぶんを元手に数える（売ったときのもうけが正しく出るように）
    invested: 5_000_000,
    plot: START_PLOT,
  };
  return {
    money: START_MONEY,
    day: 1,
    clock: 0,
    market: 1,
    marketHistory: [1],
    lots: [first],
    currentLotId: first.id,
    offers: placeOffers(landOffers(1, Math.random), [first]),
    ledger: [{ day: 1, label: 'はじめの所持金', amount: START_MONEY }],
    gamble: { bet: 0, won: 0 },
    job: null,
  };
}

function load(): EconomyData {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const d = JSON.parse(raw) as EconomyData;
      if (typeof d.money === 'number' && Array.isArray(d.lots) && d.lots.every((l) => l.built === null || isHouse(l.built))) {
        // 区画のない古いセーブの土地・売り土地には、ここで区画を決める
        const lots = assignPlots(d.lots, d.lots.flatMap((l) => (typeof l.joined === 'number' ? [l.joined] : [])));
        const offers = placeOffers(Array.isArray(d.offers) ? d.offers : [], lots);
        return { ...initialData(), ...d, lots, offers, job: null };
      }
    }
  } catch {
    // 読めなければ最初から
  }
  return initialData();
}

export function saveEconomy(): void {
  try {
    const s = useEconomy.getState();
    const data: EconomyData = {
      money: s.money,
      day: s.day,
      clock: s.clock,
      market: s.market,
      marketHistory: s.marketHistory,
      lots: s.lots,
      currentLotId: s.currentLotId,
      offers: s.offers,
      ledger: s.ledger,
      gamble: s.gamble,
      job: null,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    // 保存できない環境では何もしない
  }
}

const notify = (text: string) => useGame.getState().notify(text);

/** 建っている家の査定や売値など、土地1つ分の数字 */
export function lotNumbers(lot: Lot, market: number) {
  const loc = getLocation(lot.location);
  const buildCost = lot.built ? estimateCost(lot.built).total : 0;
  const appraisal = lot.built ? appraiseBuilding(lot.built, loc.factor) : 0;
  const landValue = Math.round(loc.land * lot.variance);
  return {
    location: loc,
    buildCost,
    appraisal,
    landValue,
    landNow: landPrice(lot.location, lot.variance, market),
    sale: salePrice(appraisal, lot.location, lot.variance, market),
    bill: dailyBill({ buildCost, appraisal, landValue, rented: lot.rented, market }),
  };
}

/** いま画面に出している土地の設計図 */
const currentDesign = () => useGame.getState().house;

function showHouse(house: House) {
  useInteraction.setState({ preview: null, furnitureDrag: null, buildingDrag: null });
  useGame.setState({ house, past: [], future: [], selection: null, marked: [], activeLevel: 0, dragBase: null, lastCommit: null });
  autosave(house);
}

export const useEconomy = create<EconomyState>((set, get) => {
  const addTxn = (label: string, amount: number) => {
    const { ledger, day } = get();
    return [{ day, label, amount }, ...ledger].slice(0, LEDGER_LIMIT);
  };
  const updateLot = (id: string, patch: Partial<Lot>) => get().lots.map((l) => (l.id === id ? { ...l, ...patch } : l));

  return {
    ...load(),

    tick: (dt) => {
      const s = get();
      let { money, ledger } = s;
      let lots = s.lots;
      // 工事の進み
      if (lots.some((l) => l.construction)) {
        lots = lots.map((l) => {
          if (!l.construction) return l;
          const remaining = l.construction.remaining - dt;
          if (remaining > 0) return { ...l, construction: { ...l.construction, remaining } };
          notify(`🏠 ${l.name} の工事が終わりました`);
          return { ...l, built: l.construction.target, construction: null };
        });
      }
      // バイト
      let job = s.job;
      if (job) {
        const remaining = job.remaining - dt;
        if (remaining > 0) job = { ...job, remaining };
        else {
          money += job.pay;
          ledger = [{ day: s.day, label: job.label, amount: job.pay }, ...ledger].slice(0, LEDGER_LIMIT);
          notify(`${job.label}：${yen(job.pay)} もらいました`);
          job = null;
        }
      }
      // 日付
      let { clock, day, market, marketHistory, offers } = s;
      clock += dt;
      if (clock >= DAY_SECONDS) {
        clock -= DAY_SECONDS;
        day += 1;
        market = stepMarket(market, Math.random);
        marketHistory = [...marketHistory, market].slice(-HISTORY_LIMIT);
        offers = placeOffers(landOffers(day, Math.random), lots);
        let costs = 0;
        let rent = 0;
        for (const l of lots) {
          const n = lotNumbers(l, market);
          costs += n.bill.upkeep + n.bill.tax;
          rent += n.bill.rent;
        }
        if (costs > 0) {
          money -= costs;
          ledger = [{ day, label: '維持費・固定資産税', amount: -costs }, ...ledger];
        }
        if (rent > 0) {
          money += rent;
          ledger = [{ day, label: '家賃収入', amount: rent }, ...ledger];
        }
        ledger = ledger.slice(0, LEDGER_LIMIT);
        const prev = s.market;
        const arrow = market > prev ? '▲' : market < prev ? '▼' : '→';
        notify(`${day}日目　相場 ${market.toFixed(2)} ${arrow}${rent ? `　家賃 +${yen(rent)}` : ''}${costs ? `　維持費・税 -${yen(costs)}` : ''}`);
      }
      set({ lots, money, ledger, job, clock, day, market, marketHistory, offers });
    },

    pay: (amount, label) => {
      if (amount > get().money) return false;
      set({ money: get().money - amount, ledger: addTxn(label, -amount) });
      return true;
    },
    receive: (amount, label) => set({ money: get().money + amount, ledger: addTxn(label, amount) }),
    placeBet: (amount, label) => {
      if (!(amount > 0) || amount > get().money) return false;
      const g = get().gamble;
      set({ money: get().money - amount, ledger: addTxn(label, -amount), gamble: { ...g, bet: g.bet + amount } });
      return true;
    },
    collect: (amount, label) => {
      if (amount <= 0) return;
      const g = get().gamble;
      set({ money: get().money + amount, ledger: addTxn(label, amount), gamble: { ...g, won: g.won + amount } });
    },

    startConstruction: () => {
      const s = get();
      const lot = s.lots.find((l) => l.id === s.currentLotId);
      if (!lot) return '土地がありません。不動産屋で土地を買ってください';
      if (lot.construction) return 'いま工事中です';
      if (lot.rented) return '貸している間は工事できません';
      const design = currentDesign();
      const est = renovationCost(lot.built, design);
      if (est.parts === 0) {
        // 取り壊しや家具の移動だけなら、すぐ反映（お金はかからない）
        set({ lots: updateLot(lot.id, { built: design }) });
        return null;
      }
      if (est.total > s.money) return `お金が足りません（工事費 ${yen(est.total)}）`;
      const total = buildSeconds(est.total);
      set({
        money: s.money - est.total,
        ledger: addTxn(`${lot.built ? '改築' : '新築'}工事（${lot.name}）`, -est.total),
        lots: updateLot(lot.id, {
          construction: { target: design, cost: est.total, total, remaining: total },
          invested: lot.invested + est.total,
        }),
      });
      return null;
    },

    sell: (id) => {
      const s = get();
      const lot = s.lots.find((l) => l.id === id);
      if (!lot) return 'その土地は持っていません';
      if (lot.construction) return '工事中は売れません';
      const price = lotNumbers(lot, s.market).sale;
      const lots = s.lots.filter((l) => l.id !== id);
      const profit = price - lot.invested;
      set({ money: s.money + price, ledger: addTxn(`売却（${lot.name}）`, price), lots });
      notify(`${lot.name} を ${yen(price)} で売りました（${profit >= 0 ? 'もうけ' : '損'} ${yen(Math.abs(profit))}）`);
      if (id === s.currentLotId) {
        const next = lots[0];
        if (next) get().switchLot(next.id);
        // 最後の土地を売ったら、設計図だけ手元に残す（次に土地を買うとそこで建てられる）
        else set({ currentLotId: null });
      }
      return null;
    },

    setRented: (id, rented) => {
      const lot = get().lots.find((l) => l.id === id);
      if (!lot) return 'その土地は持っていません';
      if (rented && !lot.built) return '家が建っていないので貸せません';
      if (rented && lot.construction) return '工事中は貸せません';
      set({ lots: updateLot(id, { rented }) });
      return null;
    },

    buyLand: (offerId) => {
      const s = get();
      const offer = s.offers.find((o) => o.id === offerId);
      if (!offer) return 'その土地はもう売れてしまいました';
      const price = landPrice(offer.location, offer.variance, s.market);
      if (price > s.money) return `お金が足りません（${yen(price)}）`;
      const taken = ownedPlots(s.lots);
      const plot = typeof offer.plot === 'number' && !taken.includes(offer.plot) ? offer.plot : freePlot(offer.location, taken);
      if (plot === null) return 'この立地にはもう空いている区画がありません';
      const lot: Lot = {
        id: lotId(),
        name: `${offer.name}（${getLocation(offer.location).name}）`,
        location: offer.location,
        variance: offer.variance,
        built: null,
        design: null,
        construction: null,
        rented: false,
        invested: price,
        plot,
      };
      set({
        money: s.money - price,
        ledger: addTxn(`土地購入（${lot.name}）`, -price),
        lots: [...s.lots, lot],
        offers: s.offers.filter((o) => o.id !== offerId),
      });
      // 土地がなかったときは、手元の設計図をそのまま新しい土地で使う
      if (!s.currentLotId) set({ currentLotId: lot.id });
      notify(`${lot.name} を買いました`);
      return null;
    },

    switchLot: (id) => {
      const s = get();
      if (id === s.currentLotId) return;
      const target = s.lots.find((l) => l.id === id);
      if (!target) return;
      const lots = s.lots.map((l) => {
        if (l.id === s.currentLotId) return { ...l, design: currentDesign() };
        if (l.id === id) return { ...l, design: null };
        return l;
      });
      set({ lots, currentLotId: id });
      showHouse(lotHouse(target) ?? emptyHouse());
      saveEconomy();
    },

    joinLots: (id) => {
      const s = get();
      const lot = s.lots.find((l) => l.id === id);
      if (!lot || typeof lot.plot !== 'number') return 'その土地は持っていません';
      if (typeof lot.joined === 'number') return 'この土地はもうつなげてあります';
      const other = joinCandidate(s.lots, id);
      if (!other) return '道路をはさまない隣の区画に、自分の土地がありません';
      const pair = joinPair(lot.plot)!;
      const [west, east] = lot.plot === pair.west ? [lot, other] : [other, lot];
      if (west.construction || east.construction) return '工事中はつなげられません';
      if (west.rented || east.rented) return '貸している間はつなげられません';
      // 画面に出している土地の設計図は useGame の方にある
      const houseOf = (l: Lot) => (l.id === s.currentLotId ? currentDesign() : lotHouse(l));
      const merged: Lot = {
        ...west,
        joined: east.plot,
        // 土地2つぶんの値段になるよう、値段のぶれを足し合わせておく（土地代・税・売値の計算がそのまま使える）
        variance: Math.round((west.variance + east.variance) * 100) / 100,
        built: mergeHouses(west.built, east.built, JOIN_SHIFT),
        design: mergeHouses(houseOf(west), houseOf(east), JOIN_SHIFT),
        invested: west.invested + east.invested,
      };
      const wasCurrent = s.currentLotId === west.id || s.currentLotId === east.id;
      const lots = s.lots
        .filter((l) => l.id !== east.id)
        .map((l) => (l.id !== west.id ? l : wasCurrent ? { ...merged, design: null } : merged));
      set({ lots, currentLotId: wasCurrent ? west.id : s.currentLotId });
      if (wasCurrent) showHouse(merged.design ?? emptyHouse());
      notify(`🔗 ${west.name.replace(/（.*）$/, '')} と ${east.name.replace(/（.*）$/, '')} をつなげて、1つの広い土地にしました`);
      saveEconomy();
      return null;
    },

    startJob: () => {
      if (get().job) return;
      set({ job: { label: '日雇いバイト（チラシ配り）', pay: 12_000, total: 10, remaining: 10 } });
    },

    reset: () => {
      set({ ...initialData() });
      showHouse(emptyHouse());
    },
  };
});

/** いまの土地 */
export function useCurrentLot(): Lot | null {
  return useEconomy((s) => s.lots.find((l) => l.id === s.currentLotId) ?? null);
}

/** いま原点に置いて建てている区画（土地を持っていなければ、はじめの区画） */
export function currentPlotOf(s: Pick<EconomyData, 'lots' | 'currentLotId'>): number {
  return s.lots.find((l) => l.id === s.currentLotId)?.plot ?? START_PLOT;
}

/** 区画を 3D の世界のどこに描くか：いまの区画からの横のずれ（m） */
export function plotOffset(plot: number, s: Pick<EconomyData, 'lots' | 'currentLotId'> = useEconomy.getState()): number {
  return plotX(plot) - plotX(currentPlotOf(s));
}

export function plotOffsetZ(plot: number, s: Pick<EconomyData, 'lots' | 'currentLotId'> = useEconomy.getState()): number {
  return plotZ(plot) - plotZ(currentPlotOf(s));
}
export function civicOffset(s: Pick<EconomyData, 'lots' | 'currentLotId'> = useEconomy.getState()) {
  return { x: CIVIC_SITE.x - plotX(currentPlotOf(s)), z: CIVIC_SITE.z - plotZ(currentPlotOf(s)) };
}

export function useCurrentPlot(): number {
  return useEconomy(currentPlotOf);
}

/** その土地を開いたときに出る家（設計中ならその設計図、工事中なら完成予定、なければ建っている家）。町でほかの土地を描くのにも使う */
export function lotHouse(l: Lot): House | null {
  return l.design ?? l.construction?.target ?? l.built;
}


/** 建てられる範囲（lotSize）を、いま開いている土地の広さに合わせる */
function syncLotSize(s: Pick<EconomyData, 'lots' | 'currentLotId'>) {
  const c = lotCells(s.lots.find((l) => l.id === s.currentLotId));
  lotSize.w = c.w;
  lotSize.d = c.d;
}
syncLotSize(useEconomy.getState());
useEconomy.subscribe(syncLotSize);

/** いまの土地の広さ（マス）。変わったら描き直す */
export function useLotCells(): { w: number; d: number } {
  const w = useEconomy((s) => lotCells(s.lots.find((l) => l.id === s.currentLotId)).w);
  return { w, d: LOT_D };
}
