// 競馬・競輪・ボートレース：出走表（出馬表）を見て、実際と同じ券種・買い方で投票し、レースを観て払い戻しを受け取る
import { useEffect, useMemo, useRef, useState } from 'react';
import { yen } from '../../economy/money';
import {
  BET_SHAPE,
  NUMBER_COLORS,
  RACES,
  comboLabel,
  comboOdds,
  comboProb,
  computeProbs,
  drawOrder,
  expandCombos,
  makeRace,
  payoutPer100,
  placeCount,
  popularCombos,
  ticketPayout,
  winningCombos,
} from '../../economy/race';
import type { BetType, BuyMethod, Probs, Race, RaceKind, Ticket } from '../../economy/race';
import { boatKimarite, makeMotion, marginLabel, raceTime } from '../../economy/raceMotion';
import type { Motion } from '../../economy/raceMotion';
import { useEconomy } from '../../state/economy';
import { useGame } from '../../state/store';
import { BetInput } from './BetInput';
import { RaceView, runnerColor } from './RaceView';

/** 種類ごとに、いま出走表に出ているレース（タブを切り替えても残す） */
const current: Partial<Record<RaceKind, Race>> = {};
const raceNo: Partial<Record<RaceKind, number>> = {};
function nextRace(kind: RaceKind): Race {
  raceNo[kind] = ((raceNo[kind] ?? 0) % 12) + 1;
  const r = makeRace(kind, raceNo[kind]!, Math.floor(Math.random() * 2 ** 31));
  current[kind] = r;
  return r;
}

type Phase = 'card' | 'running' | 'done';

interface Result {
  order: number[];
  motion: Motion;
  kimarite: string;
}

