// 町の地図：大通り沿いの区画、持っている土地、売り土地、カジノ、いまいる場所。持っている土地を選ぶとそこへワープできる
import { useEffect, useMemo, useRef, useState } from 'react';
import { getLocation, landPrice } from '../economy/market';
import { yen, yenShort } from '../economy/money';
import { CASINO_PLOT, DISTRICTS, FIRST_PLOT, LAST_PLOT, PLOT_PITCH, plotX } from '../economy/town';
import { useCurrentPlot, useEconomy } from '../state/economy';
import type { Lot } from '../state/economy';
import type { LandOffer } from '../economy/market';
import { useGame } from '../state/store';
import { goToCasino, playerMemory, warpToLot } from '../world/Player';
import { GRID, LOT_W } from '../building/dimensions';
import { Modal } from './Modal';

/** 地図の1区画の幅（px） */
const CELL = 64;
const PAD = 8;
const Y = { band: 0, north: 26, road: 92, plot: 116, bottom: 186 };
const WIDTH = (LAST_PLOT - FIRST_PLOT + 1) * CELL + PAD * 2;
const cellX = (plot: number) => PAD + (plot - FIRST_PLOT) * CELL;

type Pick = { kind: 'lot'; id: string } | { kind: 'offer'; id: string } | { kind: 'casino' } | null;

