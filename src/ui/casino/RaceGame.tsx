// 競馬・競輪・ボートレース：出走表を見て買い目を選び、レースを観て払い戻しを受け取る
import { useEffect, useMemo, useRef, useState } from 'react';
import { yen } from '../../economy/money';
import {
  RACES,
  betOdds,
  betPayout,
  betPicksNeeded,
  computeOdds,
  makeRace,
  progressAt,
  runRace,
  standingsAt,
} from '../../economy/race';
import type { BetKind, Race, RaceBet, RaceKind, RaceRun } from '../../economy/race';
import { useEconomy } from '../../state/economy';
import { useGame } from '../../state/store';
import { BetInput } from './BetInput';

const MARKS = ['◎', '○', '▲', '△', '✕'];
/** レースを観る長さ（ミリ秒） */
const SHOW_MS = 9000;

/** 種類ごとに、いま出走表に出ているレース（タブを切り替えても残す） */
const current: Partial<Record<RaceKind, Race>> = {};
const raceNo: Partial<Record<RaceKind, number>> = {};
function nextRace(kind: RaceKind): Race {
  raceNo[kind] = ((raceNo[kind] ?? 0) % 12) + 1;
  const r = makeRace(kind, raceNo[kind]!, Math.floor(Math.random() * 2 ** 31));
  current[kind] = r;
  return r;
}

type Phase = 'betting' | 'running' | 'done';

