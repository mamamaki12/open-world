// 証券取引所：実際の相場で指数・株を円で売買する
import { useEffect, useState } from 'react';
import { INSTRUMENTS, changePct, unitYen, valuation } from '../economy/stocks';
import type { Quote } from '../economy/stocks';
import { yen } from '../economy/money';
import { useEconomy } from '../state/economy';
import { useGame } from '../state/store';
import { buyStock, refreshQuotes, sellStock, useStocks } from '../state/stocks';
import { Modal } from './Modal';
import './exchange.css';

type Tab = 'market' | 'portfolio';
const fmt = (n: number, d = 2) => n.toLocaleString('ja-JP', { minimumFractionDigits: d, maximumFractionDigits: d });
const when = (t: number) => new Date(t * 1000).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
const pctClass = (p: number) => (p > 0 ? 'up' : p < 0 ? 'down' : '');
const signed = (p: number) => `${p > 0 ? '+' : ''}${fmt(p)}%`;

function Chart({ q, range }: { q: Quote; range: 'day' | 'year' }) {
  const pts = range === 'day' ? q.intraday : q.daily;
  if (pts.length < 2) return <div className="ex-chart empty">この期間のデータがありません</div>;
  const ys = pts.map(p => p[1]), lo = Math.min(...ys, range === 'day' ? q.prevClose : Infinity), hi = Math.max(...ys, range === 'day' ? q.prevClose : -Infinity);
  const t0 = pts[0][0], t1 = pts[pts.length - 1][0], W = 600, H = 200;
  const x = (t: number) => ((t - t0) / Math.max(1, t1 - t0)) * W, y = (v: number) => H - 8 - ((v - lo) / Math.max(1e-9, hi - lo)) * (H - 16);
  const up = ys[ys.length - 1] >= (range === 'day' ? q.prevClose : ys[0]);
  return <svg className={'ex-chart ' + (up ? 'up' : 'down')} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="値動きのグラフ">
    {range === 'day' && <line x1={0} x2={W} y1={y(q.prevClose)} y2={y(q.prevClose)} className="ex-base" />}
    <polyline points={pts.map(p => `${x(p[0]).toFixed(1)},${y(p[1]).toFixed(1)}`).join(' ')} />
  </svg>;
}

