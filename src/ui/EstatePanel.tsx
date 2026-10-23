import { iconText } from './AppIcon';
// 不動産屋：工事（着工・改築）、査定、売る・貸す、土地を買う、相場、家計簿
import { useMemo, useState } from 'react';
import { DAILY, DAY_SECONDS, getLocation } from '../economy/market';
import { yen } from '../economy/money';
import { COST_CATEGORY_NAMES, buildSeconds, quality, renovationCost } from '../economy/pricing';
import type { CostCategory } from '../economy/pricing';
import { buyLandAndJoin, lotNumbers, offerPrice, useCurrentLot, useEconomy } from '../state/economy';
import type { Lot } from '../state/economy';
import { useGame } from '../state/store';
import { Modal } from './Modal';
import { JoinOption } from './JoinOption';
import { warpToLot } from '../world/Player';
import { sessionGate } from '../session/gate';
import { savedBundle } from '../session/saves';
import { useSession } from '../session/session';

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
  if (sessionGate.shared) return <SharedLot lot={lot} sale={n.sale} />;
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
        立地：{n.location.name}{iconText("（建物の査定 ×")}{n.location.factor}{iconText("）　まわりのにぎわい ×")}{n.density.toFixed(2)}　土地の評価：{yen(n.landNow)}
      </p>

      <section className="card">
        <div className="card-title">工事</div>
        {lot.construction ? (
          <>
            <p>
              工事中です。あと {Math.ceil(lot.construction.remaining)} 秒で完成します（着工は無料）。
            </p>
            <div className="bar"><i style={{ width: `${(1 - lot.construction.remaining / lot.construction.total) * 100}%` }} /></div>
          </>
        ) : designDiffers ? (
          <>
            <p>
              工事費：<b className="big">無料</b>（{lot.built ? '変えた部分' : '建物'}の価値 {yen(est.total)} は売るときの査定に入ります）
              <span className="muted">（工事 {buildSeconds(est.total)} 秒・{est.parts}か所）</span>
            </p>
            <table className="ledger compact">
              <tbody>
                {cats.map((c) => (
                  <tr key={c}>
                    <td>{iconText(COST_CATEGORY_NAMES[c])}</td>
                    <td className="num">{yen(est.byCategory[c])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button className="btn primary" disabled={lot.rented} onClick={start}>
              {lot.built ? '改築する' : '着工する'}（無料）
            </button>
            {lot.rented && <p className="warn">貸している間は工事できません。</p>}
          </>
        ) : lot.built ? (
          <p>設計どおりに建っています。設計を変えると、無料で改築できます。</p>
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
            <tr><td>品質係数</td><td className="num">{iconText("×")}{q.factor.toFixed(2)}</td></tr>
            <tr><td>立地</td><td className="num">{iconText("×")}{n.location.factor}</td></tr>
            <tr><td>建物の査定</td><td className="num">{yen(n.appraisal)}</td></tr>
            <tr><td>{iconText("土地（にぎわい ×")}{n.density.toFixed(2)}）</td><td className="num">{yen(n.landValue)}</td></tr>
            <tr><td>相場</td><td className="num">{iconText("×")}{market.toFixed(2)}</td></tr>
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
                {iconText(it.ok ? '✓' : '✗')} {iconText(it.label)}
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

/** みんなのワールドの家：持ち主が売りに出す・貸し出す。代金と家賃は買った人・借りた人から持ち主へ直接払う */
function SharedLot({ lot, sale }: { lot: Lot; sale: number }) {
  const me = savedBundle().profile.id, mine = lot.owner === me;
  const [price, setPrice] = useState(String(lot.listing?.price ?? sale));
  const [rent, setRent] = useState(String(lot.rentOffer?.rent ?? Math.max(10000, Math.round(sale / 300 / 10000) * 10000)));
  const act = (action: Parameters<NonNullable<typeof sessionGate.act>>[1], reserved = 0) => {
    const err = sessionGate.act ? sessionGate.act(lot.id, action, reserved) : '接続していません';
    if (err) useGame.getState().notify(err);
  };
  const amount = (v: string) => Math.max(0, Math.round(Number(v.replace(/[^0-9]/g, '')) || 0));
  return (
    <div className="estate">
      <h3>{lot.name}</h3>
      <p className="muted">持ち主：{mine ? 'あなた' : lot.ownerName ?? 'だれか'}{lot.tenant ? `　住んでいる人：${lot.tenant === me ? 'あなた' : lot.tenantName ?? 'だれか'}` : ''}　いまの査定 {yen(sale)}</p>
      {mine ? <>
        <section className="card">
          <div className="card-title">売りに出す</div>
          {lot.listing ? <p>{yen(lot.listing.price)} で売りに出しています。買った人の所持金からあなたへ直接払われます。</p> : <p>値段を決めて、ほかのプレイヤーに売れます。</p>}
          <label>値段（円）<input inputMode="numeric" value={price} onChange={e => setPrice(e.target.value)} /></label>
          <button className="btn primary" disabled={!amount(price)} onClick={() => act({ type: 'list', price: amount(price) })}>{lot.listing ? '値段を変える' : '売りに出す'}</button>
          {lot.listing && <button className="btn" onClick={() => act({ type: 'list', price: null })}>売るのをやめる</button>}
        </section>
        <section className="card">
          <div className="card-title">貸し出す</div>
          {lot.tenant ? <><p>{lot.tenantName ?? 'だれか'}さんに1日 {yen(lot.rentOffer?.rent ?? 0)} で貸しています（{DAY_SECONDS}秒ごとに家賃が入ります）。</p>
            <button className="btn danger" onClick={() => act({ type: 'endLease' })}>退去してもらう</button></>
          : <>
            {lot.rentOffer ? <p>1日 {yen(lot.rentOffer.rent)} で借りる人を募集しています。</p> : <p>家賃を決めて、ほかのプレイヤーに貸せます。</p>}
            <label>1日の家賃（円）<input inputMode="numeric" value={rent} onChange={e => setRent(e.target.value)} /></label>
            <button className="btn primary" disabled={!amount(rent)} onClick={() => act({ type: 'offerRent', rent: amount(rent) })}>{lot.rentOffer ? '家賃を変える' : '借りる人を募集する'}</button>
            {lot.rentOffer && <button className="btn" onClick={() => act({ type: 'offerRent', rent: null })}>募集をやめる</button>}
          </>}
        </section>
        <Builders lot={lot} act={act} />
      </> : <>
        {lot.builders?.some(b => b.id === me) && <p>持ち主から、この土地で建てることを許可されています。</p>}
        {lot.listing && <section className="card"><div className="card-title">売り出し中</div>
          <p>{yen(lot.listing.price)}（代金は持ち主へ直接払います）</p>
          <button className="btn primary" onClick={() => act({ type: 'buyLot' }, lot.listing!.price)}>{yen(lot.listing.price)} で買う</button></section>}
        {lot.tenant === me ? <section className="card"><div className="card-title">借りている家</div>
          <p>1日 {yen(lot.rentOffer?.rent ?? 0)} を持ち主へ払っています。払えなくなると退去になります。</p>
          <button className="btn" onClick={() => act({ type: 'endLease' })}>借りるのをやめる</button></section>
        : lot.rentOffer && !lot.tenant && <section className="card"><div className="card-title">入居者募集中</div>
          <p>1日 {yen(lot.rentOffer.rent)}（借りた日の分を先に払います）</p>
          <button className="btn primary" onClick={() => act({ type: 'rentLot' })}>この家を借りる</button></section>}
        {!lot.listing && !lot.rentOffer && <p>この家はいま売り出しも貸し出しもしていません。</p>}
      </>}
    </div>
  );
}

/** 持ち主が、この土地で一緒に建てられる人を決める（いまワールドにいる人から選ぶ） */
function Builders({ lot, act }: { lot: Lot; act: (a: { type: 'builders'; id: string; name: string; allow: boolean }) => void }) {
  const me = savedBundle().profile.id, members = useSession(s => s.members);
  const builders = lot.builders ?? [];
  const others = members.filter(m => m.id !== me && !builders.some(b => b.id === m.id));
  return (
    <section className="card">
      <div className="card-title">一緒に建てる人</div>
      <p>許可した人は、マップからこの土地へワープして建てられます。</p>
      {builders.map(b => <div key={b.id} className="row"><span>{b.name}さん</span>
        <button className="btn small" onClick={() => act({ type: 'builders', id: b.id, name: b.name, allow: false })}>外す</button></div>)}
      {others.map(m => <div key={m.id} className="row"><span>{m.name}さん（いまいる人）</span>
        <button className="btn small primary" onClick={() => act({ type: 'builders', id: m.id, name: m.name, allow: true })}>建てられるようにする</button></div>)}
      {!builders.length && !others.length && <p className="muted">いまワールドにほかの人がいません。友達が入っているときに選べます。</p>}
    </section>
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
        <tr><th>土地</th><th>{sessionGate.shared ? '持ち主' : '状態'}</th><th className="num">いま売ると</th><th /></tr>
      </thead>
      <tbody>
        {lots.map((l) => {
          const n = lotNumbers(l, market);
          const status = l.construction ? '🏗 工事中' : l.rented ? '🔑 賃貸中' : l.built ? '🏠 完成' : '更地';
          return (
            <tr key={l.id} className={l.id === current ? 'on' : ''}>
              <td>{l.name}</td>
              <td>{sessionGate.shared ? <>{l.owner === savedBundle().profile.id ? 'あなた' : l.ownerName}{l.listing ? `・売出 ${yen(l.listing.price)}` : ''}{l.rentOffer && !l.tenant ? `・貸家 ${yen(l.rentOffer.rent)}/日` : ''}</> : status}</td>
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
      <p className="muted">{iconText("売り土地は毎日入れ替わります。値段は相場で上下します。広さはどれも 24×20 マス（約397m²）。")}</p>
      {selected && <section className="card" aria-label="土地購入の確認">
        <h3>{selected.name}を購入しますか？</h3>
        <p>購入価格 <b>{yen(offerPrice(selected, market))}</b></p>
        <p>購入後の残高 {yen(money - offerPrice(selected, market))}</p>
        <JoinOption plot={selected.plot} checked={join} onChange={setJoin} />
        <button className="btn primary" disabled={offerPrice(selected, market) > money} onClick={() => {
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
            const price = offerPrice(o, market);
            const loc = getLocation(o.location);
            return (
              <tr key={o.id}>
                <td>{o.name}</td>
                <td>{loc.name}<small className="muted">{iconText("（家の査定 ×")}{loc.factor}）</small></td>
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
        いまの相場は <b className="big">{market.toFixed(2)}</b>{iconText("。家や土地の値段は「査定 × 相場」で決まります。 相場は毎日上下し、長い目で見ると 1.00 に戻ろうとします。安いときに土地を買い、高いときに売るのがコツです。")}</p>
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
        <button className="btn primary" onClick={() => setOverlay('jobs')}>{iconText("💼 バイトを探す")}</button>
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
              <td>{iconText(t.label)}</td>
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