export function RaceGame({ kind }: { kind: RaceKind }) {
  const cfg = RACES[kind];
  const [race, setRace] = useState<Race>(() => current[kind] ?? nextRace(kind));
  const odds = useMemo(() => computeOdds(race), [race]);
  const [betKind, setBetKind] = useState<BetKind>(cfg.bets[0]);
  const [picks, setPicks] = useState<number[]>([]);
  const [stake, setStake] = useState(10_000);
  const [slip, setSlip] = useState<RaceBet[]>([]);
  const [phase, setPhase] = useState<Phase>('betting');
  const [run, setRun] = useState<RaceRun | null>(null);
  const [t, setT] = useState(0);
  const pending = useRef<{ amount: number; label: string } | null>(null);
  const raf = useRef(0);
  const notify = useGame((s) => s.notify);

  useEffect(() => {
    if (!current[kind]) current[kind] = race;
  }, [kind, race]);
  // 走る前に閉じたら買った券は返金する
  const unraced = useRef(0);
  unraced.current = phase === 'betting' ? slip.reduce((a, b) => a + b.stake, 0) : 0;
  useEffect(
    () => () => {
      cancelAnimationFrame(raf.current);
      // レース中に閉じても払い戻しは受け取る
      if (pending.current) useEconomy.getState().collect(pending.current.amount, pending.current.label);
      if (unraced.current > 0) useEconomy.getState().collect(unraced.current, `${RACES[kind].title} 発売取り消し（返金）`);
    },
    [kind],
  );

  const need = betPicksNeeded(betKind);
  const ready = picks.length === need;
  const pickOdds = ready ? betOdds(odds, { kind: betKind, picks }) : null;
  const popularity = useMemo(() => {
    const order = odds.win.map((_, i) => i).sort((a, b) => odds.win[a] - odds.win[b]);
    const rank: number[] = [];
    order.forEach((r, i) => (rank[r] = i + 1));
    return rank;
  }, [odds]);

  const togglePick = (i: number) => {
    if (phase !== 'betting') return;
    setPicks((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i].slice(-need)));
  };

  const addBet = () => {
    if (!ready || stake <= 0) return;
    const label = `${cfg.title} ${race.venue}${race.no}R ${cfg.betNames[betKind]} ${picks.map((p) => p + 1).join(betKind === 'exacta' ? '→' : '-')}`;
    if (!useEconomy.getState().placeBet(stake, label)) return notify('賭け金が所持金を超えています');
    setSlip((s) => [...s, { kind: betKind, picks, stake }]);
    setPicks([]);
  };

  const start = () => {
    const r = runRace(race, Math.random);
    const total = slip.reduce((a, b) => a + betPayout(race, r, odds, b), 0);
    pending.current = total > 0 ? { amount: total, label: `${cfg.title} ${race.venue}${race.no}R 払戻` } : null;
    setRun(r);
    setPhase('running');
    const finish = r.splits.map((s) => s.reduce((a, b) => a + b, 0));
    const winner = Math.min(...finish);
    const last = Math.max(...finish);
    // 1着が 8 割くらいの時間でゴールするように
    const scale = (winner / 0.82) / SHOW_MS;
    const started = performance.now();
    const loop = () => {
      const now = (performance.now() - started) * scale;
      setT(now);
      if (now < last) raf.current = requestAnimationFrame(loop);
      else {
        setPhase('done');
        if (pending.current) {
          useEconomy.getState().collect(pending.current.amount, pending.current.label);
          notify(`🎉 的中！ ${yen(pending.current.amount)} 払い戻し`);
          pending.current = null;
        }
      }
    };
    raf.current = requestAnimationFrame(loop);
  };

  const next = () => {
    setRace(nextRace(kind));
    setSlip([]);
    setPicks([]);
    setRun(null);
    setT(0);
    setPhase('betting');
  };

  const standings = run ? standingsAt(run, t) : null;
  const badge = (i: number) => {
    const c = cfg.colors[i % cfg.colors.length];
    return (
      <span className="badge" style={{ background: c.bg, color: c.fg }}>
        {i + 1}
      </span>
    );
  };

  return (
    <div className="game race">
      <div className="race-head">
        <b>{race.venue} 第{race.no}レース</b>　{race.distance}　{cfg.runners}{kind === 'horse' ? '頭' : kind === 'boat' ? '艇' : '車'}立て
      </div>

      <div className={`track ${kind}`}>
        {race.runners.map((r, i) => {
          const p = run ? progressAt(run.splits[i], t) : 0;
          return (
            <div key={r.no} className="lane">
              {badge(i)}
              <div className="lane-track">
                <span className="runner" style={{ left: `calc(${p * 100}% - ${p * 34}px)` }}>
                  {cfg.icon}
                </span>
              </div>
            </div>
          );
        })}
        <div className="goal" />
      </div>
      {standings && (
        <div className="standings">
          {phase === 'done' ? '確定：' : '通過順：'}
          {standings.slice(0, 5).map((i, k) => (
            <span key={i}>
              {k + 1}着 {badge(i)}
            </span>
          ))}
        </div>
      )}

      {phase === 'done' && run && <Results race={race} run={run} slip={slip} onNext={next} odds={odds} />}

      {phase === 'betting' && (
        <>
          <table className="ledger entries">
            <thead>
              <tr>
                <th>番</th>
                <th>{kind === 'horse' ? '馬名' : '選手'}</th>
                <th>予想</th>
                <th className="num">単勝オッズ</th>
                <th className="num">人気</th>
              </tr>
            </thead>
            <tbody>
              {race.runners.map((r, i) => {
                const k = picks.indexOf(i);
                return (
                  <tr key={r.no} className={`pickable${k >= 0 ? ' on' : ''}`} onClick={() => togglePick(i)}>
                    <td>{badge(i)}</td>
                    <td>
                      {r.name}
                      {k >= 0 && need === 2 && <small className="pick-tag">{betKind === 'exacta' ? `${k + 1}着` : '選択'}</small>}
                    </td>
                    <td>{MARKS[r.form]}</td>
                    <td className="num">{odds.win[i].toFixed(1)}</td>
                    <td className="num">{popularity[i]}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="field-label">買い方</div>
          <div className="seg">
            {cfg.bets.map((b) => (
              <button key={b} className={b === betKind ? 'on' : ''} onClick={() => { setBetKind(b); setPicks([]); }}>
                {cfg.betNames[b]}
              </button>
            ))}
          </div>
          <p className="muted">{betHelp(kind, betKind)}　上の表から{need === 1 ? '1つ' : '2つ'}選んでください。</p>
          <p>
            買い目：<b>{picks.length ? picks.map((p) => p + 1).join(betKind === 'exacta' ? ' → ' : ' - ') : '—'}</b>
            {pickOdds !== null && <>　オッズ <b className="big">{pickOdds.toFixed(1)}</b> 倍（当たれば {yen(Math.floor((stake * pickOdds) / 10) * 10)}）</>}
          </p>
          <BetInput value={stake} onChange={setStake} />
          <div className="row">
            <button className="btn primary" disabled={!ready || stake <= 0} onClick={addBet}>この{kind === 'horse' ? '馬券' : kind === 'boat' ? '舟券' : '車券'}を買う</button>
            <button className="btn primary big-btn" onClick={start}>
              {slip.length ? 'レース開始！' : '買わずにレースを見る'}
            </button>
          </div>
          {slip.length > 0 && (
            <ul className="slip">
              {slip.map((b, i) => (
                <li key={i}>
                  {cfg.betNames[b.kind]} {b.picks.map((p) => p + 1).join(b.kind === 'exacta' ? '→' : '-')}　{yen(b.stake)}（{betOdds(odds, b).toFixed(1)}倍）
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function Results({ race, run, slip, odds, onNext }: { race: Race; run: RaceRun; slip: RaceBet[]; odds: ReturnType<typeof computeOdds>; onNext: () => void }) {
  const cfg = RACES[race.kind];
  const total = slip.reduce((a, b) => a + betPayout(race, run, odds, b), 0);
  const spent = slip.reduce((a, b) => a + b.stake, 0);
  const [a, b] = run.order;
  return (
    <div className="card">
      <div className="card-title">結果</div>
      <table className="ledger compact">
        <tbody>
          {run.order.slice(0, 3).map((i, k) => (
            <tr key={i}>
              <td>{k + 1}着</td>
              <td>{i + 1}番 {race.runners[i].name}</td>
            </tr>
          ))}
          {cfg.bets.includes('win') && <tr><td>{cfg.betNames.win}</td><td>{a + 1}　{odds.win[a].toFixed(1)}倍</td></tr>}
          <tr><td>{cfg.betNames.exacta}</td><td>{a + 1}→{b + 1}　{odds.exacta[a][b].toFixed(1)}倍</td></tr>
          <tr><td>{cfg.betNames.quinella}</td><td>{Math.min(a, b) + 1}-{Math.max(a, b) + 1}　{odds.quinella[Math.min(a, b)][Math.max(a, b)].toFixed(1)}倍</td></tr>
        </tbody>
      </table>
      {slip.length > 0 && (
        <p>
          買った {yen(spent)} → 払い戻し <b className={total > 0 ? 'plus big' : 'minus'}>{yen(total)}</b>
        </p>
      )}
      <button className="btn primary" onClick={onNext}>次のレースへ</button>
    </div>
  );
}

function betHelp(kind: RaceKind, b: BetKind): string {
  const place = RACES[kind].placeCount;
  switch (b) {
    case 'win':
      return '1着を当てる。';
    case 'place':
      return `${place}着以内に入るかを当てる（当たりやすいが低配当）。`;
    case 'quinella':
      return '1着と2着の組み合わせを当てる（順番は問わない）。';
    case 'exacta':
      return '1着と2着を順番どおりに当てる（選んだ順が 1着→2着）。';
    case 'wide':
      return '選んだ2つがどちらも3着以内に入れば当たり。';
  }
}