export function ExchangePanel() {
  const [tab, setTab] = useState<Tab>('market'), [sym, setSym] = useState(INSTRUMENTS[0].symbol), [range, setRange] = useState<'day' | 'year'>('day');
  const [amount, setAmount] = useState('100000'), [units, setUnits] = useState(''), [msg, setMsg] = useState('');
  const { quotes, holdings, status } = useStocks(), money = useEconomy(s => s.money), close = useGame(s => s.setOverlay);
  useEffect(() => { void refreshQuotes(); const id = setInterval(() => void refreshQuotes(), 60_000); return () => clearInterval(id); }, []);
  const inst = INSTRUMENTS.find(i => i.symbol === sym)!, q = quotes?.quotes[sym], unit = unitYen(sym, quotes), h = holdings[sym];
  const owned = INSTRUMENTS.filter(i => holdings[i.symbol]);
  const total = owned.reduce((s, i) => { const u = unitYen(i.symbol, quotes); return u ? { value: s.value + holdings[i.symbol].units * u, cost: s.cost + holdings[i.symbol].cost } : s; }, { value: 0, cost: 0 });
  const act = (err: string | null, ok: string) => setMsg(err ?? ok);
  return <Modal title="まち証券取引所" onClose={() => close(null)} tabs={[{ id: 'market', label: '銘柄' }, { id: 'portfolio', label: `保有（${owned.length}）` }]} tab={tab} onTab={setTab} className="exchange-modal">
    <p className="ex-status">所持金 <b>{yen(money)}</b> ／ 株の評価額 <b>{yen(total.value)}</b>
      <small>{quotes ? `実際の相場 ${when(quotes.updated)} 更新（15〜30分遅れ）` : '相場を読み込み中…'}{status === 'offline' && ' · 通信できないので前回の値で取引します'}</small></p>
    {tab === 'market' ? <div className="ex-layout">
      <div className="ex-list">{INSTRUMENTS.map(i => { const qq = quotes?.quotes[i.symbol], u = unitYen(i.symbol, quotes), p = qq ? changePct(qq) : 0;
        return <button key={i.symbol} className={'ex-row' + (i.symbol === sym ? ' on' : '')} onClick={() => { setSym(i.symbol); setMsg(''); }}>
          <span><b>{i.name}</b><small>{i.kind}</small></span><span className="ex-num">{u ? yen(u) : '—'}<small className={pctClass(p)}>{qq ? signed(p) : ''}</small></span>
        </button>; })}</div>
      <section className="ex-detail">
        <h2>{inst.name} <small>{inst.note}</small></h2>
        {q ? <>
          <p className="ex-price">{fmt(q.price, q.currency === 'JPY' && q.price > 1000 ? 0 : 2)} <small>{q.currency}</small> <span className={pctClass(changePct(q))}>{signed(changePct(q))}（前日 {fmt(q.prevClose)}）</span></p>
          <p className="ex-sub">1口 = <b>{unit ? yen(unit) : '—'}</b>{q.currency !== 'JPY' && quotes && <> （1ドル {fmt(quotes.quotes['JPY=X']?.price ?? 0)}円）</>} · {when(q.time)} 時点</p>
          <div className="ex-range">{(['day', 'year'] as const).map(r => <button key={r} className={'tool' + (range === r ? ' on' : '')} onClick={() => setRange(r)}>{r === 'day' ? '1日' : '1年'}</button>)}</div>
          <Chart q={q} range={range} />
          <div className="ex-trade">
            <div><label>買う金額（円）<input type="number" inputMode="numeric" min={1} value={amount} onChange={e => setAmount(e.target.value)} /></label>
              <div className="ex-quick">{[10000, 100000, 1000000].map(v => <button key={v} className="btn" onClick={() => setAmount(String(v))}>{v / 10000}万</button>)}<button className="btn" onClick={() => setAmount(String(Math.floor(money)))}>全額</button></div>
              <button className="btn primary" disabled={!unit} onClick={() => act(buyStock(sym, inst.name, Number(amount)), `${inst.name} を ${yen(Number(amount))} ぶん買いました`)}>買う{unit && Number(amount) > 0 ? `（約${fmt(Number(amount) / unit, 4)}口）` : ''}</button></div>
            <div><label>売る口数（保有 {h ? fmt(h.units, 4) : 0}口）<input type="number" inputMode="decimal" min={0} step="any" value={units} onChange={e => setUnits(e.target.value)} /></label>
              <div className="ex-quick"><button className="btn" disabled={!h} onClick={() => setUnits(String(+(h!.units / 2).toFixed(4)))}>半分</button><button className="btn" disabled={!h} onClick={() => setUnits(String(h!.units))}>全部</button></div>
              <button className="btn" disabled={!h || !unit} onClick={() => { act(sellStock(sym, inst.name, Number(units)), `${inst.name} を ${fmt(Number(units), 4)}口 売りました`); setUnits(''); }}>売る{unit && Number(units) > 0 ? `（約${yen(Math.min(Number(units), h?.units ?? 0) * unit)}）` : ''}</button></div>
          </div>
          {h && unit && (() => { const v = valuation(h, unit); return <p className="ex-sub">保有 {fmt(h.units, 4)}口 · 評価額 {yen(v.value)} · 損益 <span className={pctClass(v.gain)}>{v.gain >= 0 ? '+' : ''}{yen(v.gain)}（{signed(v.pct)}）</span></p>; })()}
          {msg && <p className="ex-msg" role="status">{msg}</p>}
        </> : <p>{status === 'offline' ? '相場を読み込めませんでした。通信できる場所でもう一度開いてください。' : '読み込み中…'}</p>}
      </section>
    </div> : <div className="ex-portfolio">
      {owned.length ? <table><thead><tr><th>銘柄</th><th>口数</th><th>取得額</th><th>評価額</th><th>損益</th></tr></thead><tbody>
        {owned.map(i => { const u = unitYen(i.symbol, quotes), hh = holdings[i.symbol], v = u ? valuation(hh, u) : null;
          return <tr key={i.symbol} onClick={() => { setSym(i.symbol); setTab('market'); }}><td>{i.name}</td><td>{fmt(hh.units, 4)}</td><td>{yen(hh.cost)}</td><td>{v ? yen(v.value) : '—'}</td><td className={v ? pctClass(v.gain) : ''}>{v ? `${v.gain >= 0 ? '+' : ''}${yen(v.gain)}（${signed(v.pct)}）` : '—'}</td></tr>; })}
        <tr className="ex-total"><td>合計</td><td /><td>{yen(total.cost)}</td><td>{yen(total.value)}</td><td className={pctClass(total.value - total.cost)}>{total.value - total.cost >= 0 ? '+' : ''}{yen(total.value - total.cost)}</td></tr>
      </tbody></table> : <p>まだ株を持っていません。「銘柄」から買えます。</p>}
    </div>}
    <p className="info">値段は実際の市場（東証・ニューヨーク）と同じです。取引時間外は最後の値のまま動きません。ドル建ての銘柄は売買の時点の為替で円に換算します。</p>
  </Modal>;
}
