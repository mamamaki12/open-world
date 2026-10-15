// 券売機（自動発売機）：実際の窓口の機械と同じ順番で投票する。
// 式別 → 方式 → 番号 → 金額 → 確認・セット をくり返して「投票内容」にため、最後に「購入」で券が出てくる
import { useMemo, useState } from 'react';
import { yen } from '../../economy/money';
import { BET_SHAPE, NUMBER_COLORS, RACES, comboLabel, comboOdds, expandCombos, placeCount, popularCombos } from '../../economy/race';
import type { BetType, Probs, Race, Ticket } from '../../economy/race';
import { useEconomy } from '../../state/economy';
import { useGame } from '../../state/store';
import { sfxChip } from './sfx';

export type Method = 'normal' | 'box' | 'nagashi' | 'formation';
type Step = 'type' | 'method' | 'pick' | 'amount' | 'confirm';

export const METHOD_NAME: Record<Method, string> = { normal: '通常', box: 'ボックス', nagashi: 'ながし', formation: 'フォーメーション' };

const STEPS: { id: Step; label: string }[] = [
  { id: 'type', label: '式別' },
  { id: 'method', label: '方式' },
  { id: 'pick', label: '番号' },
  { id: 'amount', label: '金額' },
  { id: 'confirm', label: '確認' },
];

/** その式別で選べる方式 */
export function methodsOf(type: BetType): Method[] {
  const { k, ordered } = BET_SHAPE[type];
  if (k === 1) return ['normal'];
  return ordered ? ['normal', 'box', 'nagashi', 'formation'] : ['normal', 'box', 'nagashi'];
}

/** 選んだ番号から買い目を作る（方式ごと） */
export function machineCombos(race: Race, type: BetType, method: Method, cols: number[][]): number[][] {
  const { k, ordered } = BET_SHAPE[type];
  if (method === 'nagashi') return expandCombos(race, type, 'nagashi', cols);
  if (type === 'bracket' && method === 'normal') {
    // 枠連の通常は 1つ目・2つ目の枠を1つずつ。同じ枠（ゾロ目）は2人以上いる枠だけ
    const [a, b] = [cols[0]?.[0], cols[1]?.[0]];
    if (a === undefined || b === undefined) return [];
    if (a === b && race.runners.filter((r) => r.frame === a).length < 2) return [];
    return [[Math.min(a, b), Math.max(a, b)]];
  }
  if (method === 'box') return expandCombos(race, type, 'normal', ordered ? Array.from({ length: k }, () => cols[0] ?? []) : [cols[0] ?? []]);
  if (method === 'normal' && !ordered && k > 1 && (cols[0]?.length ?? 0) !== k) return [];
  return expandCombos(race, type, 'normal', cols);
}

/** 番号を選ぶ欄（行）の名前と、1つしか選べないか */
function pickRows(type: BetType, method: Method): { label: string; single: boolean }[] {
  const { k, ordered } = BET_SHAPE[type];
  if (k === 1) return [{ label: '選択', single: false }];
  if (method === 'nagashi') return [{ label: ordered ? '軸（1着）' : '軸', single: true }, { label: '相手', single: false }];
  if (method === 'box') return [{ label: '選択', single: false }];
  if (method === 'normal' && type === 'bracket') return [{ label: '1つ目の枠', single: true }, { label: '2つ目の枠', single: true }];
  if (method === 'normal' && !ordered) return [{ label: `${k}つ選択`, single: false }];
  return Array.from({ length: k }, (_, i) => ({ label: `${i + 1}着`, single: method === 'normal' }));
}

