import { useEffect, useRef, useState } from 'react';
import { getLocation, landPrice } from '../economy/market';
import { yen } from '../economy/money';
import { TOWN_HOUSE_PLOTS, townHouseDesign } from '../building/townHouses';
import { BLOCK_COLUMNS, BLOCK_ROWS, CIVIC_SITE, FIRST_PLOT, LAST_PLOT, TOWN_BOUNDS, TOWN_ROADS, blockOf, districtOf, plotX, plotZ } from '../economy/town';
import { useCurrentPlot, useEconomy } from '../state/economy';
import { useGame } from '../state/store';
import { playerMemory, warpToLot } from '../world/Player';
import { GRID, LOT_D, LOT_W } from '../building/dimensions';
import { DEALER } from '../building/dealer';
import { CASINO, ESTATE } from '../building/landmarks';
import { Modal } from './Modal';

const SCALE = 3.2, PAD = 28;
const sx = (x: number) => PAD + (x - TOWN_BOUNDS.x0 + 12) * SCALE;
const sy = (z: number) => PAD + (z - TOWN_BOUNDS.z0 + 12) * SCALE;
const WIDTH = sx(TOWN_BOUNDS.x1 + 35) + PAD, HEIGHT = sy(TOWN_BOUNDS.z1 + 35) + PAD;
type Pick = { kind: 'plot'; plot: number } | { kind: 'casino' | 'estate' | 'dealer' } | null;

