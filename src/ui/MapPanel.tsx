// 町の地図：画面いっぱいに地図だけを出す。家・お店をタップすると小さな吹き出しが出て、そこからワープする
import { iconText } from './AppIcon';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { SHOP_PATHS } from '../building/shopPaths';
import { SHOPPING_AREAS } from '../building/shopSites';
import { offerPrice } from '../state/economy';
import { yen } from '../economy/money';
import { TOWN_HOUSE_PLOTS, townHouseDesign } from '../building/townHouses';
import { CIVIC_SITE, FIRST_PLOT, LAST_PLOT, TOWN_BOUNDS, TOWN_ROADS, plotX, plotZ } from '../economy/town';
import { joinCandidate, lotCells, lotPlots, useCurrentPlot, useEconomy } from '../state/economy';
import { useGame } from '../state/store';
import { playerMemory, warpToLot, warpToPlot, warpToVenue } from '../world/Player';
import { VENUES, VENUE_KINDS } from '../building/venues';
import type { Venue } from '../building/venues';
import { GRID, LOT_D, LOT_W } from '../building/dimensions';
import { BOUTIQUE_IDS } from '../building/boutiques';
import type { BoutiqueId } from '../building/boutiques';
import { listedShops } from '../economy/shop';
import type { Shop } from '../economy/shop';
import { useSession } from '../session/session';
import { savedBundle } from '../session/saves';

/** イベントの日の書き方 */
const eventLine = (shop: Shop, today: number) => shop.event && shop.event.day >= today ? `📅 ${shop.event.day === today ? '今日' : `${shop.event.day}日目`}「${shop.event.title}」` : '';

const SCALE = 3.2, PAD = 28;
const sx = (x: number) => PAD + (x - TOWN_BOUNDS.x0 + 12) * SCALE;
const sy = (z: number) => PAD + (z - TOWN_BOUNDS.z0 + 28) * SCALE;
const WIDTH = sx(TOWN_BOUNDS.x1 + 35) + PAD, HEIGHT = sy(TOWN_BOUNDS.z1 + 35) + PAD;
/** 地図に書く公式のお店の短い名前（服屋はまとめて「服」） */
const SHORT: Partial<Record<Venue, string>> = { casino: 'CASINO', estate: '不動産屋', dealer: '車', tuner: 'カスタム', exchange: '証券', salon: '美容室' };
const C = { grass: '#c4d39e', road: '#4f5d4c', curb: '#9aa883', walk: '#e2dfc4', lot: '#e8e8cd', mine: '#f5f0dc', town: '#dfe1c0', empty: '#d3dcae', ink: '#29392f', muted: '#59694f', red: '#9b4150', green: '#3e634c', gold: '#d4ac55', boutique: '#80566b' };

type Pick = ({ kind: 'plot'; plot: number } | { kind: 'venue'; venue: Venue }) & { ax: number; ay: number };
type View = { k: number; x: number; y: number };

