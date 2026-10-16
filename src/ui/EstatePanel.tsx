// 不動産屋：工事（着工・改築）、査定、売る・貸す、土地を買う、相場、家計簿
import { useMemo, useState } from 'react';
import { DAILY, DAY_SECONDS, getLocation, landPrice } from '../economy/market';
import { yen } from '../economy/money';
import { COST_CATEGORY_NAMES, buildSeconds, quality, renovationCost } from '../economy/pricing';
import type { CostCategory } from '../economy/pricing';
import { buyLandAndJoin, lotNumbers, useCurrentLot, useEconomy } from '../state/economy';
import type { Lot } from '../state/economy';
import { useGame } from '../state/store';
import { Modal } from './Modal';
import { JoinOption } from './JoinOption';
import { warpToLot } from '../world/Player';

type Tab = 'lot' | 'lots' | 'land' | 'market' | 'ledger';
const TABS: { id: Tab; label: string }[] = [
  { id: 'lot', label: 'この土地の家' },
  { id: 'lots', label: '持っている土地' },
  { id: 'land', label: '土地を買う' },
  { id: 'market', label: '相場' },
  { id: 'ledger', label: '家計簿・バイト' },
];

export function EstatePanel() {
  const [tab, setTab] = useState<Tab>('land');
  const close = useGame((s) => s.setOverlay);
  return (
    <Modal title="🏠 不動産屋" onClose={() => close(null)} tabs={TABS} tab={tab} onTab={setTab} className="estate-modal">
      {tab === 'lot' && <CurrentLot onGoLand={() => setTab('land')} />}
      {tab === 'lots' && <LotList />}
      {tab === 'land' && <LandShop />}
      {tab === 'market' && <MarketView />}
      {tab === 'ledger' && <Ledger />}
    </Modal>
  );
}

