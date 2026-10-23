import { iconText } from '../AppIcon';
// 初心者向けの遊び方。ルール・賭け方・配当の目安・コツを、ゲームの上にたためる形で出す。
// 倍率や確率はゲームの設定から計算するので、設定を変えても説明がずれない
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { CARD_RANKS, CHERRY_PAY, SLOT_PAYS, SLOT_REEL, highLowMultiplier, slotReturnRate } from '../../economy/casino';
import type { SlotSymbol } from '../../economy/casino';
import { BET_SHAPE, RACES } from '../../economy/race';
import type { BetType, RaceKind } from '../../economy/race';

export type GuideGame = 'slots' | 'roulette' | 'highlow' | RaceKind;

const SEEN_KEY = 'open-world:casino-guide-seen:';

/** はじめて開いたゲームでは説明を開いておく */
function firstVisit(game: GuideGame) {
  try {
    return !localStorage.getItem(SEEN_KEY + game);
  } catch {
    return false;
  }
}

function markSeen(game: GuideGame) {
  try {
    localStorage.setItem(SEEN_KEY + game, '1');
  } catch {
    /* 覚えられなくても遊べる */
  }
}

const pct = (p: number) => (p >= 0.01 ? `${Math.round(p * 1000) / 10}%` : `約${Math.round(1 / p).toLocaleString()}回に1回`);

function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <table className="guide-table">
      <thead>
        <tr>{head.map((h) => <th key={h}>{h}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>
        ))}
      </tbody>
    </table>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="guide-sec">
      <h4>{iconText(title)}</h4>
      {children}
    </section>
  );
}

// ---- スロット ----

const SLOT_LABEL: Record<SlotSymbol, string> = { seven: '7', bar: 'BAR', bell: '🔔 ベル', melon: '🍉 スイカ', cherry: '🍒 チェリー', lemon: '🍋 レモン' };

function SlotsGuide() {
  const n = Object.values(SLOT_REEL).reduce((a, b) => a + b, 0);
  const three = (s: SlotSymbol) => (SLOT_REEL[s] / n) ** 3;
  const rows = (Object.keys(SLOT_PAYS) as (keyof typeof SLOT_PAYS)[]).map((s) => [
    `${SLOT_LABEL[s]} が3つ`,
    `×${SLOT_PAYS[s].toLocaleString()}`,
    pct(three(s)),
  ]);
  rows.push(['🍒 が左のリールに出る', `×${CHERRY_PAY}（賭け金が戻る）`, pct(SLOT_REEL.cherry / n)]);
  return (
    <>
      <Section title="ルール">
        <p>3本のリールが回って、左から順に止まります。真ん中の赤い線（ペイライン）に同じ絵柄が3つそろえば当たりです。</p>
      </Section>
      <Section title="遊び方">
        <ol>
          <li>下のチップを押して賭け金を決めます（押すたびに積み増し。「クリア」でやり直し）。</li>
          <li>「レバーを引く」か、台の赤いボタン・レバーを押します。</li>
          <li>当たると賭け金に倍率をかけた額がもらえます。</li>
        </ol>
      </Section>
      <Section title="配当と当たりやすさ">
        <Table head={['出目', '倍率', '当たりやすさ']} rows={rows} />
        <p className="guide-note">例：1万円賭けてベルが3つそろうと 50万円。</p>
      </Section>
      <Section title="はじめての方へ">
        <p>
          長く遊ぶと、賭けたお金の約 {Math.round(slotReturnRate() * 1000) / 10}% が戻ってくる計算です（残りはカジノのもうけ）。
          少しずつ賭けて、回す回数を楽しむのがおすすめです。
        </p>
      </Section>
    </>
  );
}

// ---- ルーレット ----

function RouletteGuide() {
  return (
    <>
      <Section title="ルール">
        <p>0〜36 の数字が並んだホイールに玉を投げ入れ、玉が落ちたポケットの数字を当てます。数字は赤・黒に塗り分けられていて、0 だけ緑です。</p>
      </Section>
      <Section title="遊び方">
        <ol>
          <li>チップの額を選び、台の上のマスを押してチップを置きます。何か所にでも置けます。</li>
          <li>置いたチップは、そのマスを右クリックすると外せます。「クリア」で全部外せます。「前回と同じ」で同じ置き方をくり返せます。</li>
          <li>「スピン」で玉が回ります。当たったマスが光り、払い戻しが入ります。</li>
        </ol>
      </Section>
      <Section title="賭け方と配当">
        <Table
          head={['置く場所', '当たる数字', '倍率', '当たりやすさ']}
          rows={[
            ['赤 ／ 黒', '18個', '×2', pct(18 / 37)],
            ['奇数 ／ 偶数', '18個', '×2', pct(18 / 37)],
            ['1〜18 ／ 19〜36', '18個', '×2', pct(18 / 37)],
            ['1st・2nd・3rd 12（ダース）', '12個', '×3', pct(12 / 37)],
            ['列（台の縦の並び）', '12個', '×3', pct(12 / 37)],
            ['数字1つ（0 も可）', '1個', '×36', pct(1 / 37)],
          ]}
        />
        <p className="guide-note">倍率は戻ってくる額（賭け金込み）です。1万円を赤に置いて当たれば 2万円が戻ります。0 が出ると、赤・黒などの外側の賭けはすべて負けです。</p>
      </Section>
      <Section title="はじめての方へ">
        <p>{iconText("まずは「赤」か「黒」に少し置いてみましょう。約半分の確率で倍になります。慣れたら数字1つで大当たり（×36）を狙えます。還元率は 97.3% で、カジノの中ではいちばん損をしにくいゲームです。")}</p>
      </Section>
    </>
  );
}