export function MapPanel() {
  const close = useGame(s => s.setOverlay), walking = useGame(s => s.mode === 'walk');
  const lots = useEconomy(s => s.lots), offers = useEconomy(s => s.offers), market = useEconomy(s => s.market);
  const currentId = useEconomy(s => s.currentLotId), here = useCurrentPlot(), today = useEconomy(s => s.day);
  const shops = listedShops(lots, today);
  const shared = useSession(s => s.shared);
  const reconnecting = useSession(s => s.status === 'reconnecting'), networkMessage = useSession(s => s.message);
  const mine = (lot: (typeof lots)[number]) => !lot.town && (!shared || lot.owner === savedBundle().profile.id);
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [view, setView] = useState<View>({ k: 1, x: 0, y: 0 });
  const [pick, setPick] = useState<Pick | null>(null);
  const fit = size.w ? Math.min(size.w / WIDTH, size.h / HEIGHT) : 1;
  const clampK = useCallback((k: number) => Math.min(fit * 6, Math.max(fit * 0.8, k)), [fit]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.code === 'KeyM' || e.key === 'Escape') close(null);
    };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, [close]);
  const mx = plotX(here) + (walking ? playerMemory.x : LOT_W * GRID / 2);
  const mz = plotZ(here) + (walking ? playerMemory.z : LOT_D * GRID / 2);
  // 開いたとき・画面の向きが変わったときは町全体が入る大きさにする（すぐどのお店でもタップできる）
  useLayoutEffect(() => {
    const el = box.current; if (!el) return;
    const measure = () => {
      const w = el.clientWidth, h = el.clientHeight, k = Math.min(w / WIDTH, h / HEIGHT);
      setSize({ w, h }); setView({ k, x: (w - WIDTH * k) / 2, y: (h - HEIGHT * k) / 2 });
    };
    measure();
    const ro = new ResizeObserver(measure); ro.observe(el); return () => ro.disconnect();
  }, []);

  // 指1本で移動、2本でピンチ。動かさずに離したらタップ（その場所の家・お店を選ぶ）
  const points = useRef(new Map<number, { x: number; y: number }>());
  const tap = useRef<{ x: number; y: number; moved: boolean; target: Element | null } | null>(null);
  const local = (e: { clientX: number; clientY: number }) => { const r = box.current!.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const zoomAt = (cx: number, cy: number, factor: number) => setView(v => {
    const k = clampK(v.k * factor), f = k / v.k;
    return { k, x: cx - (cx - v.x) * f, y: cy - (cy - v.y) * f };
  });
  const onDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* 捕まえられないポインターはそのまま */ }
    const p = local(e); points.current.set(e.pointerId, p);
    tap.current = points.current.size === 1 ? { ...p, moved: false, target: (e.target as Element).closest('[data-pick]') } : null;
  };
  const onMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    const prev = points.current.get(e.pointerId); if (!prev) return;
    const p = local(e);
    if (points.current.size >= 2) {
      const other = [...points.current.entries()].find(([id]) => id !== e.pointerId)![1];
      const d0 = Math.hypot(prev.x - other.x, prev.y - other.y), d1 = Math.hypot(p.x - other.x, p.y - other.y);
      const m0 = { x: (prev.x + other.x) / 2, y: (prev.y + other.y) / 2 }, m1 = { x: (p.x + other.x) / 2, y: (p.y + other.y) / 2 };
      setView(v => {
        const k = clampK(v.k * (d0 > 0 ? d1 / d0 : 1)), f = k / v.k;
        return { k, x: m1.x - (m0.x - v.x) * f, y: m1.y - (m0.y - v.y) * f };
      });
    } else {
      const t = tap.current;
      if (t && !t.moved && Math.hypot(p.x - t.x, p.y - t.y) > 6) t.moved = true;
      if (!t || t.moved) setView(v => ({ ...v, x: v.x + p.x - prev.x, y: v.y + p.y - prev.y }));
    }
    points.current.set(e.pointerId, p);
  };
  const onUp = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!points.current.delete(e.pointerId)) return;
    const t = tap.current; tap.current = null;
    if (e.type !== 'pointerup' || !t || t.moved) return;
    choose(t.target);
  };
  const choose = (el: Element | null) => {
    const key = el?.getAttribute('data-pick');
    if (!key) { setPick(null); return; }
    const [kind, id] = key.split(':'), ax = Number(el!.getAttribute('data-ax')), ay = Number(el!.getAttribute('data-ay'));
    setPick(kind === 'plot' ? { kind, plot: Number(id), ax, ay } : { kind: 'venue', venue: id as Venue, ax, ay });
  };
  const pickable = (key: string, ax: number, ay: number, label: string) => ({
    'data-pick': key, 'data-ax': ax, 'data-ay': ay, role: 'button', tabIndex: 0, 'aria-label': label,
    onKeyDown: (e: React.KeyboardEvent<SVGGElement>) => { if (e.key === 'Enter') choose(e.currentTarget); },
  });

  const plots = Array.from({ length: LAST_PLOT - FIRST_PLOT + 1 }, (_, i) => FIRST_PLOT + i);

  return <div className="overlay map-screen" role="dialog" aria-label="🗺 町の地図">
    <div ref={box} className="map-canvas">
      <svg width="100%" height="100%" role="img" aria-label="8ブロックに32区画が並ぶ町の地図"
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
        onWheel={e => { const p = local(e); zoomAt(p.x, p.y, e.deltaY < 0 ? 1.15 : 1 / 1.15); }}>
        <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
          <rect width={WIDTH} height={HEIGHT} rx={14} fill={C.grass} />
          {TOWN_ROADS.map((road, i) => <g key={i}>
            <rect x={sx(road.x0 - 0.8)} y={sy(road.z0 - 0.8)} width={(road.x1 - road.x0 + 1.6) * SCALE} height={(road.z1 - road.z0 + 1.6) * SCALE} fill={C.curb} />
            <rect x={sx(road.x0)} y={sy(road.z0)} width={(road.x1 - road.x0) * SCALE} height={(road.z1 - road.z0) * SCALE} fill={C.road} />
          </g>)}
          {SHOP_PATHS.map((p, i) => <rect key={'walk-' + i} x={sx(p.x0)} y={sy(p.z0)} width={(p.x1 - p.x0) * SCALE} height={(p.z1 - p.z0) * SCALE} fill={C.walk} />)}
          {SHOPPING_AREAS.map(a => <text key={a.name} x={sx(a.x)} y={sy(a.z)} textAnchor="middle" fontSize={8} fontWeight={700} fill={C.muted}>{a.name}</text>)}
          {plots.map(plot => {
            // つなげた土地は西の区画で2区画ぶんの幅に描き、東の区画は描かない
            if (lots.some(l => l.joined === plot)) return null;
            const lot = lots.find(l => l.plot === plot), offer = offers.find(o => o.plot === plot);
            const owned = lot && mine(lot);
            const w = lotCells(lot).w * GRID;
            const picked = pick?.kind === 'plot' && (pick.plot === plot || (lot && lotPlots(lot).includes(pick.plot)));
            const resident = !lot && !offer ? townHouseDesign(TOWN_HOUSE_PLOTS[plot] ?? '') : undefined;
            const name = lot ? lot.name.replace(/（.*）$/, '') : offer ? '売地' : resident ? resident.name : '空き地';
            const label = fitLabel(name, w * SCALE - 6, 8);
            const cx = sx(plotX(plot) + w / 2), top = sy(plotZ(plot));
            return <g key={plot} {...pickable(`plot:${plot}`, cx, top + 4, name)} style={{ cursor: 'pointer' }}>
              <rect x={sx(plotX(plot))} y={top} width={w * SCALE} height={LOT_D * GRID * SCALE} rx={3}
                fill={owned ? C.mine : lot ? C.lot : offer ? C.mine : resident ? C.town : C.empty}
                stroke={picked ? C.gold : owned ? C.green : offer ? C.red : '#a9b48c'} strokeWidth={picked ? 3 : owned ? 2 : 1} strokeDasharray={offer && !picked ? '4 3' : undefined} />
              {(lot || resident) && <path d="M-8 0 L0 -7 L8 0 L6 0 L6 8 L-6 8 L-6 0 Z" transform={`translate(${cx},${sy(plotZ(plot) + 6)})`} fill={owned ? C.green : C.muted} />}
              <text x={cx} y={sy(plotZ(plot) + (lot || resident ? 13 : 9))} textAnchor="middle" fontSize={label.size} fill={offer ? C.red : C.ink}>{label.text}</text>
            </g>;
          })}
          {VENUE_KINDS.map(kind => {
            const v = VENUES[kind], boutique = BOUTIQUE_IDS.includes(kind as BoutiqueId), on = pick?.kind === 'venue' && pick.venue === kind;
            const cx = sx(CIVIC_SITE.x + (v.x0 + v.x1) / 2), cy = sy(CIVIC_SITE.z + (v.z0 + v.z1) / 2);
            return <g key={kind} {...pickable(`venue:${kind}`, cx, sy(CIVIC_SITE.z + v.z0), v.name)} style={{ cursor: 'pointer' }}>
              <rect x={sx(CIVIC_SITE.x + v.x0)} y={sy(CIVIC_SITE.z + v.z0)} width={(v.x1 - v.x0) * SCALE} height={(v.z1 - v.z0) * SCALE} rx={3}
                fill={kind === 'casino' ? C.red : boutique ? C.boutique : C.green} stroke={on ? C.gold : '#f5f0dc'} strokeWidth={on ? 3 : 1.5} />
              <text x={cx} y={cy + 3} textAnchor="middle" fontSize={boutique ? 7 : 8} fontWeight={700} fill="#f5f0dc">{SHORT[kind] ?? '服'}</text>
            </g>;
          })}
          {shops.map(l => typeof l.plot === 'number' && <g key={`pin-${l.id}`} {...pickable(`plot:${l.plot}`, sx(plotX(l.plot) + 2), sy(plotZ(l.plot) + 2) - 14, `お店 ${l.shop.name}`)} transform={`translate(${sx(plotX(l.plot) + 2)},${sy(plotZ(l.plot) + 2)})`} style={{ cursor: 'pointer' }}>
            <path d="M0 0 C-6 -8 -6 -14 0 -14 C6 -14 6 -8 0 0 Z" fill={l.shop.event && l.shop.event.day >= today ? C.red : '#c9772e'} stroke="#fff" strokeWidth={1.2} /><circle cy={-9.5} r={2.2} fill="#fff" />
          </g>)}
          <g transform={`translate(${sx(mx)},${sy(mz)})`} pointerEvents="none"><circle r={12} fill="#2470dd33" /><circle r={6} fill="#2470dd" stroke="#fff" strokeWidth={2} /></g>
        </g>
      </svg>
      {pick && <MapPopup pick={pick} view={view} size={size} lots={lots} offers={offers} market={market} currentId={currentId} today={today} mine={mine} shared={shared} onClose={() => setPick(null)} />}
    </div>
    {reconnecting && <p className="modal-network-warning map-network-warning" role="status">{networkMessage}</p>}
    <button className="map-close" onClick={() => close(null)} aria-label="閉じる">{iconText('✕')}</button>
  </div>;
}