/** まだ買い目ができていないとき、あと何を選べばよいか */
function pickHint(type: BetType, method: Method, cols: number[][]): string {
  const { k } = BET_SHAPE[type];
  const n = (r: number) => cols[r]?.length ?? 0;
  if (k === 1) return '番号を1つ以上選んでください';
  if (type === 'bracket' && method === 'normal') {
    const [a, b] = [cols[0]?.[0], cols[1]?.[0]];
    if (a !== undefined && a === b) return `${a}枠は1人だけなので、同じ枠どうし（${a}-${a}）は買えません`;
    return '1つ目と2つ目の枠を1つずつ選んでください（2人以上いる枠は同じ枠どうしも買えます）';
  }
  if (method === 'nagashi') return n(0) === 0 ? '軸を1つ選んでください' : `相手を${k - 1}つ以上選んでください`;
  if (method === 'box') return `${k}つ以上選んでください`;
  if (method === 'formation') return `着順ごとに1つ以上選んでください（同じ番号どうしの組は除きます）`;
  if (!BET_SHAPE[type].ordered) return `ちょうど${k}つ選んでください`;
  return '着順ごとに1つずつ、違う番号を選んでください';
}

const METHOD_HELP: Record<Method, string> = {
  normal: '1つの組み合わせを買います',
  box: '選んだ番号の組み合わせを全部買います',
  nagashi: '軸を1つ決め、相手との組み合わせを全部買います',
  formation: '着順ごとに複数選び、掛け合わせを全部買います',
};

interface CartItem {
  id: number;
  type: BetType;
  method: Method;
  combos: number[][];
  stake: number;
}

let groupSeq = 1;

