// バイト：一覧から選んで1シフト働く。できた件数とミスで給料が決まる
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  DENOMS, JOBS, REGIONS, TOPPINGS, VEHICLES, jobDef, makeCheckout, makeOrder, makeParcel, makeTraffic,
  sameStack, scoreCount, shiftPay, sumPieces, tally,
} from '../../economy/jobs';
import type { JobDef, JobId, Pass, Region, Topping, Vehicle } from '../../economy/jobs';
import { yen } from '../../economy/money';
import { useEconomy } from '../../state/economy';
import { useGame } from '../../state/store';
import { Modal } from '../Modal';
import './jobs.css';

interface GameProps {
  add: (ok: number, miss: number) => void;
  timeUp: boolean;
  seconds: number;
}

export function JobsPanel() {
  const close = useGame((s) => s.setOverlay);
  const receive = useEconomy((s) => s.receive);
  const [job, setJob] = useState<JobId | null>(null);
  const [score, setScore] = useState({ ok: 0, miss: 0 });
  const [left, setLeft] = useState(0);
  const [paid, setPaid] = useState(false);
  const [round, setRound] = useState(0);
  const def = job ? jobDef(job) : null;
  const timeUp = !!def && left <= 0;
  const pay = def ? shiftPay(def, score.ok, score.miss) : 0;

  useEffect(() => {
    if (!def) return;
    const end = performance.now() + def.seconds * 1000;
    setLeft(def.seconds);
    const id = setInterval(() => {
      const l = Math.max(0, (end - performance.now()) / 1000);
      setLeft(l);
      if (l <= 0) clearInterval(id);
    }, 200);
    return () => clearInterval(id);
  }, [def, round]);

  const start = (id: JobId) => {
    setScore({ ok: 0, miss: 0 });
    setPaid(false);
    setLeft(jobDef(id).seconds);
    setJob(id);
    setRound((r) => r + 1);
  };
  const settle = () => {
    if (def && timeUp && !paid) {
      setPaid(true);
      receive(pay, `バイト（${def.name}）`);
    }
  };
  const add = (ok: number, miss: number) => setScore((s) => ({ ok: s.ok + ok, miss: s.miss + miss }));

  return (
    <Modal title="💼 バイト" onClose={() => { settle(); close(null); }} tabs={[]} tab="" onTab={() => undefined} className="jobs-modal">
      {!def ? (
        <JobList onPick={start} />
      ) : (
        <div className="job-shift">
          <div className="job-head">
            <b>{def.name}</b>
            <span className={`job-timer${left < 10 && !timeUp ? ' hurry' : ''}`}>{timeUp ? 'シフト終了' : `残り ${Math.ceil(left)} 秒`}</span>
            <span>できた {score.ok}・ミス {score.miss}</span>
            {!timeUp && <button className="btn small" onClick={() => setJob(null)}>やめる（給料なし）</button>}
          </div>
          <div className="job-bar"><i style={{ width: `${(left / def.seconds) * 100}%` }} /></div>
          <Game key={round} id={def.id} add={add} timeUp={timeUp} seconds={def.seconds} />
          {timeUp && (
            <div className="job-result card">
              <p>おつかれさまでした。基本給 {yen(def.base)} ＋ 出来高 {score.ok}件 × {yen(def.perTask)} − ミス {score.miss}件 × {yen(def.penalty)}（最低 {yen(def.minPay)}）</p>
              <p className="job-pay">給料 <b>{yen(pay)}</b></p>
              {paid ? (
                <>
                  <button className="btn primary" onClick={() => start(def.id)}>もう1シフト働く</button>{' '}
                  <button className="btn" onClick={() => setJob(null)}>ほかのバイトを見る</button>
                </>
              ) : (
                <button className="btn primary" onClick={settle}>給料を受け取る</button>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

function JobList({ onPick }: { onPick: (id: JobId) => void }) {
  return (
    <div className="job-list">
      <p className="muted">1シフト働くと、できた件数とミスの数で給料が決まります。</p>
      <button className="btn" onClick={() => useGame.getState().setOverlay('requests')}>🤝 プレイヤーからの依頼を見る</button>
      {JOBS.map((j: JobDef) => (
        <button key={j.id} className="job-card" onClick={() => onPick(j.id)}>
          <span className="job-name">{j.name}</span>
          <span className="muted">{j.place}・{j.seconds}秒</span>
          <span>{j.desc}</span>
          <span className="job-wage">基本給 {yen(j.base)}＋1件 {yen(j.perTask)}</span>
        </button>
      ))}
    </div>
  );
}

function Game({ id, ...p }: GameProps & { id: JobId }) {
  if (id === 'register') return <Register {...p} />;
  if (id === 'warehouse') return <Warehouse {...p} />;
  if (id === 'burger') return <Burger {...p} />;
  return <Traffic {...p} />;
}

/** 正解・ミスの一言をしばらく出す */
function useFlash() {
  const [msg, setMsg] = useState<{ text: string; good: boolean } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), []);
  return [msg, (text: string, good: boolean) => {
    setMsg({ text, good });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(null), 1400);
  }] as const;
}

function Flash({ msg }: { msg: { text: string; good: boolean } | null }) {
  return <div className={`job-flash${msg ? (msg.good ? ' good' : ' bad') : ''}`}>{msg?.text ?? ' '}</div>;
}

// ---------- コンビニのレジ ----------

function Register({ add, timeUp }: GameProps) {
  const [c, setC] = useState(() => makeCheckout(Math.random));
  const [scanned, setScanned] = useState(0);
  const [given, setGiven] = useState<Record<number, number>>({});
  const [flash, show] = useFlash();
  const allScanned = scanned >= c.items.length;
  const hand = () => {
    const sum = sumPieces(given);
    if (sum === c.change) { add(1, 0); show('ありがとうございました！', true); }
    else { add(0, 1); show(`おつりは ${yen(c.change)} でした（渡したのは ${yen(sum)}）`, false); }
    setC(makeCheckout(Math.random));
    setScanned(0);
    setGiven({});
  };
  return (
    <div className="job-game register">
      <div className="receipt">
        {c.items.map((it, i) => (
          <div key={i} className={`receipt-row${i < scanned ? ' done' : ''}`}>
            <span>{it.name}</span>
            <span>{i < scanned ? yen(it.price) : '—'}</span>
          </div>
        ))}
        {allScanned && (
          <>
            <div className="receipt-row total"><span>合計（税込）</span><span>{yen(c.total)}</span></div>
            <div className="receipt-row done"><span>お預かり</span><span>{yen(c.paid)}</span></div>
          </>
        )}
      </div>
      {!allScanned ? (
        <button className="btn primary big" disabled={timeUp} onClick={() => setScanned((n) => n + 1)}>
          ピッ（{c.items[scanned].name} をスキャン）
        </button>
      ) : (
        <>
          <p>おつりを渡してください：<b>{yen(sumPieces(given))}</b></p>
          <div className="coin-row">
            {DENOMS.map((d) => (
              <button key={d} className={`coin${d >= 1000 ? ' bill' : ''}`} disabled={timeUp} onClick={() => setGiven((g) => ({ ...g, [d]: (g[d] ?? 0) + 1 }))}>
                {d.toLocaleString()}円{given[d] ? <small>×{given[d]}</small> : null}
              </button>
            ))}
          </div>
          <button className="btn" disabled={timeUp} onClick={() => setGiven({})}>やり直す</button>{' '}
          <button className="btn primary" disabled={timeUp} onClick={hand}>渡す</button>
        </>
      )}
      <Flash msg={flash} />
    </div>
  );
}

// ---------- 倉庫の仕分け ----------

function Warehouse({ add, timeUp }: GameProps) {
  const [p, setP] = useState(() => makeParcel(Math.random));
  const [flash, show] = useFlash();
  const drop = (r: Region) => {
    if (r === p.region) { add(1, 0); show('OK', true); }
    else { add(0, 1); show(`${p.pref} は「${p.region}」でした`, false); }
    setP(makeParcel(Math.random));
  };
  return (
    <div className="job-game warehouse">
      <div className="parcel">
        <div className="parcel-tag">
          <small>お届け先</small>
          <b>{p.address}</b>
          <small>品名：{p.label}</small>
        </div>
      </div>
      <div className="bins">
        {REGIONS.map((r) => (
          <button key={r} className="bin" disabled={timeUp} onClick={() => drop(r)}>{r}</button>
        ))}
      </div>
      <Flash msg={flash} />
    </div>
  );
}

// ---------- ハンバーガー屋 ----------

const TOPPING_COLOR: Record<Topping, string> = {
  パティ: '#6b3b1f', チーズ: '#f2c230', レタス: '#5cb85c', トマト: '#d9412b',
  ピクルス: '#7a9a3a', オニオン: '#efe3d0', ベーコン: '#b5543c', たまご: '#ffd76a',
};

function Burger({ add, timeUp }: GameProps) {
  const [order, setOrder] = useState(() => makeOrder(Math.random));
  const [stack, setStack] = useState<Topping[]>([]);
  const [flash, show] = useFlash();
  const serve = () => {
    if (sameStack(stack, order.layers)) { add(1, 0); show('お待たせしました！', true); }
    else { add(0, 1); show(`作り直し：正しくは ${order.layers.join('→')}`, false); }
    setOrder(makeOrder(Math.random));
    setStack([]);
  };
  return (
    <div className="job-game burger">
      <div className="order-ticket">
        <small>注文票</small>
        <b>{order.name}</b>
        {order.note && <span className="note">※{order.note}</span>}
        <ol>{order.layers.map((l, i) => <li key={i}>{l}</li>)}</ol>
        <small>1番から順に、下のバンズの上へ積む</small>
      </div>
      <div className="burger-stack" aria-label="作っているバーガー">
        <div className="layer bun top">バンズ（上）</div>
        {[...stack].reverse().map((t, i) => (
          <div key={i} className="layer" style={{ background: TOPPING_COLOR[t], color: t === 'オニオン' || t === 'チーズ' || t === 'たまご' ? '#333' : '#fff' }}>{t}</div>
        ))}
        <div className="layer bun">バンズ（下）</div>
      </div>
      <div className="coin-row">
        {TOPPINGS.map((t) => (
          <button key={t} className="coin" disabled={timeUp} onClick={() => setStack((s) => [...s, t])}>{t}</button>
        ))}
      </div>
      <button className="btn" disabled={timeUp || !stack.length} onClick={() => setStack((s) => s.slice(0, -1))}>1つ戻す</button>{' '}
      <button className="btn primary" disabled={timeUp} onClick={serve}>バンズをのせて出す</button>
      <Flash msg={flash} />
    </div>
  );
}

// ---------- 交通量調査 ----------

const VEHICLE_LOOK: Record<Vehicle, { w: number; h: number; color: string }> = {
  乗用車: { w: 46, h: 20, color: '#3d7bd9' },
  トラック: { w: 78, h: 28, color: '#e08a1e' },
  バス: { w: 96, h: 30, color: '#2f9e6a' },
  バイク: { w: 28, h: 12, color: '#8a3fd1' },
  自転車: { w: 24, h: 10, color: '#888' },
};

function Traffic({ add, timeUp, seconds }: GameProps) {
  const passes = useMemo(() => makeTraffic(Math.random, seconds), [seconds]);
  const [t, setT] = useState(0);
  const [counted, setCounted] = useState<Record<Vehicle, number>>(() => Object.fromEntries(VEHICLES.map((v) => [v, 0])) as Record<Vehicle, number>);
  const done = useRef(false);
  useEffect(() => {
    const t0 = performance.now();
    let raf = 0;
    const loop = () => { setT((performance.now() - t0) / 1000); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  useEffect(() => {
    if (!timeUp || done.current) return;
    done.current = true;
    const s = scoreCount(tally(passes), counted);
    add(s.ok, s.miss);
  }, [timeUp]); // eslint-disable-line react-hooks/exhaustive-deps
  const W = 600;
  const visible = passes.filter((p) => t >= p.at && t < p.at + p.dur);
  const actual = tally(passes);
  return (
    <div className="job-game traffic">
      <svg viewBox={`0 0 ${W} 120`} className="road" role="img" aria-label="道路">
        <rect x={0} y={20} width={W} height={80} fill="#555" />
        <line x1={0} x2={W} y1={60} y2={60} stroke="#fff" strokeDasharray="18 14" strokeWidth={3} />
        {visible.map((p: Pass, i) => {
          const look = VEHICLE_LOOK[p.type];
          const k = (t - p.at) / p.dur;
          const x = p.dir === 1 ? -look.w + k * (W + look.w) : W - k * (W + look.w);
          const y = p.dir === 1 ? 80 - look.h / 2 : 40 - look.h / 2;
          return (
            <g key={`${p.at}-${i}`} transform={`translate(${x},${y})`}>
              <rect width={look.w} height={look.h} rx={4} fill={look.color} />
              <text x={look.w / 2} y={look.h / 2 + 4} textAnchor="middle" fontSize={look.h > 14 ? 11 : 8} fill="#fff">{p.type}</text>
            </g>
          );
        })}
      </svg>
      <div className="counters">
        {VEHICLES.map((v) => (
          <button key={v} className="counter" disabled={timeUp} onClick={() => setCounted((c) => ({ ...c, [v]: c[v] + 1 }))}>
            <span className="swatch" style={{ background: VEHICLE_LOOK[v].color }} />
            {v}<b>{counted[v]}</b>
          </button>
        ))}
      </div>
      {timeUp && (
        <table className="ledger compact">
          <thead><tr><th>種類</th><th className="num">本当の台数</th><th className="num">数えた台数</th></tr></thead>
          <tbody>{VEHICLES.map((v) => <tr key={v}><td>{v}</td><td className="num">{actual[v]}</td><td className="num">{counted[v]}</td></tr>)}</tbody>
        </table>
      )}
    </div>
  );
}