// ---- ハイ＆ロー ----

function HighLowGuide() {
  const ex = [2, 7, 12].map((c) => [
    c === 2 ? '2' : c === 7 ? '7' : 'Q（12）',
    highLowMultiplier(c, 'high') ? `×${highLowMultiplier(c, 'high')}` : '―',
    highLowMultiplier(c, 'low') ? `×${highLowMultiplier(c, 'low')}` : '―',
  ]);
  return (
    <>
      <Section title="ルール">
        <p>
          場に1枚のトランプがあります。次にめくるカードが、今のカードより<b>大きい（ハイ）</b>か<b>小さい（ロー）</b>かを当てます。
          強さは A（1）がいちばん小さく、K（13）がいちばん大きいです。マークは関係ありません。<b>同じ数字が出たら負け</b>です。
        </p>
      </Section>
      <Section title="遊び方">
        <ol>
          <li>{iconText("賭け金を決めて「▲ ハイ」か「▼ ロー」を押します。")}</li>
          <li>当たると持ち分が倍率どおりに増えます。「受け取る」でお金にするか、そのまま次も当てて増やすかを選べます。</li>
          <li>はずれると、その回の持ち分はすべてなくなります。</li>
        </ol>
      </Section>
      <Section title="倍率の目安">
        <Table head={['今のカード', 'ハイの倍率', 'ローの倍率']} rows={ex} />
        <p className="guide-note">当たりやすい方ほど倍率は低く、当たりにくい方ほど高くなります（全{CARD_RANKS}種類のうち、当たりになる数で決まります。還元率 95%）。</p>
      </Section>
      <Section title="はじめての方へ">
        <p>A・2 ならハイ、Q・K ならローがほぼ当たります。7 のような真ん中は五分五分なので、連勝しているときは「受け取る」で勝ちを確定させるのも作戦です。</p>
      </Section>
    </>
  );
}

// ---- 競馬・競輪・ボートレース ----

const BET_DESC: Record<BetType, (kind: RaceKind) => string> = {
  win: () => '1着を当てる',
  place: (k) => (k === 'boat' ? '2着までに入る1艇を当てる' : '3着までに入る1頭を当てる'),
  bracket: () => '1着と2着の「枠」の組み合わせ（順番は問わない）',
  quinella: () => '1着と2着の組み合わせ（順番は問わない）',
  wide: () => '3着までに入る2つの組み合わせ（順番は問わない）',
  exacta: () => '1着と2着を順番どおりに当てる',
  trio: () => '1〜3着の3つの組み合わせ（順番は問わない）',
  trifecta: () => '1着・2着・3着を順番どおりに当てる',
};

/** 当てやすさ（★が多いほど当てやすい）と、配当の大きさの目安 */
const BET_LEVEL: Record<BetType, { easy: number; pay: string }> = {
  win: { easy: 4, pay: '1.5〜30倍くらい' },
  place: { easy: 5, pay: '1.1〜5倍くらい' },
  bracket: { easy: 3, pay: '3〜50倍くらい' },
  quinella: { easy: 3, pay: '5〜100倍くらい' },
  wide: { easy: 4, pay: '2〜30倍くらい' },
  exacta: { easy: 2, pay: '10〜200倍くらい' },
  trio: { easy: 2, pay: '10〜500倍くらい' },
  trifecta: { easy: 1, pay: '50〜数千倍' },
};