export function TicketMachine({ race, probs, onBuy }: { race: Race; probs: Probs; onBuy: (t: Ticket[]) => void }) {
  const cfg = RACES[race.kind];
  const notify = useGame((s) => s.notify);
  const money = useEconomy((s) => s.money);
  const [step, setStep] = useState<Step>('type');
  const [type, setType] = useState<BetType>(cfg.bets[0]);
  const [method, setMethod] = useState<Method>('normal');
  const [cols, setCols] = useState<number[][]>([[], [], []]);
  const [digits, setDigits] = useState('10');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showOdds, setShowOdds] = useState(false);

  const shape = BET_SHAPE[type];
  const isBracket = type === 'bracket';
  const rows = pickRows(type, method);
  const combos = useMemo(() => machineCombos(race, type, method, cols), [race, type, method, cols]);
  const stake = (parseInt(digits || '0', 10) || 0) * 100;
  const cartTotal = cart.reduce((a, c) => a + c.combos.length * c.stake, 0);
  const choices = isBracket
    ? [...new Set(race.runners.map((r) => r.frame))].sort((a, b) => a - b).map((f) => ({ id: f, no: f, frame: f, name: race.runners.filter((r) => r.frame === f).map((r) => r.no).join('・') + '番' }))
    : race.runners.map((r) => ({ id: r.index, no: r.no, frame: r.frame, name: r.name }));

  const press = () => sfxChip();
  const go = (s: Step) => {
    press();
    setStep(s);
  };
  const chooseType = (t: BetType) => {
    press();
    setType(t);
    setCols([[], [], []]);
    setShowOdds(false);
    if (BET_SHAPE[t].k === 1) {
      setMethod('normal');
      setStep('pick');
    } else setStep('method');
  };
  const chooseMethod = (m: Method) => {
    press();
    setMethod(m);
    setCols([[], [], []]);
    setStep('pick');
  };
  const toggle = (row: number, id: number) => {
    press();
    setCols((cs) =>
      cs.map((c, k) => {
        if (k !== row) return c;
        if (rows[row]?.single) return c[0] === id ? [] : [id];
        if (method === 'normal' && !isBracket && !shape.ordered && shape.k > 1 && !c.includes(id) && c.length >= shape.k) return c;
        return c.includes(id) ? c.filter((x) => x !== id) : [...c, id].sort((a, b) => a - b);
      }),
    );
  };
  const key = (d: string) => {
    press();
    setDigits((cur) => {
      if (d === 'C') return '';
      if (d === '⌫') return cur.slice(0, -1);
      const next = (cur === '0' ? '' : cur) + d;
      return next.length > 8 ? cur : next;
    });
  };
  const addAmount = (yenAmount: number) => {
    press();
    setDigits((cur) => String((parseInt(cur || '0', 10) || 0) + yenAmount / 100));
  };
  const set = () => {
    if (!combos.length || stake <= 0) return;
    press();
    setCart((c) => [...c, { id: groupSeq++, type, method, combos, stake }]);
    setCols([[], [], []]);
    setStep('type');
  };
  const cancelAll = () => {
    press();
    setCols([[], [], []]);
    setStep('type');
  };
  const purchase = () => {
    if (!cart.length) return;
    const label = `${cfg.title} ${race.venue}${race.no}R ${cart.length}枚`;
    if (!useEconomy.getState().placeBet(cartTotal, label)) return notify('所持金が足りません');
    onBuy(cart.flatMap((c) => c.combos.map((combo) => ({ type: c.type, combo, stake: c.stake, group: c.id, method: METHOD_NAME[c.method] }))));
    setCart([]);
  };

  const steps = step !== 'type' && shape.k === 1 ? STEPS.filter((s) => s.id !== 'method') : STEPS;
  const stepIndex = steps.findIndex((s) => s.id === step);
  const canNext = step === 'pick' ? combos.length > 0 : step === 'amount' ? stake > 0 : false;
  const next = () => go(step === 'pick' ? 'amount' : 'confirm');
  const back = () => {
    const i = Math.max(0, stepIndex - 1);
    go(steps[i].id);
  };
  const popular = useMemo(() => (showOdds ? popularCombos(race, probs, type, 10) : []), [race, probs, type, showOdds]);

  return (
    <section className={`tm tm-${race.kind}`} aria-label={`${cfg.ticket}の自動発売機`}>
      <div className="tm-top">
        <span className="tm-brand">{cfg.icon} {cfg.ticket} 自動発売機</span>
        <span className="tm-lamp">● 発売中</span>
      </div>
      <div className="tm-body">
        <div className="tm-screen">
          <div className="tm-head">
            <b>{race.venue}</b>
            <span className="tm-r">{race.no}R</span>
            <span className="tm-race">{race.name}</span>
          </div>
          <ol className="tm-steps">
            {steps.map((s, i) => (
              <li key={s.id} className={i === stepIndex ? 'now' : i < stepIndex ? 'done' : ''}>
                <span>{i + 1}</span>
                {s.label}
              </li>
            ))}
          </ol>

          <div className="tm-page">
            {step === 'type' && (
              <>
                <p className="tm-ask">式別を選んでください</p>
                <div className="tm-grid types">
                  {cfg.bets.map((b) => (
                    <button key={b} className={`tm-key type t-${b}`} onClick={() => chooseType(b)}>
                      <b>{cfg.betNames[b]}</b>
                      <small>
                        {b === 'place' ? `${placeCount(race)}着までに入る` : TYPE_HINT[b]}
                      </small>
                    </button>
                  ))}
                </div>
              </>
            )}

            {step === 'method' && (
              <>
                <p className="tm-ask">
                  <span className="tm-chip">{cfg.betNames[type]}</span> 方式を選んでください
                </p>
                <div className="tm-grid methods">
                  {methodsOf(type).map((m) => (
                    <button key={m} className="tm-key method" onClick={() => chooseMethod(m)}>
                      <b>{METHOD_NAME[m]}</b>
                      <small>{METHOD_HELP[m]}</small>
                    </button>
                  ))}
                </div>
              </>
            )}

            {step === 'pick' && (
              <>
                <p className="tm-ask">
                  <span className="tm-chip">{cfg.betNames[type]}</span>
                  {shape.k > 1 && <span className="tm-chip light">{METHOD_NAME[method]}</span>}
                  {isBracket ? '枠番' : cfg.numberName}を選んでください
                </p>
                {rows.map((row, r) => (
                  <div key={row.label} className="tm-pick-row">
                    {rows.length > 1 || shape.k > 1 ? <div className="tm-row-label">{row.label}</div> : null}
                    <div className="tm-grid numbers">
                      {choices.map((ch) => {
                        const on = cols[r].includes(ch.id);
                        const col = NUMBER_COLORS[(race.kind === 'horse' ? ch.frame : ch.no) - 1] ?? NUMBER_COLORS[0];
                        const single = !isBracket && (type === 'win' || type === 'place') ? comboOdds(race, probs, type, [ch.id]) : null;
                        return (
                          <button
                            key={ch.id}
                            className={`tm-num${on ? ' on' : ''}`}
                            onClick={() => toggle(r, ch.id)}
                            aria-pressed={on}
                            title={ch.name}
                          >
                            <span className="tm-num-no" style={{ background: col.bg, color: col.fg }}>
                              {ch.no}
                            </span>
                            <span className="tm-num-name">{ch.name}</span>
                            {single !== null && <span className="tm-num-odds">{single.toFixed(1)}</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {combos.length === 0 && <p className="tm-hint">{pickHint(type, method, cols)}</p>}
                <div className="tm-count">
                  組み合わせ <b>{combos.length}</b> 通り
                  <button className="tm-link" onClick={() => setShowOdds(!showOdds)}>
                    {showOdds ? 'オッズを閉じる' : `${cfg.betNames[type]}の人気順オッズ`}
                  </button>
                </div>
                {showOdds && (
                  <div className="tm-odds">
                    {popular.map(({ combo }, k) => (
                      <span key={combo.join('-')}>
                        <small>{k + 1}</small> {comboLabel(race, type, combo)} <b>{comboOdds(race, probs, type, combo)?.toFixed(1)}</b>
                      </span>
                    ))}
                  </div>
                )}
              </>
            )}

            {step === 'amount' && (
              <>
                <p className="tm-ask">
                  1点あたりの金額を入力してください <small>（100円単位）</small>
                </p>
                <div className="tm-amount">
                  <div className="tm-display">
                    <span className="tm-digits">{digits || '0'}</span>
                    <span className="tm-unit">00 円</span>
                  </div>
                  <div className="tm-keypad">
                    {['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', '⌫', 'C'].map((d) => (
                      <button key={d} className={`tm-pad${d === 'C' ? ' clear' : ''}`} onClick={() => key(d)}>
                        {d === 'C' ? '訂正' : d}
                      </button>
                    ))}
                  </div>
                  <div className="tm-quick">
                    {[100, 1000, 10000, 100000, 1000000].map((v) => (
                      <button key={v} className="tm-pad small" onClick={() => addAmount(v)}>
                        +{v >= 10000 ? `${v / 10000}万` : v.toLocaleString()}円
                      </button>
                    ))}
                  </div>
                </div>
                <p className="tm-sum">
                  {combos.length}通り × {yen(stake)} = <b>{yen(combos.length * stake)}</b>
                </p>
              </>
            )}

            {step === 'confirm' && (
              <>
                <p className="tm-ask">内容を確かめて「セット」を押してください</p>
                <dl className="tm-confirm">
                  <dt>式別</dt>
                  <dd>{cfg.betNames[type]}</dd>
                  <dt>方式</dt>
                  <dd>{METHOD_NAME[method]}</dd>
                  <dt>買い目</dt>
                  <dd className="tm-combos">
                    {combos.slice(0, 24).map((c) => (
                      <span key={c.join('-')}>
                        {comboLabel(race, type, c)} <small>{comboOdds(race, probs, type, c)?.toFixed(1) ?? '―'}倍</small>
                      </span>
                    ))}
                    {combos.length > 24 && <span className="muted">ほか {combos.length - 24} 通り</span>}
                  </dd>
                  <dt>金額</dt>
                  <dd>
                    各 {yen(stake)} × {combos.length}通り = <b>{yen(combos.length * stake)}</b>
                  </dd>
                </dl>
              </>
            )}
          </div>

          <div className="tm-nav">
            <button className="tm-btn cancel" onClick={cancelAll} disabled={step === 'type'}>
              取消
            </button>
            <button className="tm-btn" onClick={back} disabled={stepIndex <= 0}>
              ◀ 戻る
            </button>
            {step === 'confirm' ? (
              <button className="tm-btn go" onClick={set}>
                セット
              </button>
            ) : (
              <button className="tm-btn go" onClick={next} disabled={!canNext}>
                次へ ▶
              </button>
            )}
          </div>
        </div>

        <aside className="tm-side">
          <div className="tm-side-title">投票内容</div>
          {cart.length === 0 ? (
            <p className="tm-empty">式別から選んで「セット」すると、ここにたまります。</p>
          ) : (
            <ul className="tm-cart">
              {cart.map((c, k) => (
                <li key={c.id}>
                  <span className="tm-cart-no">{k + 1}</span>
                  <span className="tm-cart-main">
                    <b>{cfg.betNames[c.type]}</b> {BET_SHAPE[c.type].k > 1 && <small>{METHOD_NAME[c.method]}</small>}
                    <br />
                    <span className="tm-cart-combo">
                      {c.combos.length === 1 ? comboLabel(race, c.type, c.combos[0]) : `${comboLabel(race, c.type, c.combos[0])} ほか`}
                    </span>
                  </span>
                  <span className="tm-cart-amt">
                    {c.combos.length}通り
                    <br />
                    {yen(c.combos.length * c.stake)}
                  </span>
                  <button className="tm-x" onClick={() => setCart((cs) => cs.filter((x) => x.id !== c.id))} aria-label="この投票を取り消す">
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="tm-total">
            <span>合計</span>
            <b>{yen(cartTotal)}</b>
          </div>
          <div className="tm-balance">
            所持金 {yen(money)}
          </div>
          <button className="tm-btn buy" disabled={!cart.length || cartTotal > money} onClick={purchase}>
            購入する
          </button>
          <div className="tm-slots" aria-hidden>
            <span className="tm-slot">紙幣</span>
            <span className="tm-slot">発券口</span>
          </div>
        </aside>
      </div>
    </section>
  );
}

const TYPE_HINT: Record<BetType, string> = {
  win: '1着を当てる',
  place: '3着までに入る',
  bracket: '1・2着の枠の組',
  quinella: '1・2着の組',
  wide: '3着までの2つ',
  exacta: '1・2着を順番どおり',
  trio: '1〜3着の組',
  trifecta: '1〜3着を順番どおり',
};

/** 出てきた券（馬券・車券・舟券）。1回の「セット」が1枚 */
export function PrintedTickets({ race, probs, tickets }: { race: Race; probs: Probs; tickets: Ticket[] }) {
  const cfg = RACES[race.kind];
  const groups = useMemo(() => {
    const m = new Map<number, Ticket[]>();
    tickets.forEach((t, k) => {
      const g = t.group ?? -k - 1;
      m.set(g, [...(m.get(g) ?? []), t]);
    });
    return [...m.values()];
  }, [tickets]);
  if (!tickets.length) return null;
  const total = tickets.reduce((a, t) => a + t.stake, 0);
  const today = new Date();
  const date = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;
  return (
    <section className="printed">
      <div className="printed-title">
        購入した{cfg.ticket}（{groups.length}枚・{yen(total)}）
      </div>
      <div className="printed-list">
        {groups.map((g, k) => {
          const t0 = g[0];
          const sum = g.reduce((a, t) => a + t.stake, 0);
          return (
            <div key={k} className={`ticket ticket-${race.kind}`} style={{ animationDelay: `${k * 0.12}s` }}>
              <div className="ticket-top">
                <span className="ticket-venue">{race.venue}</span>
                <span className="ticket-r">{race.no}R</span>
                <span className="ticket-date">{date}</span>
              </div>
              <div className="ticket-type">
                <b>{cfg.betNames[t0.type]}</b>
                {t0.method && BET_SHAPE[t0.type].k > 1 && <span>{t0.method}</span>}
              </div>
              <div className="ticket-combos">
                {g.slice(0, 6).map((t) => (
                  <div key={t.combo.join('-')}>
                    {comboLabel(race, t.type, t.combo)}
                    <small>{comboOdds(race, probs, t.type, t.combo)?.toFixed(1)}倍</small>
                  </div>
                ))}
                {g.length > 6 && <div className="muted">ほか {g.length - 6} 通り</div>}
              </div>
              <div className="ticket-amount">
                {g.length > 1 && <small>各{t0.stake.toLocaleString()}円 {g.length}通り</small>}
                <b>★★{sum.toLocaleString()}円★★</b>
              </div>
              <div className="ticket-foot">
                <span className="ticket-bars" />
                <small>{cfg.title}</small>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