export function MapPanel() {
  const close = useGame(s => s.setOverlay), walking = useGame(s => s.mode === 'walk');
  const lots = useEconomy(s => s.lots), offers = useEconomy(s => s.offers), market = useEconomy(s => s.market);
  const currentId = useEconomy(s => s.currentLotId), here = useCurrentPlot();
  const map = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pick, setPick] = useState<Pick>({ kind: 'plot', plot: here });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.code === 'KeyM' && !(e.target instanceof HTMLInputElement)) close(null); };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, [close]);
  const plots = Array.from({ length: LAST_PLOT - FIRST_PLOT + 1 }, (_, i) => FIRST_PLOT + i);
  const selectedLot = pick?.kind === 'plot' ? lots.find(l => l.plot === pick.plot) : undefined;
  const selectedOffer = pick?.kind === 'plot' ? offers.find(o => o.plot === pick.plot) : undefined;
  const mx = plotX(here) + (walking ? playerMemory.x : LOT_W * GRID / 2);
  const mz = plotZ(here) + (walking ? playerMemory.z : LOT_D * GRID / 2);
  const centerHere = () => {
    setZoom(2);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const el = map.current, svg = el?.querySelector('svg');
      if (!el || !svg) return;
      const ratio = svg.getBoundingClientRect().width / WIDTH;
      el.scrollTo({left: sx(mx) * ratio - el.clientWidth / 2, top: sy(mz) * ratio - el.clientHeight / 2, behavior: 'smooth'});
    }));
  };
  return <Modal title="🗺 町の地図" onClose={() => close(null)} tabs={[]} tab="" onTab={() => undefined} className="map-modal">
    <div className="map-legend"><span><i className="sw owned" />あなたの家・土地</span><span><i className="sw sale" />売り土地</span><span><i className="sw me" />現在地</span></div>
    <p className="info">{BLOCK_COLUMNS * BLOCK_ROWS}ブロック・各4区画の住宅街です。南側にカジノ・不動産屋・カーディーラーがあります。</p>
    <div className="map-controls" aria-label="地図の表示">
      <button className="btn" onClick={() => { setZoom(1); map.current?.scrollTo(0, 0); }}>全体</button>
      <button className="btn" aria-label="地図を拡大" disabled={zoom >= 3} onClick={() => setZoom(z => Math.min(3, z + .5))}>＋ 拡大</button>
      <button className="btn" aria-label="地図を縮小" disabled={zoom <= 1} onClick={() => setZoom(z => Math.max(1, z - .5))}>－ 縮小</button>
      <button className="btn" onClick={centerHere}>現在地</button>
    </div>
    <p className="info">拡大すると指で上下左右に動かせます。家・売地・店舗をタップして詳細を表示します。</p>
    <div ref={map} className="map-scroll" style={{ maxHeight: '55vh', overflow: 'auto' }}>
      <svg width={`${zoom * 100}%`} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} style={{ minWidth: 0, maxWidth: 'none', display: 'block', background: '#e7ebdf', borderRadius: 10 }} role="img" aria-label="8ブロックに32区画が並ぶ町の地図">
        {TOWN_ROADS.map((road, i) => <g key={i}>
          <rect x={sx(road.x0 - 0.8)} y={sy(road.z0 - 0.8)} width={(road.x1 - road.x0 + 1.6) * SCALE} height={(road.z1 - road.z0 + 1.6) * SCALE} fill="#c1c6bd" />
          <rect x={sx(road.x0)} y={sy(road.z0)} width={(road.x1 - road.x0) * SCALE} height={(road.z1 - road.z0) * SCALE} fill="#657075" />
        </g>)}
        {plots.map(plot => {
          const lot = lots.find(l => l.plot === plot), offer = offers.find(o => o.plot === plot);
          const picked = pick?.kind === 'plot' && pick.plot === plot;
          const resident = !lot && !offer ? townHouseDesign(TOWN_HOUSE_PLOTS[plot] ?? '') : undefined;
          const name = lot ? lot.name.replace(/（.*）$/, '') : offer ? '売地' : resident ? resident.name : '区画';
          const district = districtOf(plot);
          return <g key={plot} role="button" aria-label={name} tabIndex={0} onClick={() => setPick({ kind: 'plot', plot })} onKeyDown={e => { if (e.key === 'Enter') setPick({ kind: 'plot', plot }); }} style={{ cursor: 'pointer' }}>
            <rect x={sx(plotX(plot))} y={sy(plotZ(plot))} width={LOT_W * GRID * SCALE} height={LOT_D * GRID * SCALE} rx={3}
              fill={lot ? '#e0e9f2' : offer ? '#fff4d8' : resident ? '#d9d6cf' : district?.color ?? '#dce2d5'} stroke={picked ? '#255db1' : lot ? '#7897ae' : '#bdc6b6'} strokeWidth={picked ? 3 : 1} />
            {lot && <path d="M-9 0 L0 -8 L9 0 L7 0 L7 10 L-7 10 L-7 0 Z" transform={`translate(${sx(plotX(plot) + LOT_W * GRID / 2)},${sy(plotZ(plot) + 5)})`} fill="#457591" />}
            <text x={sx(plotX(plot) + LOT_W * GRID / 2)} y={sy(plotZ(plot) + (lot ? 12 : 9))} textAnchor="middle" fontSize={lot ? 7 : 9} fill={offer ? '#ac4c30' : '#3a5553'}>{name.slice(0, 10)}</text>
            <text x={sx(plotX(plot) + LOT_W * GRID / 2)} y={sy(plotZ(plot) + 16)} textAnchor="middle" fontSize={6} fill="#78877c">BLOCK {String(blockOf(plot) + 1).padStart(2, '0')} · {plot - FIRST_PLOT + 1}</text>
          </g>;
        })}
        {[{ kind: 'casino' as const, box: CASINO, label: 'GRAND STRIP' }, { kind: 'estate' as const, box: ESTATE, label: '不動産屋' }, { kind: 'dealer' as const, box: DEALER, label: '車販売' }].map(({ kind, box, label }) => <g key={kind} role="button" tabIndex={0} aria-label={label} style={{ cursor: 'pointer' }} onClick={() => setPick({ kind })} onKeyDown={e => { if (e.key === 'Enter') setPick({ kind }); }}>
          <rect x={sx(CIVIC_SITE.x + box.x0)} y={sy(CIVIC_SITE.z + box.z0)} width={(box.x1 - box.x0) * SCALE} height={(box.z1 - box.z0) * SCALE} rx={3} fill={kind === 'casino' ? '#755743' : '#34777a'} stroke={pick?.kind === kind ? '#f6bf4d' : '#fff9'} strokeWidth={2} />
          <text x={sx(CIVIC_SITE.x + (box.x0 + box.x1) / 2)} y={sy(CIVIC_SITE.z + (box.z0 + box.z1) / 2)} textAnchor="middle" fontSize={kind === 'casino' ? 8 : 7} fill="#fff">{label}</text>
        </g>)}
        <g transform={`translate(${sx(mx)},${sy(mz)})`}><circle r={6} fill="#2470dd" stroke="#fff" strokeWidth={2} /><circle r={11} fill="#2470dd22" /></g>
        <text x={WIDTH - 30} y={28} textAnchor="end" fontSize={12} fill="#526456">N ↑</text>
      </svg>
    </div>
    <div className="map-detail card">
      {selectedLot ? <><h3>{selectedLot.name}</h3><p className="muted">{getLocation(selectedLot.location).name}・{selectedLot.construction ? '工事中' : selectedLot.built ? '家あり' : '土地'}</p><button className="btn primary" onClick={() => warpToLot(selectedLot.id)}>{selectedLot.id === currentId ? 'この家の前に戻る' : 'この家へワープ'}</button></>
      : selectedOffer ? <><h3>売り土地：{selectedOffer.name}</h3><p>価格 {yen(landPrice(selectedOffer.location, selectedOffer.variance, market))}</p><p className="info">看板の前でFを押すと、この土地を購入できます。不動産屋でも購入できます。</p></>
      : pick?.kind === 'casino' || pick?.kind === 'estate' || pick?.kind === 'dealer' ? <><h3>{pick.kind === 'casino' ? 'GRAND STRIP CASINO' : pick.kind === 'dealer' ? 'AVENUE MOTORS' : 'まちの不動産'}</h3><p>住宅街の南側にあります。店舗の入口でFキー（スマホは入場ボタン）を押してください。</p></>
      : pick?.kind === 'plot' && townHouseDesign(TOWN_HOUSE_PLOTS[pick.plot] ?? '') ? <><h3>{townHouseDesign(TOWN_HOUSE_PLOTS[pick.plot])!.name}</h3><p className="muted">ほかの住人の家・{townHouseDesign(TOWN_HOUSE_PLOTS[pick.plot])!.model}</p></>
      : <p className="muted">地図の家・土地・店舗を選んでください。</p>}
    </div>
    <section className="map-mylots"><div className="card-title">あなたの家・土地（{lots.length}）</div><ul>
      {lots.map(lot => <li key={lot.id}><button className="link-btn" onClick={() => setPick({ kind: 'plot', plot: lot.plot ?? here })}>{lot.name}</button><button className="btn small" onClick={() => warpToLot(lot.id)}>ワープ</button></li>)}
    </ul></section>
  </Modal>;
}