const RACE_TIPS: Record<RaceKind, { rule: string; read: string[]; tip: string }> = {
  horse: {
    rule: '出走する馬（8〜18頭）の中から、ゴールに先着する馬を予想します。馬には「馬番」、2頭ずつまとめた「枠番」（1〜8枠、帽子の色）があります。',
    read: [
      '人気・オッズ：みんなが買っている馬ほどオッズ（倍率）が低くなります。単勝オッズ 3.5 なら、100円が 350円になります。',
      '予想の印：◎ 本命、○ 対抗、▲ 単穴、△ 連下、☆ 穴。',
      '脚質：逃げ（先頭を走る）、先行（前のほう）、差し（後ろから伸びる）、追込（最後方から一気に）。',
    ],
    tip: 'はじめは「単勝」か「複勝」で、人気（オッズが低い）の馬を1頭買うのがおすすめです。複勝は3着までに入れば当たりなので、いちばん当てやすい券です。',
  },
  keirin: {
    rule: '7〜9人の選手が自転車でバンクを周回し、着順を予想します。誘導員の後ろを一列で回り、ジャン（鐘）が鳴る残り1周半から本気の勝負になります。',
    read: [
      'ライン：同じ地域の選手が前後に並んで協力します。先頭の「先行」選手が風よけになり、すぐ後ろの「番手」選手がゴール前で抜け出すのが定番です。',
      '脚質：逃（先行して逃げ切る）、両（どちらもできる）、追（後ろから追い込む）。',
      'オッズ 12.0 なら、100円が 1,200円になります。',
    ],
    tip: 'ラインの「先行」と「番手」の2人で 2車複（順番は問わない）を買うのが、競輪らしい当て方です。',
  },
  boat: {
    rule: '6艇のボートが水面のコースを3周し、着順を予想します。スタートラインをいちばん良いタイミング（ST）で通過し、最初のターンマーク（1マーク）を先に回った艇が有利です。',
    read: [
      '1号艇（白）はいちばん内側から出られるので、とても強いのが特徴です（実際のレースでも1着の半分以上が1号艇）。',
      'ST（スタートタイミング）は 0 に近いほど上手なスタート。.10 なら 0.10秒。',
      '決まり手：逃げ（1号艇がそのまま）、まくり（外から一気に）、差し（内をすくう）など。',
    ],
    tip: 'まずは1号艇の「単勝」や、1号艇を1着にした「2連単」から買ってみましょう。',
  },
};

function RaceGuide({ kind }: { kind: RaceKind }) {
  const cfg = RACES[kind];
  const t = RACE_TIPS[kind];
  return (
    <>
      <Section title="ルール">
        <p>{t.rule}</p>
      </Section>
      <Section title={`${cfg.ticket}の買い方`}>
        <ol>
          <li>出走表を見て、勝ちそうな{cfg.who}を考えます。</li>
          <li>{iconText("自動発売機で「式別」（券の種類、下の表）→「方式」→ ")}{cfg.numberName}{iconText(" → 金額の順に押し、確認して「セット」。何回でもセットできます。")}</li>
          <li>右の「投票内容」を確かめて「購入する」と、{cfg.ticket}が出てきます。</li>
          <li>{iconText("「発走！」でレースが始まります。当たれば、オッズ × 賭け金が払い戻されます。")}</li>
        </ol>
        <p className="guide-note">{iconText("方式は、通常（1つの組）・ボックス（選んだ中の組み合わせを全部）・ながし（軸を1つ決めて相手と全部）・フォーメーション（着順ごとに選んで掛け合わせ）から選べます。点数 × 金額がかかります。")}</p>
      </Section>
      <Section title="券の種類">
        <Table
          head={['券', '当てるもの', '当てやすさ', '配当の目安']}
          rows={cfg.bets.map((b) => [
            <b key="n">{iconText(cfg.betNames[b])}</b>,
            BET_DESC[b](kind) + (BET_SHAPE[b].k > 1 ? `（${BET_SHAPE[b].k}つ選ぶ）` : ''),
            <span key="e" className="guide-stars">{iconText('★'.repeat(BET_LEVEL[b].easy))}{'☆'.repeat(5 - BET_LEVEL[b].easy)}</span>,
            BET_LEVEL[b].pay,
          ])}
        />
        <p className="guide-note">
          売り上げのうち {Math.round(Math.min(...cfg.bets.map((b) => cfg.payout[b] ?? 0)) * 1000) / 10}〜{Math.round(Math.max(...cfg.bets.map((b) => cfg.payout[b] ?? 0)) * 1000) / 10}% が払い戻しに回ります（実際の{iconText(cfg.title)}と同じ割合）。
        </p>
      </Section>
      <Section title="出走表の見方">
        <ul>
          {t.read.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </Section>
      <Section title="はじめての方へ">
        <p>{t.tip}</p>
      </Section>
    </>
  );
}

const TITLES: Record<GuideGame, string> = {
  slots: 'スロットの遊び方',
  roulette: 'ルーレットの遊び方',
  highlow: 'ハイ＆ローの遊び方',
  horse: '競馬の遊び方',
  keirin: '競輪の遊び方',
  boat: 'ボートレースの遊び方',
};

export function Guide({ game }: { game: GuideGame }) {
  const [open, setOpen] = useState(() => firstVisit(game));
  useEffect(() => markSeen(game), [game]);
  return (
    <div className={`guide${open ? ' open' : ''}`}>
      <button className="guide-toggle" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span>{iconText("📖 ")}{iconText(TITLES[game])}（はじめての方へ）</span>
        <span className="guide-arrow">{iconText(open ? '閉じる ▲' : '開く ▼')}</span>
      </button>
      {open && (
        <div className="guide-body">
          {game === 'slots' && <SlotsGuide />}
          {game === 'roulette' && <RouletteGuide />}
          {game === 'highlow' && <HighLowGuide />}
          {(game === 'horse' || game === 'keirin' || game === 'boat') && <RaceGuide kind={game} />}
        </div>
      )}
    </div>
  );
}