function CurrentLot({ onGoLand }: { onGoLand: () => void }) {
  const lot = useCurrentLot();
  const house = useGame((s) => s.house);
  const market = useEconomy((s) => s.market);
  const money = useEconomy((s) => s.money);
  const est = useMemo(() => (lot ? renovationCost(lot.built, house) : null), [lot?.built, house]);
  const notify = useGame((s) => s.notify);
  if (!lot || !est) {
    return (
      <div>
        <p>いま土地を持っていません。画面の設計図は残っているので、土地を買うとそこで建てられます。</p>
        <button className="btn primary" onClick={onGoLand}>土地を買う</button>
      </div>
    );
  }
  const n = lotNumbers(lot, market);
  const start = () => {
    const err = useEconomy.getState().startConstruction();
    notify(err ?? (est.parts === 0 ? '設計を反映しました' : `工事を始めました（${buildSeconds(est.total)}秒）`));
  };
  const cats = (Object.keys(est.byCategory) as CostCategory[]).filter((c) => est.byCategory[c] > 0);
  const designDiffers = est.parts > 0;
  return (
    <div className="estate">
      <h3>{lot.name}</h3>
      <p className="muted">
        立地：{n.location.name}（建物の査定 ×{n.location.factor}）　土地の評価：{yen(n.landNow)}
      </p>

      <section className="card">
        <div className="card-title">工事</div>
        {lot.construction ? (
          <>
            <p>
              工事中です。あと {Math.ceil(lot.construction.remaining)} 秒で完成します（工事費 {yen(lot.construction.cost)} 支払い済み）。
            </p>
            <div className="bar"><i style={{ width: `${(1 - lot.construction.remaining / lot.construction.total) * 100}%` }} /></div>
          </>
        ) : designDiffers ? (
          <>
            <p>
              {lot.built ? '設計を変えた部分の改築費' : '設計どおりに建てる工事費'}：<b className="big">{yen(est.total)}</b>
              <span className="muted">（工事 {buildSeconds(est.total)} 秒・{est.parts}か所）</span>
            </p>
            <table className="ledger compact">
              <tbody>
                {cats.map((c) => (
                  <tr key={c}>
                    <td>{COST_CATEGORY_NAMES[c]}</td>
                    <td className="num">{yen(est.byCategory[c])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button className="btn primary" disabled={est.total > money || lot.rented} onClick={start}>
              {lot.built ? '改築する' : '着工する'}（{yen(est.total)}）
            </button>
            {est.total > money && <p className="warn">お金が {yen(est.total - money)} 足りません。バイトやカジノで稼ぐか、設計を小さくしましょう。</p>}
            {lot.rented && <p className="warn">貸している間は工事できません。</p>}
          </>
        ) : lot.built ? (
          <p>設計どおりに建っています。設計を変えると、変えた部分だけ改築費がかかります。</p>
        ) : (
          <p>まだ何も建っていません。建築モードで設計すると見積もりが出ます（設計はタダ）。</p>
        )}
        {!lot.construction && est.parts === 0 && lot.built && JSON.stringify(house) !== JSON.stringify(lot.built) && (
          <button className="btn" onClick={start}>家具の配置・取り壊しを反映する（無料）</button>
        )}
      </section>

      {lot.built ? <Appraisal lot={lot} /> : null}
    </div>
  );
}

function Appraisal({ lot }: { lot: Lot }) {
  const market = useEconomy((s) => s.market);
  const notify = useGame((s) => s.notify);
  const [confirm, setConfirm] = useState(false);
  const n = lotNumbers(lot, market);
  const q = useMemo(() => quality(lot.built!), [lot.built]);
  const profit = n.sale - lot.invested;
  return (
    <>
      <section className="card">
        <div className="card-title">査定（建っている家）</div>
        <table className="ledger compact">
          <tbody>
            <tr><td>建築費（いま建て直すと）</td><td className="num">{yen(n.buildCost)}</td></tr>
            <tr><td>品質係数</td><td className="num">×{q.factor.toFixed(2)}</td></tr>
            <tr><td>立地</td><td className="num">×{n.location.factor}</td></tr>
            <tr><td>建物の査定</td><td className="num">{yen(n.appraisal)}</td></tr>
            <tr><td>土地</td><td className="num">{yen(n.landValue)}</td></tr>
            <tr><td>相場</td><td className="num">×{market.toFixed(2)}</td></tr>
            <tr className="total"><td>いま売ると</td><td className="num">{yen(n.sale)}</td></tr>
            <tr><td>これまでにかけたお金</td><td className="num">{yen(lot.invested)}</td></tr>
            <tr><td>もうけ</td><td className={`num ${profit >= 0 ? 'plus' : 'minus'}`}>{profit >= 0 ? '+' : ''}{yen(profit)}</td></tr>
          </tbody>
        </table>
        <details>
          <summary>品質係数の内訳（工夫すると高く売れる）</summary>
          <ul className="checks">
            {q.items.map((it) => (
              <li key={it.label} className={it.ok ? 'ok' : 'ng'}>
                {it.ok ? '✓' : '✗'} {it.label}
                <small>{it.value > 0 ? `+${it.value}` : `できていないと ${it.value}`}</small>
              </li>
            ))}
          </ul>
        </details>
        <div className="row">
          <button
            className="btn danger"
            disabled={!!lot.construction}
            onClick={() => {
              if (!confirm) return setConfirm(true);
              const err = useEconomy.getState().sell(lot.id);
              if (err) notify(err);
              setConfirm(false);
            }}
          >
            {confirm ? `もう一度押すと ${yen(n.sale)} で売ります` : `土地ごと売る（${yen(n.sale)}）`}
          </button>
        </div>
      </section>

      <section className="card">
        <div className="card-title">貸す</div>
        <p>
          売らずに貸すと、毎日（{DAY_SECONDS}秒ごと）家賃が入ります。
          {lot.rented ? '　いま貸しています。' : ''}
        </p>
        <table className="ledger compact">
          <tbody>
            <tr><td>家賃（1日）</td><td className="num plus">+{yen(lotNumbers({ ...lot, rented: true }, market).bill.rent)}</td></tr>
            <tr><td>維持費（1日）</td><td className="num minus">-{yen(n.bill.upkeep)}</td></tr>
            <tr><td>固定資産税（1日）</td><td className="num minus">-{yen(n.bill.tax)}</td></tr>
          </tbody>
        </table>
        <button
          className="btn"
          onClick={() => {
            const err = useEconomy.getState().setRented(lot.id, !lot.rented);
            notify(err ?? (lot.rented ? '貸すのをやめました' : '家を貸し出しました'));
          }}
        >
          {lot.rented ? '貸すのをやめる' : '貸す'}
        </button>
      </section>
    </>
  );
}

function LotList() {
  const lots = useEconomy((s) => s.lots);
  const current = useEconomy((s) => s.currentLotId);
  const market = useEconomy((s) => s.market);
  if (!lots.length) return <p>土地を持っていません。「土地を買う」から買えます。</p>;
  return (
    <table className="ledger owned-lots">
      <thead>
        <tr><th>土地</th><th>状態</th><th className="num">いま売ると</th><th /></tr>
      </thead>
      <tbody>
        {lots.map((l) => {
          const n = lotNumbers(l, market);
          const status = l.construction ? '🏗 工事中' : l.rented ? '🔑 賃貸中' : l.built ? '🏠 完成' : '更地';
          return (
            <tr key={l.id} className={l.id === current ? 'on' : ''}>
              <td>{l.name}</td>
              <td>{status}</td>
              <td className="num">{l.built ? yen(n.sale) : yen(n.landNow)}</td>
              <td>
                {l.id === current ? (
                  <span className="muted">表示中</span>
                ) : (
                  <button className="btn small" onClick={() => warpToLot(l.id)}>この土地へ行く</button>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function LandShop() {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [join, setJoin] = useState(true);
  const offers = useEconomy((s) => s.offers);
  const market = useEconomy((s) => s.market);
  const money = useEconomy((s) => s.money);
  const notify = useGame((s) => s.notify);
  const selected = offers.find(o => o.id === confirmId);
  return (
    <div>
      <p className="muted">売り土地は毎日入れ替わります。値段は相場で上下します。広さはどれも 24×20 マス（約397m²）。</p>
      {selected && <section className="card" aria-label="土地購入の確認">
        <h3>{selected.name}を購入しますか？</h3>
        <p>購入価格 <b>{yen(landPrice(selected.location, selected.variance, market))}</b></p>
        <p>購入後の残高 {yen(money - landPrice(selected.location, selected.variance, market))}</p>
        <JoinOption plot={selected.plot} checked={join} onChange={setJoin} />
        <button className="btn primary" disabled={landPrice(selected.location, selected.variance, market) > money} onClick={() => {
          const err = buyLandAndJoin(selected.id, join);
          notify(err ?? selected.name + 'を購入しました');
          if (!err) setConfirmId(null);
        }}>土地の購入を確定する</button>
        <button className="btn" onClick={() => setConfirmId(null)}>やめる</button>
      </section>}
      <table className="ledger land-offers">
        <thead>
          <tr><th>場所</th><th>立地</th><th className="num">値段</th><th /></tr>
        </thead>
        <tbody>
          {offers.map((o) => {
            const price = landPrice(o.location, o.variance, market);
            const loc = getLocation(o.location);
            return (
              <tr key={o.id}>
                <td>{o.name}</td>
                <td>{loc.name}<small className="muted">（家の査定 ×{loc.factor}）</small></td>
                <td className="num">{yen(price)}</td>
                <td>
                  <button
                    className="btn small primary"
                    disabled={price > money}
                    onClick={() => setConfirmId(o.id)}
                  >
                    買う
                  </button>
                </td>
              </tr>
            );
          })}
          {!offers.length && (
            <tr><td colSpan={4} className="muted">今日の売り土地は売り切れです。明日また入ります。</td></tr>
          )}
        </tbody>
      </table>
      <p className="muted">買った土地へは「持っている土地」から移れます。</p>
    </div>
  );
}

function MarketView() {
  const history = useEconomy((s) => s.marketHistory);
  const market = useEconomy((s) => s.market);
  const w = 560, h = 180, pad = 28;
  const lo = 0.5, hi = 1.6;
  const xs = (i: number) => pad + (i / Math.max(1, history.length - 1)) * (w - pad * 2);
  const ys = (v: number) => h - pad - ((Math.min(Math.max(v, lo), hi) - lo) / (hi - lo)) * (h - pad * 2);
  const d = history.map((v, i) => `${i ? 'L' : 'M'}${xs(i).toFixed(1)},${ys(v).toFixed(1)}`).join(' ');
  return (
    <div>
      <p>
        いまの相場は <b className="big">{market.toFixed(2)}</b>。家や土地の値段は「査定 × 相場」で決まります。
        相場は毎日上下し、長い目で見ると 1.00 に戻ろうとします。安いときに土地を買い、高いときに売るのがコツです。
      </p>
      <svg className="chart" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="相場の動き">
        {[0.5, 1, 1.5].map((v) => (
          <g key={v}>
            <line x1={pad} x2={w - pad} y1={ys(v)} y2={ys(v)} className={v === 1 ? 'grid base' : 'grid'} />
            <text x={4} y={ys(v) + 4} className="axis">{v.toFixed(1)}</text>
          </g>
        ))}
        <path d={d} className="line" />
        {history.length > 0 && <circle cx={xs(history.length - 1)} cy={ys(market)} r={4} className="dot" />}
      </svg>
      <p className="muted">直近 {history.length} 日分。1日 = {DAY_SECONDS} 秒（遊んでいる間だけ進みます）。家賃は売値の {DAILY.rent * 100}%／日。</p>
    </div>
  );
}

function Ledger() {
  const ledger = useEconomy((s) => s.ledger);
  const gamble = useEconomy((s) => s.gamble);
  const setOverlay = useGame((s) => s.setOverlay);
  const [confirmReset, setConfirmReset] = useState(false);
  const net = gamble.won - gamble.bet;
  return (
    <div>
      <section className="card">
        <div className="card-title">バイト</div>
        <p className="muted">コンビニのレジ・倉庫の仕分けなど、作業をして給料をもらえます。</p>
        <button className="btn primary" onClick={() => setOverlay('jobs')}>💼 バイトを探す</button>
      </section>
      <p>
        ギャンブル通算：賭けた {yen(gamble.bet)}・払戻 {yen(gamble.won)}・収支{' '}
        <b className={net >= 0 ? 'plus' : 'minus'}>{net >= 0 ? '+' : ''}{yen(net)}</b>
      </p>
      <table className="ledger">
        <thead>
          <tr><th>日</th><th>内容</th><th className="num">金額</th></tr>
        </thead>
        <tbody>
          {ledger.map((t, i) => (
            <tr key={i}>
              <td>{t.day}日目</td>
              <td>{t.label}</td>
              <td className={`num ${t.amount >= 0 ? 'plus' : 'minus'}`}>{t.amount >= 0 ? '+' : ''}{yen(t.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="row" style={{ marginTop: 12 }}>
        <button
          className="btn danger"
          onClick={() => {
            if (!confirmReset) return setConfirmReset(true);
            useEconomy.getState().reset();
            setConfirmReset(false);
          }}
        >
          {confirmReset ? 'もう一度押すと、お金と土地を最初に戻します' : 'お金と土地を最初からやり直す'}
        </button>
      </div>
    </div>
  );
}
