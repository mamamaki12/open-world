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
// 携帯ゲーム機の画面に合わせた少ない色（くすんだ緑の濃淡＋紙色。赤と金は目印だけ）
const C = { grass: '#c4d39e', tuft: '#a5ba80', yard: '#d5e0ad', road: '#4a5945', curb: '#8fa66e', line: '#e6e2c3', walk: '#e8e3c6', walkDot: '#cfc9a6',
  paper: '#f5f0dc', ink: '#29392f', muted: '#59694f', dark: '#3e634c', mid: '#71806a', leaf: '#5f7d4f', leafHi: '#7f9a62', red: '#9b4150', gold: '#d4ac55', plum: '#80566b', roofMine: '#c08a3e' };

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

  const zoomed = view.k >= fit * 1.7;
  const plots = Array.from({ length: LAST_PLOT - FIRST_PLOT + 1 }, (_, i) => FIRST_PLOT + i);

  return <div className="overlay map-screen" role="dialog" aria-label="🗺 町の地図">
    <div ref={box} className="map-canvas">
      <svg width="100%" height="100%" role="img" aria-label="8ブロックに32区画が並ぶ町の地図"
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
        onWheel={e => { const p = local(e); zoomAt(p.x, p.y, e.deltaY < 0 ? 1.15 : 1 / 1.15); }}>
        <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`} fontFamily="inherit">
          <defs>
            <pattern id="map-grass" width="12" height="12" patternUnits="userSpaceOnUse"><rect width="12" height="12" fill={C.grass} /><path d="M2 3h1v1H2zM3 2h1v1H3zM4 3h1v1H4zM8 9h1v1H8zM9 8h1v1H9zM10 9h1v1h-1z" fill={C.tuft} /></pattern>
            <pattern id="map-yard" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill={C.yard} /><rect x="1" y="1" width="1" height="1" fill={C.tuft} /></pattern>
            <pattern id="map-forest" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="16" height="16" fill={C.grass} />
              <g transform="translate(8 13) scale(1.8)"><path d="M-2 -6h4v1h1v1h1v3h-1v1h-1v1h-4v-1h-1v-1h-1v-3h1v-1h1z" fill={C.leaf} stroke={C.ink} strokeWidth={0.5} /><path d="M-1 -5h2v1h-2zM-2 -4h1v1h-1z" fill={C.leafHi} /></g></pattern>
            <pattern id="map-walk" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill={C.walk} /><path d="M0 0h4v4H0zM4 4h4v4H4z" fill={C.walkDot} /></pattern>
          </defs>
          <g shapeRendering="crispEdges">
            <rect x={-4000} y={-4000} width={WIDTH + 8000} height={HEIGHT + 8000} fill="url(#map-forest)" />
            <rect x={14} y={14} width={WIDTH - 28} height={HEIGHT - 28} fill="url(#map-grass)" />
            {TREES.map(([x, y], i) => <Tree key={'t' + i} x={x} y={y} />)}
            {ROADS.map((r, i) => <rect key={'curb' + i} x={r.x - 3} y={r.y - 3} width={r.w + 6} height={r.h + 6} fill={C.curb} />)}
            {ROADS.map((r, i) => <rect key={'road' + i} x={r.x} y={r.y} width={r.w} height={r.h} fill={C.road} />)}
            <path d={ROAD_LINES} stroke={C.line} strokeWidth={2} strokeDasharray="8 8" fill="none" />
            <path d={CROSSWALKS} fill={C.line} />
            {SHOP_PATHS.map((p, i) => <rect key={'walk-' + i} x={sx(p.x0)} y={sy(p.z0)} width={(p.x1 - p.x0) * SCALE} height={(p.z1 - p.z0) * SCALE} fill="url(#map-walk)" />)}
          </g>
          {plots.map(plot => {
            // つなげた土地は西の区画で2区画ぶんの幅に描き、東の区画は描かない
            if (lots.some(l => l.joined === plot)) return null;
            const lot = lots.find(l => l.plot === plot), offer = offers.find(o => o.plot === plot);
            const owned = !!lot && mine(lot);
            const w = lotCells(lot).w * GRID * SCALE, h = LOT_D * GRID * SCALE;
            const picked = pick?.kind === 'plot' && (pick.plot === plot || (lot && lotPlots(lot).includes(pick.plot)));
            const resident = !lot && !offer ? townHouseDesign(TOWN_HOUSE_PLOTS[plot] ?? '') : undefined;
            const name = lot ? lot.name.replace(/（.*）$/, '') : offer ? '売地' : resident ? resident.name : '空き地';
            const x = sx(plotX(plot)), y = sy(plotZ(plot)), cx = x + w / 2;
            const tall = !!resident && /マンション|アパート|レジデンス|ハイツ/.test(resident.name);
            const label = fitLabel(name, w - 6, 7);
            return <g key={plot} {...pickable(`plot:${plot}`, cx, y + 6, name)} style={{ cursor: 'pointer' }}>
              <rect x={x} y={y} width={w} height={h} fill={lot || resident ? 'url(#map-yard)' : 'url(#map-grass)'} stroke={C.mid} strokeWidth={1} shapeRendering="crispEdges" />
              {lot || resident ? (tall ? <Tower x={cx} y={y + h * 0.5} /> : <House x={cx} y={y + h * 0.52} roof={owned ? C.roofMine : lot ? C.red : C.dark} />)
                : offer ? <SaleSign x={cx} y={y + h * 0.5} /> : <><Tree x={x + w * 0.3} y={y + h * 0.45} small /><Tree x={x + w * 0.68} y={y + h * 0.62} small /></>}
              {owned && <Flag x={x + w - 12} y={y + 6} />}
              {zoomed && !offer && <g pointerEvents="none"><rect x={cx - label.text.length * label.size / 2 - 3} y={y + h - 13} width={label.text.length * label.size + 6} height={label.size + 4} fill={C.paper} stroke={C.ink} strokeWidth={0.8} />
                <text x={cx} y={y + h - 13 + label.size + 0.5} textAnchor="middle" fontSize={label.size} fill={offer ? C.red : C.ink}>{label.text}</text></g>}
              {picked && <rect className="map-picked" x={x + 1.5} y={y + 1.5} width={w - 3} height={h - 3} fill="none" stroke={C.gold} strokeWidth={3} strokeDasharray="10 6" />}
            </g>;
          })}
          {SHOPPING_AREAS.map(a => <Plate key={a.name} x={sx(a.x)} y={sy(a.z) + 5} text={a.name} size={6.5} />)}
          {VENUE_KINDS.map(kind => {
            const v = VENUES[kind], boutique = BOUTIQUE_IDS.includes(kind as BoutiqueId), on = pick?.kind === 'venue' && pick.venue === kind;
            const x = sx(CIVIC_SITE.x + v.x0), y = sy(CIVIC_SITE.z + v.z0), w = (v.x1 - v.x0) * SCALE, h = (v.z1 - v.z0) * SCALE;
            return <g key={kind} {...pickable(`venue:${kind}`, x + w / 2, y, v.name)} style={{ cursor: 'pointer' }}>
              <Shop x={x} y={y} w={w} h={h} wall={kind === 'casino' ? C.red : boutique ? C.plum : C.dark} awning={kind === 'casino' ? C.gold : C.paper} label={SHORT[kind] ?? '服'} star={kind === 'casino'} />
              {on && <rect className="map-picked" x={x - 3} y={y - 3} width={w + 6} height={h + 6} fill="none" stroke={C.gold} strokeWidth={3} strokeDasharray="10 6" />}
            </g>;
          })}
          {shops.map(l => typeof l.plot === 'number' && <g key={`pin-${l.id}`} {...pickable(`plot:${l.plot}`, sx(plotX(l.plot) + 3), sy(plotZ(l.plot) + 1), `お店 ${l.shop.name}`)} transform={`translate(${sx(plotX(l.plot) + 3)},${sy(plotZ(l.plot) + 1)})`} style={{ cursor: 'pointer' }} shapeRendering="crispEdges">
            <rect x={-1} y={0} width={2} height={18} fill={C.ink} /><rect x={1} y={0} width={12} height={8} fill={l.shop.event && l.shop.event.day >= today ? C.red : C.gold} stroke={C.ink} strokeWidth={1} />
          </g>)}
          <Compass x={34} y={34} />
          <g transform={`translate(${sx(mx)},${sy(mz)})`} pointerEvents="none"><Me /></g>
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

/** 道（地図の座標）。交差点では中央線を切り、手前に横断歩道を描く */
const ROADS = TOWN_ROADS.map(r => { const x = sx(r.x0), y = sy(r.z0), w = (r.x1 - r.x0) * SCALE, h = (r.z1 - r.z0) * SCALE; return { x, y, w, h, tall: h > w }; });
const crossings = (r: (typeof ROADS)[number]) => ROADS.filter(o => o.tall !== r.tall && o.x < r.x + r.w && o.x + o.w > r.x && o.y < r.y + r.h && o.y + o.h > r.y);
const ROAD_LINES = ROADS.map(r => {
  // 道の向きに沿って、交差する道の幅（＋横断歩道ぶん）を除いた区間だけ線を引く
  const [start, end] = r.tall ? [r.y, r.y + r.h] : [r.x, r.x + r.w];
  const cuts = crossings(r).map(o => r.tall ? [o.y - 12, o.y + o.h + 12] : [o.x - 12, o.x + o.w + 12]).sort((p, q) => p[0] - q[0]);
  let d = '', from = start;
  for (const [c0, c1] of [...cuts, [end, end]]) {
    if (c0 - from > 8) d += r.tall ? `M${r.x + r.w / 2} ${from}V${c0}` : `M${from} ${r.y + r.h / 2}H${c0}`;
    from = Math.max(from, c1);
  }
  return d;
}).join('');
const CROSSWALKS = ROADS.map(r => crossings(r).map(o => {
  // 交差点の手前（両側）に、道を横切る白い縞
  const bands = r.tall ? [o.y - 10, o.y + o.h + 3] : [o.x - 10, o.x + o.w + 3];
  return bands.filter(b => r.tall ? b >= r.y && b + 7 <= r.y + r.h : b >= r.x && b + 7 <= r.x + r.w).map(b => {
    let d = '';
    for (let t = 3; t < (r.tall ? r.w : r.h) - 3; t += 5) d += r.tall ? `M${r.x + t} ${b}h3v7h-3z` : `M${b} ${r.y + t}h7v3h-7z`;
    return d;
  }).join('');
}).join('')).join('');

/** 町の外まわりに並べる木（道・お店・区画にかからない所だけ） */
const TREES: [number, number][] = (() => {
  const busy = [
    ...TOWN_ROADS.map(r => [sx(r.x0) - 6, sy(r.z0) - 6, sx(r.x1) + 6, sy(r.z1) + 6]),
    ...SHOP_PATHS.map(p => [sx(p.x0) - 4, sy(p.z0) - 4, sx(p.x1) + 4, sy(p.z1) + 4]),
    ...VENUE_KINDS.map(k => { const v = VENUES[k]; return [sx(CIVIC_SITE.x + v.x0) - 8, sy(CIVIC_SITE.z + v.z0) - 14, sx(CIVIC_SITE.x + v.x1) + 8, sy(CIVIC_SITE.z + v.z1) + 8]; }),
    ...SHOPPING_AREAS.map(a => [sx(a.x) - 50, sy(a.z) - 14, sx(a.x) + 50, sy(a.z) + 6]),
    [0, 0, 60, 60],
  ];
  const out: [number, number][] = [];
  for (let y = 26; y < HEIGHT - 16; y += 18) for (let x = 24 + ((y / 18) % 2) * 9; x < WIDTH - 16; x += 18) {
    if ((x * 7 + y * 13) % 5 === 0) continue;
    if (busy.some(([x0, y0, x1, y1]) => x > x0 - 8 && x < x1 + 8 && y > y0 - 10 && y < y1 + 6)) continue;
    const inTown = x > sx(TOWN_BOUNDS.x0) && x < sx(TOWN_BOUNDS.x1) && y > sy(TOWN_BOUNDS.z0) && y < sy(TOWN_BOUNDS.z1);
    if (!inTown) out.push([x, y]);
  }
  return out;
})();

function Tree({ x, y, small }: { x: number; y: number; small?: boolean }) {
  const u = small ? 1.6 : 2;
  return <g transform={`translate(${x} ${y}) scale(${u})`} shapeRendering="crispEdges" pointerEvents="none">
    <path d="M-2 -6h4v1h1v1h1v3h-1v1h-1v1h-4v-1h-1v-1h-1v-3h1v-1h1z" fill={C.leaf} stroke={C.ink} strokeWidth={0.5} />
    <path d="M-1 -5h2v1h-2zM-2 -4h1v1h-1z" fill={C.leafHi} />
    <rect x={-0.5} y={-1} width={1} height={2} fill={C.ink} />
  </g>;
}

function House({ x, y, roof }: { x: number; y: number; roof: string }) {
  return <g transform={`translate(${x - 21} ${y - 18}) scale(3)`} shapeRendering="crispEdges" pointerEvents="none">
    <rect x={1} y={11.5} width={12} height={1} fill={C.ink} opacity={0.25} />
    <path d="M1 5h12v7H1z" fill={C.paper} stroke={C.ink} strokeWidth={0.5} />
    <path d="M5 0h4v1h2v1h2v1h1v2H0V3h1V2h2V1h2z" fill={roof} stroke={C.ink} strokeWidth={0.5} />
    <rect x={6} y={8} width={2} height={4} fill={C.ink} />
    <rect x={2.5} y={6.5} width={2} height={2} fill={C.grass} stroke={C.ink} strokeWidth={0.3} />
    <rect x={9.5} y={6.5} width={2} height={2} fill={C.grass} stroke={C.ink} strokeWidth={0.3} />
  </g>;
}

function Tower({ x, y }: { x: number; y: number }) {
  return <g transform={`translate(${x - 15} ${y - 22}) scale(3)`} shapeRendering="crispEdges" pointerEvents="none">
    <rect x={0} y={0} width={10} height={14} fill={C.paper} stroke={C.ink} strokeWidth={0.5} />
    <rect x={0} y={0} width={10} height={2} fill={C.mid} stroke={C.ink} strokeWidth={0.5} />
    {[3, 6, 9].map(r => [1.5, 4.5, 7.5].map(c => <rect key={`${r}-${c}`} x={c} y={r} width={1.5} height={1.5} fill={C.dark} />))}
    <rect x={4} y={11.5} width={2} height={2.5} fill={C.ink} />
  </g>;
}

function SaleSign({ x, y }: { x: number; y: number }) {
  return <g transform={`translate(${x} ${y})`} shapeRendering="crispEdges" pointerEvents="none">
    <rect x={-1.5} y={-2} width={3} height={14} fill={C.ink} />
    <rect x={-11} y={-14} width={22} height={14} fill={C.paper} stroke={C.red} strokeWidth={2} />
    <text y={-3.5} textAnchor="middle" fontSize={9} fontWeight={700} fill={C.red}>売地</text>
  </g>;
}

function Flag({ x, y }: { x: number; y: number }) {
  return <g transform={`translate(${x} ${y})`} shapeRendering="crispEdges" pointerEvents="none">
    <rect x={0} y={0} width={1.5} height={12} fill={C.ink} /><path d="M1.5 0h8v3h-2v1h2v3h-8z" fill={C.gold} stroke={C.ink} strokeWidth={0.6} />
  </g>;
}

function Shop({ x, y, w, h, wall, awning, label, star }: { x: number; y: number; w: number; h: number; wall: string; awning: string; label: string; star?: boolean }) {
  const stripes = Math.max(2, Math.round(w / 8));
  return <g shapeRendering="crispEdges">
    <rect x={x + 2} y={y + 3} width={w} height={h} fill={C.ink} opacity={0.3} />
    <rect x={x} y={y} width={w} height={h} fill={wall} stroke={C.ink} strokeWidth={1.5} />
    <rect x={x} y={y} width={w} height={Math.min(6, h / 4)} fill={C.ink} opacity={0.35} />
    {Array.from({ length: stripes }, (_, i) => <rect key={i} x={x + (w / stripes) * i} y={y + h - 6} width={w / stripes} height={6} fill={i % 2 ? wall : awning} stroke={C.ink} strokeWidth={0.6} />)}
    {star && [0.2, 0.8].map(f => <path key={f} transform={`translate(${x + w * f} ${y + h * 0.45})`} d="M-1 -4h2v3h3v2h-3v3h-2v-3h-3v-2h3z" fill={C.gold} />)}
    <Plate x={x + w / 2} y={y + h / 2 - 1} text={label} size={label.length > 3 ? 6.5 : 8} />
  </g>;
}

/** 看板（紙色の板に濃い緑の縁と文字） */
function Plate({ x, y, text, size }: { x: number; y: number; text: string; size: number }) {
  const w = [...text].reduce((n, ch) => n + (ch.charCodeAt(0) < 128 ? 0.62 : 1), 0) * size + 6;
  return <g pointerEvents="none" shapeRendering="crispEdges">
    <rect x={x - w / 2} y={y - size / 2 - 2.5} width={w} height={size + 5} fill={C.paper} stroke={C.ink} strokeWidth={1} />
    <text x={x} y={y + size * 0.36} textAnchor="middle" fontSize={size} fontWeight={700} fill={C.ink}>{text}</text>
  </g>;
}

function Compass({ x, y }: { x: number; y: number }) {
  return <g transform={`translate(${x} ${y})`} shapeRendering="crispEdges" pointerEvents="none">
    <rect x={-15} y={-15} width={30} height={30} fill={C.paper} stroke={C.ink} strokeWidth={1.5} />
    <path d="M0 -11l4 9h-8z" fill={C.red} /><path d="M0 11l4 -9h-8z" fill={C.mid} />
    <text y={4} textAnchor="middle" fontSize={8} fontWeight={700} fill={C.ink}>N</text>
  </g>;
}

/** 現在地：点滅する輪と、ドット絵の人 */
function Me() {
  return <g shapeRendering="crispEdges">
    <rect className="map-me-ring" x={-13} y={-13} width={26} height={26} fill="none" stroke={C.red} strokeWidth={2} strokeDasharray="6 4" />
    <g transform="translate(-6 -9) scale(2)">
      <path d="M2 0h2v1h1v2H1V1h1z" fill={C.ink} />
      <rect x={1.5} y={2} width={3} height={2} fill={C.paper} stroke={C.ink} strokeWidth={0.4} />
      <rect x={1} y={4} width={4} height={3} fill={C.red} stroke={C.ink} strokeWidth={0.4} />
      <rect x={1.5} y={7} width={1.2} height={2} fill={C.ink} /><rect x={3.3} y={7} width={1.2} height={2} fill={C.ink} />
    </g>
  </g>;
}
