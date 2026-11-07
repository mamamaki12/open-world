// NPCからの建築の依頼（クエスト）。条件に合う家を建てて納品すると、依頼主が家を土地ごと買い取り、お礼が上乗せされる。
// 描画やブラウザーの状態に依存しない純粋な関数だけ。
import type { House } from '../building/types';

export interface QuestReq {
  /** 部屋の床の広さ（畳）の下限。テラスは数えない */
  tatami?: number;
  /** 何階建て以上か */
  levels?: number;
  windows?: number;
  /** 必要な家具（catalog/furniture.json の id。'bed' はベッドのどれか） */
  furniture?: string[];
  /** テラスがあること */
  terrace?: boolean;
  /** 立地（town / rural / station / city） */
  location?: string;
}

export interface Quest {
  id: string;
  client: string;
  title: string;
  text: string;
  req: QuestReq;
  /** 売値に上乗せするお礼（円） */
  bonus: number;
}

interface Template { client: string; title: string; text: string; req: QuestReq; bonus: number }

const TEMPLATES: Template[] = [
  { client: '佐藤さん（大学生）', title: 'ひとり暮らしの小さな家', text: '学校に通うための、こぢんまりした家がほしいです。', req: { tatami: 10, furniture: ['bed', 'kitchen', 'bath', 'toilet'] }, bonus: 300_000 },
  { client: '田中さん夫婦', title: '新婚さんの2階建て', text: '2人で住む2階建て。お風呂とキッチンは外せません。', req: { tatami: 30, levels: 2, furniture: ['bed', 'kitchen', 'bath', 'toilet'] }, bonus: 1_200_000 },
  { client: '鈴木さん一家', title: '5人家族の広い家', text: '子どもが3人。広くて明るい家にしてください。', req: { tatami: 50, levels: 2, windows: 10, furniture: ['bed', 'kitchen', 'bath', 'toilet', 'dining'] }, bonus: 2_500_000 },
  { client: '画家の高橋さん', title: '光あふれるアトリエ', text: '絵を描くので、とにかく窓をたくさん。', req: { tatami: 15, windows: 12 }, bonus: 900_000 },
  { client: '伊藤さん（会社員）', title: '駅近のコンパクトな家', text: '毎朝の通勤が楽な駅の近くに。', req: { tatami: 15, location: 'station', furniture: ['bed', 'bath', 'toilet'] }, bonus: 1_000_000 },
  { client: '渡辺社長', title: '都心の3階建て', text: '都心に事務所兼住まいを。3階建て以上で。', req: { tatami: 40, levels: 3, location: 'city', furniture: ['desk', 'kitchen', 'toilet'] }, bonus: 4_000_000 },
  { client: '山本さん（園芸好き）', title: 'テラスのある平屋', text: '外でお茶を飲めるテラスがほしい。植物も置いてね。', req: { tatami: 20, terrace: true, furniture: ['plant', 'kitchen', 'bath'] }, bonus: 900_000 },
  { client: '中村さん（ゲーム実況者）', title: '配信部屋のある家', text: 'テレビとデスクのある部屋で配信したい。', req: { tatami: 20, furniture: ['tv', 'desk', 'sofa', 'bed'] }, bonus: 800_000 },
  { client: '小林さん（のんびり派）', title: '郊外のゆったり平屋', text: '郊外で、広い平屋にのんびり住みたい。', req: { tatami: 35, location: 'rural', furniture: ['bed', 'kitchen', 'bath', 'toilet', 'sofa'] }, bonus: 1_100_000 },
  { client: '加藤さん（料理研究家）', title: 'キッチンが主役の家', text: 'アイランドキッチンと冷蔵庫、ダイニングを。', req: { tatami: 25, furniture: ['kitchen-island', 'fridge', 'dining'] }, bonus: 1_000_000 },
];

const FURNITURE_NAME: Record<string, string> = {
  bed: 'ベッド', kitchen: 'キッチン', bath: 'お風呂', toilet: 'トイレ', dining: 'ダイニング', desk: 'デスク', plant: '観葉植物',
  tv: 'テレビ', sofa: 'ソファ', 'kitchen-island': 'アイランドキッチン', fridge: '冷蔵庫',
};
const LOCATION_NAME: Record<string, string> = { town: '住宅街', rural: '郊外', station: '駅近', city: '都心' };

/** 番号から決まった依頼を作る（同じ番号なら同じ依頼） */
export function questAt(n: number): Quest {
  const t = TEMPLATES[((n % TEMPLATES.length) + TEMPLATES.length) % TEMPLATES.length];
  return { id: `q${n}`, ...t };
}

/** 掲示板に並べる3件。next は次に出す番号 */
export function questBoard(next: number): Quest[] {
  return [0, 1, 2].map((i) => questAt(next + i * 3));
}

export function houseStats(house: House) {
  const room = house.floors.filter((f) => f.kind !== 'terrace');
  const cells = room.reduce((a, f) => a + Math.abs(f.x1 - f.x0) * Math.abs(f.z1 - f.z0), 0);
  const levels = room.length ? Math.max(...room.map((f) => f.level)) + 1 : 0;
  return {
    tatami: cells / 2,
    levels,
    windows: house.openings.filter((o) => o.kind === 'window').length,
    terrace: house.floors.some((f) => f.kind === 'terrace'),
    has: (type: string) => house.furniture.some((f) => (type === 'bed' ? f.type.startsWith('bed-') : f.type === type)),
  };
}

export interface QuestCheck { label: string; ok: boolean }

/** 依頼の条件を1つずつ確かめる（house が無ければ全部まだ） */
export function checkQuest(q: Quest, house: House | null, location: string | null): QuestCheck[] {
  const s = house ? houseStats(house) : null;
  const out: QuestCheck[] = [];
  const r = q.req;
  if (r.location) out.push({ label: `立地：${LOCATION_NAME[r.location] ?? r.location}`, ok: location === r.location });
  if (r.tatami) out.push({ label: `部屋の広さ ${r.tatami}畳以上（いま${s ? Math.floor(s.tatami) : 0}畳）`, ok: !!s && s.tatami >= r.tatami });
  if (r.levels) out.push({ label: `${r.levels}階建て以上`, ok: !!s && s.levels >= r.levels });
  if (r.windows) out.push({ label: `窓 ${r.windows}個以上（いま${s?.windows ?? 0}個）`, ok: !!s && s.windows >= r.windows });
  if (r.terrace) out.push({ label: 'テラスがある', ok: !!s?.terrace });
  for (const f of r.furniture ?? []) out.push({ label: FURNITURE_NAME[f] ?? f, ok: !!s?.has(f) });
  return out;
}

export const questDone = (checks: QuestCheck[]) => checks.every((c) => c.ok);

/** ヒント用：まだ足りない条件を短く */
export function missingText(checks: QuestCheck[]): string {
  const miss = checks.filter((c) => !c.ok).map((c) => c.label.replace(/（.*）/, ''));
  return miss.length ? `あと：${miss.slice(0, 3).join('・')}${miss.length > 3 ? ' など' : ''}` : '条件クリア！着工して納品しよう';
}