type Eco = ReturnType<typeof useEconomy.getState>;
function MapPopup({ pick, view, size, lots, offers, market, currentId, today, mine, shared, onClose }: {
  pick: Pick; view: View; size: { w: number; h: number }; lots: Eco['lots']; offers: Eco['offers']; market: Eco['market'];
  currentId: string | null; today: number; mine: (lot: Eco['lots'][number]) => boolean; shared: boolean; onClose: () => void;
}) {
  // 吹き出しは選んだ物の上に出す。画面の上や端にはみ出すときは下・内側にずらす
  const px = view.x + pick.ax * view.k, py = view.y + pick.ay * view.k;
  const left = Math.min(Math.max(px, 120), Math.max(120, size.w - 120)), below = py < 120;
  let title = '', sub = '', warp: (() => void) | null = null, extra = null;
  if (pick.kind === 'venue') {
    title = VENUES[pick.venue].name; warp = () => warpToVenue(pick.venue);
  } else {
    const lot = lots.find(l => lotPlots(l).includes(pick.plot)), offer = offers.find(o => o.plot === pick.plot);
    const resident = townHouseDesign(TOWN_HOUSE_PLOTS[pick.plot] ?? '');
    if (lot) {
      title = lot.shop ? lot.shop.name : lot.name.replace(/（.*）$/, '');
      sub = lot.shop ? (eventLine(lot.shop, today) || lot.shop.flyer || '') : shared ? (mine(lot) ? 'あなたの家' : `持ち主：${lot.ownerName || 'ほかのプレイヤー'}`) : lot.id === currentId ? 'いまの家' : '';
      warp = () => warpToLot(lot.id);
      const joinWith = mine(lot) ? joinCandidate(lots, lot.id) : null;
      if (joinWith) extra = <button className="btn small" onClick={() => { const err = useEconomy.getState().joinLots(lot.id); if (err) useGame.getState().notify(err); onClose(); }}>{iconText('🔗 隣とつなげる')}</button>;
    } else if (offer) {
      title = `売地：${offer.name}`; sub = yen(offerPrice(offer, market)); warp = () => warpToPlot(pick.plot, offer.name);
    } else {
      title = resident ? resident.name : '空き地'; warp = () => warpToPlot(pick.plot, title);
    }
  }
  return <div className={`map-pop${below ? ' below' : ''}`} style={{ left, top: below ? py + 18 : py - 8 }} role="dialog" aria-label={title}>
    <b>{title}</b>
    {sub && <small>{iconText(sub)}</small>}
    <div className="map-pop-actions">{extra}{warp && <button className="btn primary small" onClick={warp}>ワープ</button>}</div>
  </div>;
}

/** 区画の名前を枠の幅に収める：文字を小さくし、それでも入らなければ末尾を「…」にする（和文1文字 ≒ 文字サイズ分の幅） */
function fitLabel(name: string, room: number, base: number) {
  const size = Math.min(base, room / name.length);
  if (size >= 6) return { text: name, size };
  return { text: name.slice(0, Math.max(1, Math.floor(room / 6) - 1)) + '…', size: 6 };
}