export function MapPanel() {
  const close = useGame((s) => s.setOverlay);
  const lots = useEconomy((s) => s.lots);
  const offers = useEconomy((s) => s.offers);
  const currentLotId = useEconomy((s) => s.currentLotId);
  const here = useCurrentPlot();
  const walking = useGame((s) => s.mode === 'walk');
  const [pick, setPick] = useState<Pick>(() => (currentLotId ? { kind: 'lot', id: currentLotId } : null));
  const scroller = useRef<HTMLDivElement>(null);

  // いまいる場所（歩いているならプレイヤーの位置、建築中ならいまの土地の真ん中）を区画の番号で
  const me = useMemo(() => {
    const x = walking ? playerMemory.x : (LOT_W * GRID) / 2;
    return (plotX(here) + x) / PLOT_PITCH;
  }, [walking, here]);

  // M キーでも閉じる（開くのも M）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyM' && !(e.target instanceof HTMLInputElement)) close(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  // 開いたら、いまいる場所が真ん中に来るようにスクロール
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    el.scrollLeft = PAD + (me - FIRST_PLOT) * CELL - el.clientWidth / 2;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const lotByPlot = new Map(lots.filter((l) => typeof l.plot === 'number').map((l) => [l.plot!, l]));
  const offerByPlot = new Map(offers.filter((o) => typeof o.plot === 'number').map((o) => [o.plot!, o]));
  const plots: number[] = [];
  for (let p = FIRST_PLOT; p <= LAST_PLOT; p++) plots.push(p);

  const picked =
    pick?.kind === 'lot' ? lots.find((l) => l.id === pick.id) : pick?.kind === 'offer' ? offers.find((o) => o.id === pick.id) : undefined;

  return (
    <Modal title="🗺 町の地図" onClose={() => close(null)} tabs={[]} tab="" onTab={() => undefined} className="map-modal">
      <div className="map-legend">
        <span><i className="sw owned" />あなたの土地</span>
        <span><i className="sw sale" />売り土地</span>
        <span><i className="sw me" />いまいる場所</span>
        <span className="muted">区画をタップ・クリックすると詳しく見られます</span>
      </div>
      <div className="map-scroll" ref={scroller}>
        <svg className="town-map" width={WIDTH} height={Y.bottom + 4} viewBox={`0 0 ${WIDTH} ${Y.bottom + 4}`}>
          {/* 地区 */}
          {DISTRICTS.map((d) => (
            <g key={d.location}>
              <rect x={cellX(d.from)} y={Y.band} width={(d.to - d.from + 1) * CELL} height={Y.bottom - Y.band} fill={d.color} />
              <text x={cellX(d.from) + 6} y={Y.band + 17} className="map-district">
                {getLocation(d.location).name}
              </text>
            </g>
          ))}
          {/* 大通り */}
          <rect x={0} y={Y.road} width={WIDTH} height={18} fill="#5b5e63" />
          <line x1={0} x2={WIDTH} y1={Y.road + 9} y2={Y.road + 9} stroke="#eee" strokeWidth={1} strokeDasharray="8 6" />
          <text x={WIDTH - PAD - 4} y={Y.road + 13} textAnchor="end" className="map-road">大通り</text>
          {/* カジノ（道路の向かい） */}
          <g
            className={`map-cell casino${pick?.kind === 'casino' ? ' picked' : ''}`}
            onClick={() => setPick({ kind: 'casino' })}
            role="button"
            aria-label="カジノ・競技場"
          >
            <rect x={cellX(CASINO_PLOT) + 4} y={Y.north + 6} width={CELL - 8} height={Y.road - Y.north - 12} rx={5} />
            <text x={cellX(CASINO_PLOT) + CELL / 2} y={Y.north + 30} textAnchor="middle" className="map-casino-text">カジノ</text>
            <text x={cellX(CASINO_PLOT) + CELL / 2} y={Y.north + 46} textAnchor="middle" className="map-casino-sub">競技場</text>
          </g>
          {/* 区画 */}
          {plots.map((p) => {
            const lot = lotByPlot.get(p);
            const offer = offerByPlot.get(p);
            const kind = lot ? 'owned' : offer ? 'sale' : 'empty';
            const isPicked = (lot && pick?.kind === 'lot' && pick.id === lot.id) || (offer && pick?.kind === 'offer' && pick.id === offer.id);
            const x = cellX(p) + 4;
            const name = lot ? shortName(lot.name) : offer ? offer.name : '';
            return (
              <g
                key={p}
                className={`map-cell ${kind}${isPicked ? ' picked' : ''}${lot && lot.id === currentLotId ? ' current' : ''}`}
                onClick={() => {
                  if (lot) setPick({ kind: 'lot', id: lot.id });
                  else if (offer) setPick({ kind: 'offer', id: offer.id });
                }}
                role={kind === 'empty' ? undefined : 'button'}
                aria-label={kind === 'empty' ? undefined : name}
              >
                <rect x={x} y={Y.plot} width={CELL - 8} height={Y.bottom - Y.plot - 8} rx={4} />
                {lot && lot.built && <HouseIcon x={x + (CELL - 8) / 2} y={Y.plot + 22} />}
                {lot && !lot.built && <text x={x + (CELL - 8) / 2} y={Y.plot + 26} textAnchor="middle" className="map-cell-sub">{lot.construction ? '工事中' : '更地'}</text>}
                {offer && <text x={x + (CELL - 8) / 2} y={Y.plot + 22} textAnchor="middle" className="map-sale-text">売地</text>}
                {name && (
                  <text x={x + (CELL - 8) / 2} y={Y.plot + 46} textAnchor="middle" className="map-cell-name">
                    {name}
                  </text>
                )}
                {offer && (
                  <text x={x + (CELL - 8) / 2} y={Y.plot + 60} textAnchor="middle" className="map-cell-sub">
                    <OfferPrice offer={offer} />
                  </text>
                )}
              </g>
            );
          })}
          {/* いまいる場所 */}
          <g className="map-me" transform={`translate(${PAD + (me - FIRST_PLOT) * CELL}, ${Y.road + 9})`}>
            <circle r={7} />
            <text x={10} y={4}>いまここ</text>
          </g>
        </svg>
      </div>

      <div className="map-detail card">
        {pick?.kind === 'casino' ? (
          <CasinoDetail />
        ) : pick?.kind === 'lot' && picked ? (
          <LotDetail lot={picked as Lot} />
        ) : pick?.kind === 'offer' && picked ? (
          <OfferDetail offer={picked as LandOffer} onBought={(id) => setPick({ kind: 'lot', id })} />
        ) : (
          <p className="muted">地図の区画を選んでください。</p>
        )}
      </div>

      <section className="map-mylots">
        <div className="card-title">あなたの土地（{lots.length}）</div>
        {lots.length === 0 && <p className="muted">土地を持っていません。地図の「売地」から買えます。</p>}
        <ul>
          {lots.map((l) => (
            <li key={l.id} className={l.id === currentLotId ? 'on' : ''}>
              <button className="link-btn" onClick={() => setPick({ kind: 'lot', id: l.id })}>
                {l.name}
              </button>
              <span className="muted">{status(l)}</span>
              {l.id === currentLotId ? (
                <span className="muted here">いまここ</span>
              ) : (
                <button className="btn small primary" onClick={() => warpToLot(l.id)}>
                  ワープ
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>
    </Modal>
  );
}

function shortName(name: string) {
  return name.replace(/（.*）$/, '');
}

function status(l: Lot) {
  return l.construction ? '工事中' : l.rented ? '貸し出し中' : l.built ? '家あり' : '更地';
}

function OfferPrice({ offer }: { offer: LandOffer }) {
  const market = useEconomy((s) => s.market);
  return <>{yenShort(landPrice(offer.location, offer.variance, market))}</>;
}

function HouseIcon({ x, y }: { x: number; y: number }) {
  return (
    <path
      className="map-house"
      transform={`translate(${x - 10}, ${y - 12})`}
      d="M10 0 L20 9 L17 9 L17 20 L12 20 L12 13 L8 13 L8 20 L3 20 L3 9 L0 9 Z"
    />
  );
}

function LotDetail({ lot }: { lot: Lot }) {
  const current = useEconomy((s) => s.currentLotId === lot.id);
  const walking = useGame((s) => s.mode === 'walk');
  return (
    <>
      <h3>{lot.name}</h3>
      <p className="muted">
        {getLocation(lot.location).name}・{status(lot)}
      </p>
      {current ? (
        <>
          <p>いまこの土地で建てています。</p>
          {walking && (
            <button className="btn" onClick={() => warpToLot(lot.id)}>
              土地の前に戻る
            </button>
          )}
        </>
      ) : (
        <button className="btn primary" onClick={() => warpToLot(lot.id)}>
          📍 ここへワープ
        </button>
      )}
    </>
  );
}

function OfferDetail({ offer, onBought }: { offer: LandOffer; onBought: (lotId: string) => void }) {
  const market = useEconomy((s) => s.market);
  const money = useEconomy((s) => s.money);
  const buy = useEconomy((s) => s.buyLand);
  const notify = useGame((s) => s.notify);
  const loc = getLocation(offer.location);
  const price = landPrice(offer.location, offer.variance, market);
  return (
    <>
      <h3>売地：{offer.name}</h3>
      <p className="muted">
        {loc.name}（建物の査定 ×{loc.factor}）　価格 <b>{yen(price)}</b>
      </p>
      <button
        className="btn primary"
        disabled={price > money}
        onClick={() => {
          const err = buy(offer.id);
          if (err) return notify(err);
          const lot = useEconomy.getState().lots.find((l) => l.plot === offer.plot);
          if (lot) onBought(lot.id);
        }}
      >
        この土地を買う（{yen(price)}）
      </button>
      {price > money && <p className="warn">お金が {yen(price - money)} 足りません。</p>}
    </>
  );
}

function CasinoDetail() {
  return (
    <>
      <h3>🎰 カジノ・競技場</h3>
      <p className="muted">はじめの土地の道路の向かいにあります。入口の前で F キー（スマホは「入る」ボタン）で中に入れます。</p>
      <button className="btn primary" onClick={() => goToCasino()}>
        カジノの入口へワープ
      </button>
    </>
  );
}