export function RaceGame({ kind }: { kind: RaceKind }) {
  const cfg = RACES[kind];
  const [race, setRace] = useState<Race>(() => current[kind] ?? nextRace(kind));
  const probs = useMemo(() => computeProbs(race), [race]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [phase, setPhase] = useState<Phase>('card');
  const [result, setResult] = useState<Result | null>(null);
  const pending = useRef<{ amount: number; label: string } | null>(null);
  const notify = useGame((s) => s.notify);

  // 走る前に閉じたら買った券は返金、レース中に閉じても払い戻しは受け取る
  const unraced = useRef(0);
  unraced.current = phase === 'card' ? tickets.reduce((a, t) => a + t.stake, 0) : 0;
  useEffect(
    () => () => {
      if (pending.current) useEconomy.getState().collect(pending.current.amount, pending.current.label);
      if (unraced.current > 0) useEconomy.getState().collect(unraced.current, `${RACES[kind].title} 発売取り消し（返金）`);
    },
    [kind],
  );

  const start = () => {
    const rng = Math.random;
    const order = drawOrder(race, rng);
    const motion = makeMotion(race, order, rng);
    const total = tickets.reduce((a, t) => a + ticketPayout(race, probs, order, t), 0);
    pending.current = total > 0 ? { amount: total, label: `${cfg.title} ${race.venue}${race.no}R 払戻` } : null;
    setResult({ order, motion, kimarite: kind === 'boat' ? boatKimarite(order[0], rng) : '' });
    setPhase('running');
  };

  const onDone = () => {
    setPhase('done');
    if (pending.current) {
      useEconomy.getState().collect(pending.current.amount, pending.current.label);
      notify(`🎉 的中！ ${yen(pending.current.amount)} 払い戻し`);
      pending.current = null;
    }
  };

  const next = () => {
    setRace(nextRace(kind));
    setTickets([]);
    setResult(null);
    setPhase('card');
  };

  return (
    <div className="game race">
      <RaceHeader race={race} />
      {phase !== 'card' && result && <RaceView race={race} motion={result.motion} order={result.order} onDone={onDone} />}
      {phase === 'done' && result && <ResultBoard race={race} probs={probs} result={result} tickets={tickets} onNext={next} />}
      {phase === 'card' && (
        <>
          <RaceCard race={race} probs={probs} />
          <BetSlipBuilder race={race} probs={probs} onBuy={(ts) => setTickets((cur) => [...cur, ...ts])} />
          <Purchased race={race} probs={probs} tickets={tickets} />
          <div className="row">
            <button className="btn primary big-btn" onClick={start}>
              {tickets.length ? '発走！ レースを観る' : `${cfg.ticket}を買わずにレースを観る`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function RaceHeader({ race }: { race: Race }) {
  const cfg = RACES[race.kind];
  return (
    <div className="race-head">
      <b>
        {race.venue} 第{race.no}レース　{race.name}
      </b>
      <span className="muted">
        　{race.surface ?? ''}
        {race.distance}m{race.laps ? `（${race.laps}周）` : ''}　{race.runners.length}
        {cfg.unit}立て　{race.kind === 'horse' ? `馬場：${race.condition}` : race.condition}
      </span>
    </div>
  );
}

/** 番号札（競馬は白地の馬番、競輪・ボートは番号の色） */
function NumberBadge({ race, i }: { race: Race; i: number }) {
  const r = race.runners[i];
  const col = race.kind === 'horse' ? { bg: '#fff', fg: '#222' } : runnerColor(race, i);
  return (
    <span className="badge" style={{ background: col.bg, color: col.fg }}>
      {r.no}
    </span>
  );
}

function FrameBadge({ frame }: { frame: number }) {
  const col = NUMBER_COLORS[frame - 1];
  return (
    <span className="badge frame" style={{ background: col.bg, color: col.fg }}>
      {frame}
    </span>
  );
}

function RaceCard({ race, probs }: { race: Race; probs: Probs }) {
  const pc = placeCount(race);
  const popularity = useMemo(() => {
    const ord = probs.win.map((_, i) => i).sort((a, b) => probs.win[b] - probs.win[a]);
    const rank: number[] = [];
    ord.forEach((r, i) => (rank[r] = i + 1));
    return rank;
  }, [probs]);
  const cfg = RACES[race.kind];
  const infoKeys = Object.keys(race.runners[0].info).filter((k) => k !== '毛色');
  const showWin = cfg.bets.includes('win');
  return (
    <>
      {race.lines && (
        <div className="lines">
          <span className="muted">並び予想</span>
          {race.lines.map((line, k) => (
            <span key={k} className="line-group">
              {line.map((no) => (
                <NumberBadge key={no} race={race} i={race.runners.findIndex((r) => r.no === no)} />
              ))}
            </span>
          ))}
          <span className="muted">（同じラインは協力して走る。先頭が逃げ、2番手が番手）</span>
        </div>
      )}
      <div className="table-scroll">
        <table className="ledger entries">
          <thead>
            <tr>
              {race.kind === 'horse' && <th>枠</th>}
              <th>{cfg.numberName}</th>
              <th>印</th>
              <th>{race.kind === 'horse' ? '馬名' : '選手名'}</th>
              {race.kind === 'horse' && <th>脚質</th>}
              {infoKeys.map((k) => (
                <th key={k}>{k}</th>
              ))}
              {showWin && <th className="num">単勝</th>}
              {pc > 0 && <th className="num">複勝</th>}
              <th className="num">人気</th>
            </tr>
          </thead>
          <tbody>
            {race.runners.map((r) => (
              <tr key={r.no}>
                {race.kind === 'horse' && (
                  <td>
                    <FrameBadge frame={r.frame} />
                  </td>
                )}
                <td>
                  <NumberBadge race={race} i={r.index} />
                </td>
                <td className="mark">{r.mark}</td>
                <td className="runner-name">
                  {r.name}
                  {r.info['毛色'] && <small className="muted">（{r.info['毛色']}）</small>}
                </td>
                {race.kind === 'horse' && <td>{r.style}</td>}
                {infoKeys.map((k) => (
                  <td key={k}>{r.info[k]}</td>
                ))}
                {showWin && <td className="num">{comboOdds(race, probs, 'win', [r.index])?.toFixed(1)}</td>}
                {pc > 0 && <td className="num">{comboOdds(race, probs, 'place', [r.index])?.toFixed(1)}</td>}
                <td className="num">{popularity[r.index]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

const HELP: Record<BetType, string> = {
  win: '1着を当てる',
  place: '',
  bracket: '1着・2着の枠番の組み合わせを当てる（順不同）',
  quinella: '1着・2着の組み合わせを当てる（順不同）',
  wide: '3着以内に入る2つを当てる（順不同）',
  exacta: '1着・2着を順番どおりに当てる',
  trio: '1着・2着・3着の組み合わせを当てる（順不同）',
  trifecta: '1着・2着・3着を順番どおりに当てる',
};

function BetSlipBuilder({ race, probs, onBuy }: { race: Race; probs: Probs; onBuy: (t: Ticket[]) => void }) {
  const cfg = RACES[race.kind];
  const [type, setType] = useState<BetType>(cfg.bets[0]);
  const [method, setMethod] = useState<BuyMethod>('normal');
  const [cols, setCols] = useState<number[][]>([[], [], []]);
  const [unit, setUnit] = useState(1000);
  const notify = useGame((s) => s.notify);
  const shape = BET_SHAPE[type];
  const isBracket = type === 'bracket';
  const rows = isBracket
    ? [...new Set(race.runners.map((r) => r.frame))].map((f) => ({ id: f, frame: f }))
    : race.runners.map((r) => ({ id: r.index, frame: r.frame }));

  const columnNames: string[] =
    shape.k === 1
      ? ['選択']
      : method === 'nagashi'
        ? [shape.ordered ? '軸（1着）' : '軸', '相手']
        : shape.ordered
          ? Array.from({ length: shape.k }, (_, i) => `${i + 1}着`)
          : ['選択'];

  const combos = useMemo(() => expandCombos(race, type, method, cols), [race, type, method, cols]);
  const stake = Math.floor(unit / 100) * 100;
  const total = combos.length * stake;

  const reset = (t: BetType, m: BuyMethod) => {
    setType(t);
    setMethod(BET_SHAPE[t].k === 1 ? 'normal' : m);
    setCols([[], [], []]);
  };
  const toggle = (col: number, id: number) => {
    setCols((cs) =>
      cs.map((c, k) => {
        if (k !== col) return c;
        if (method === 'nagashi' && col === 0) return c[0] === id ? [] : [id];
        return c.includes(id) ? c.filter((x) => x !== id) : [...c, id].sort((a, b) => a - b);
      }),
    );
  };
  const buy = () => {
    if (!combos.length || stake <= 0) return;
    const label = `${cfg.title} ${race.venue}${race.no}R ${cfg.betNames[type]} ${combos.length}点`;
    if (!useEconomy.getState().placeBet(total, label)) return notify('所持金が足りません');
    onBuy(combos.map((combo) => ({ type, combo, stake })));
    setCols([[], [], []]);
  };

  const popular = useMemo(() => popularCombos(race, probs, type, 8), [race, probs, type]);
  const help = type === 'place' ? `${placeCount(race)}着以内に入るかを当てる` : HELP[type];

  return (
    <section className="card bet-builder">
      <div className="card-title">投票（{cfg.ticket}を買う）</div>
      <div className="field-label">券種</div>
      <div className="seg wrap">
        {cfg.bets.map((b) => (
          <button key={b} className={b === type ? 'on' : ''} onClick={() => reset(b, method)}>
            {cfg.betNames[b]}
          </button>
        ))}
      </div>
      <p className="muted">
        {help}。払戻率 {Math.round((cfg.payout[type] ?? 0) * 1000) / 10}%
      </p>
      {shape.k > 1 && (
        <>
          <div className="field-label">買い方</div>
          <div className="seg">
            <button className={method === 'normal' ? 'on' : ''} onClick={() => reset(type, 'normal')}>
              {shape.ordered ? '通常・フォーメーション' : '通常・ボックス'}
            </button>
            <button className={method === 'nagashi' ? 'on' : ''} onClick={() => reset(type, 'nagashi')}>
              ながし
            </button>
          </div>
          <p className="muted">
            {method === 'nagashi'
              ? shape.ordered
                ? '軸を1着に決め、相手から残りの着順を全部の並びで買います。'
                : '軸を1つ決め、相手との組み合わせを全部買います。'
              : shape.ordered
                ? '着順ごとに選びます。1つずつ選べば通常、複数選ぶとフォーメーション（全部の掛け合わせ）。'
                : `${shape.k}つ選べば通常、それより多く選ぶとボックス（選んだ中の組み合わせ全部）。`}
          </p>
        </>
      )}
      <div className="table-scroll">
        <table className="ledger mark-sheet">
          <thead>
            <tr>
              <th>{isBracket ? '枠番' : cfg.numberName}</th>
              {!isBracket && <th>{race.kind === 'horse' ? '馬名' : '選手'}</th>}
              {columnNames.map((c) => (
                <th key={c} className="center">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{isBracket ? <FrameBadge frame={row.frame} /> : <NumberBadge race={race} i={row.id} />}</td>
                {!isBracket && <td className="runner-name">{race.runners[row.id].name}</td>}
                {columnNames.map((_, col) => {
                  const on = cols[col].includes(row.id);
                  return (
                    <td key={col} className="center">
                      <button className={`mark-cell${on ? ' on' : ''}`} onClick={() => toggle(col, row.id)} aria-pressed={on}>
                        {on ? '●' : ''}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="field-label">1点あたりの金額（100円単位）</div>
      <BetInput value={unit} onChange={setUnit} />
      <p>
        <b>{combos.length}</b> 点 × {yen(stake)} = <b className="big">{yen(total)}</b>
      </p>
      {combos.length > 0 && (
        <div className="combo-list">
          {combos.slice(0, 40).map((c) => {
            const o = comboOdds(race, probs, type, c);
            return (
              <span key={c.join('-')} className="combo">
                {comboLabel(race, type, c)} <small>{o ? `${o.toFixed(1)}倍` : '―'}</small>
              </span>
            );
          })}
          {combos.length > 40 && <span className="muted">ほか {combos.length - 40} 点</span>}
        </div>
      )}
      <button className="btn primary" disabled={!combos.length || stake <= 0} onClick={buy}>
        この内容で買う（{yen(total)}）
      </button>
      <details className="popular">
        <summary>{cfg.betNames[type]}の人気順オッズ</summary>
        <table className="ledger compact">
          <tbody>
            {popular.map(({ combo }, k) => (
              <tr key={combo.join('-')}>
                <td>{k + 1}番人気</td>
                <td>{comboLabel(race, type, combo)}</td>
                <td className="num">{comboOdds(race, probs, type, combo)?.toFixed(1)}倍</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}

function Purchased({ race, probs, tickets }: { race: Race; probs: Probs; tickets: Ticket[] }) {
  const cfg = RACES[race.kind];
  if (!tickets.length) return null;
  const total = tickets.reduce((a, t) => a + t.stake, 0);
  return (
    <section className="card">
      <div className="card-title">
        購入した{cfg.ticket}（{tickets.length}点・{yen(total)}）
      </div>
      <div className="combo-list">
        {tickets.map((t, k) => (
          <span key={k} className="combo">
            {cfg.betNames[t.type]} {comboLabel(race, t.type, t.combo)} {yen(t.stake)}
            <small>{comboOdds(race, probs, t.type, t.combo)?.toFixed(1)}倍</small>
          </span>
        ))}
      </div>
    </section>
  );
}

function ResultBoard({
  race,
  probs,
  result,
  tickets,
  onNext,
}: {
  race: Race;
  probs: Probs;
  result: Result;
  tickets: Ticket[];
  onNext: () => void;
}) {
  const cfg = RACES[race.kind];
  const { order, motion } = result;
  const total = tickets.reduce((a, t) => a + ticketPayout(race, probs, order, t), 0);
  const spent = tickets.reduce((a, t) => a + t.stake, 0);
  const wins = useMemo(() => winningCombos(race, order), [race, order]);
  const ranks = useMemo(
    () =>
      wins.map((w) => {
        const p = comboProb(race, probs, w.type, w.combo);
        return popularCombos(race, probs, w.type, 100000).filter((x) => x.p > p + 1e-12).length + 1;
      }),
    [race, probs, wins],
  );
  const speed = race.distance / motion.winTime;
  return (
    <div className="result-board">
      <section className="card">
        <div className="card-title">
          着順（確定）{result.kimarite && <span className="kimarite">決まり手：{result.kimarite}</span>}
        </div>
        <table className="ledger compact">
          <thead>
            <tr>
              <th>着</th>
              <th>{cfg.numberName}</th>
              <th>{race.kind === 'horse' ? '馬名' : '選手'}</th>
              {race.kind !== 'keirin' && <th className="num">タイム</th>}
              <th>{race.kind === 'boat' ? 'ST' : '着差'}</th>
            </tr>
          </thead>
          <tbody>
            {order.map((i, k) => (
              <tr key={i}>
                <td>{k + 1}</td>
                <td>
                  <NumberBadge race={race} i={i} />
                </td>
                <td>{race.runners[i].name}</td>
                {race.kind !== 'keirin' && <td className="num">{raceTime(motion.finish[i])}</td>}
                <td>
                  {race.kind === 'boat'
                    ? `.${String(Math.round(motion.st[i] * 100)).padStart(2, '0')}`
                    : k === 0
                      ? ''
                      : marginLabel(race.kind, motion.gaps[k - 1], speed)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="card">
        <div className="card-title">払戻金（100円あたり）</div>
        <table className="ledger compact payout-board">
          <tbody>
            {wins.map((w, k) => {
              const o = comboOdds(race, probs, w.type, w.combo) ?? 0;
              return (
                <tr key={k}>
                  <td>{cfg.betNames[w.type]}</td>
                  <td>{comboLabel(race, w.type, w.combo)}</td>
                  <td className="num">{payoutPer100(o).toLocaleString()}円</td>
                  <td className="num muted">{ranks[k]}番人気</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {tickets.length > 0 && (
          <p>
            買った {yen(spent)} → 払い戻し <b className={total > 0 ? 'plus big' : 'minus'}>{yen(total)}</b>
          </p>
        )}
        <button className="btn primary" onClick={onNext}>
          次のレースへ
        </button>
      </section>
    </div>
  );
}
