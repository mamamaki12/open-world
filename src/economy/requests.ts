// プレイヤーどうしの仕事の依頼・雇用。報酬は依頼したときに預かり（手付金）、完了を確認したら受けた人へ渡る。
// 描画やブラウザーの状態に依存しない（共有ワールドのサーバーでも使う）。

export interface WorkRequest {
  id: string;
  title: string;
  description: string;
  /** 預かっている報酬（円） */
  reward: number;
  poster: string;
  posterName: string;
  day: number;
  /** 引き受けた人 */
  worker?: string;
  workerName?: string;
}

export const REQUEST_LIMITS = { perLot: 6, title: 30, description: 200, reward: 10_000_000_000 };

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const id = (v: unknown) => (typeof v === 'string' && v.length > 0 && v.length <= 100 ? v : '');

/** 保存や通信で届いた依頼を安全な形に直す */
export function cleanRequests(v: unknown): WorkRequest[] {
  return (Array.isArray(v) ? v : []).slice(0, REQUEST_LIMITS.perLot).flatMap((r): WorkRequest[] => {
    if (!r || typeof r !== 'object') return [];
    const title = str(r.title, REQUEST_LIMITS.title), poster = id(r.poster);
    if (!id(r.id) || !title || !poster || !Number.isSafeInteger(r.reward) || r.reward < 1 || !Number.isSafeInteger(r.day)) return [];
    const worker = id(r.worker);
    return [{ id: r.id, title, description: str(r.description, REQUEST_LIMITS.description), reward: r.reward, poster, posterName: str(r.posterName, 24) || 'だれか', day: r.day,
      ...(worker ? { worker, workerName: str(r.workerName, 24) || 'だれか' } : {}) }];
  });
}

/** 依頼の文と報酬を確かめる。正しければ null、だめなら理由 */
export function requestError(r: { title?: unknown; reward?: unknown }): string | null {
  if (!str(r.title, REQUEST_LIMITS.title)) return '依頼の名前を入れてください';
  if (!Number.isSafeInteger(r.reward) || (r.reward as number) < 1) return '報酬は1円以上の整数にしてください';
  if ((r.reward as number) > REQUEST_LIMITS.reward) return '報酬が高すぎます（100億円まで）';
  return null;
}

export type RequestOp = 'take' | 'quit' | 'done' | 'cancel';

/**
 * 依頼の状態を進める。お金の動きを返す（呼び出し側で口座に反映する）。
 * take: 依頼主以外が引き受ける / quit: 引き受けた人がやめる / done: 依頼主が完了を確認し報酬を渡す / cancel: まだだれも引き受けていなければ依頼主が取り下げて報酬を戻す
 */
export function stepRequest(list: WorkRequest[], reqId: string, op: RequestOp, who: string, name: string):
  { list: WorkRequest[]; pay?: { to: string; amount: number; label: string }; message: string } | string {
  const r = list.find((x) => x.id === reqId);
  if (!r) return 'その依頼はもうありません';
  const rest = list.filter((x) => x.id !== reqId);
  if (op === 'take') {
    if (r.poster === who) return '自分の依頼は引き受けられません';
    if (r.worker) return 'もうほかの人が引き受けています';
    return { list: list.map((x) => (x.id === reqId ? { ...x, worker: who, workerName: str(name, 24) || 'だれか' } : x)), message: `「${r.title}」を引き受けました` };
  }
  if (op === 'quit') {
    if (r.worker !== who) return '引き受けている依頼ではありません';
    const { worker: _w, workerName: _n, ...open } = r;
    return { list: list.map((x) => (x.id === reqId ? open : x)), message: `「${r.title}」をやめました` };
  }
  if (r.poster !== who) return '依頼した人だけができます';
  if (op === 'done') {
    if (!r.worker) return 'まだだれも引き受けていません';
    return { list: rest, pay: { to: r.worker, amount: r.reward, label: `依頼の報酬：${r.title}（${r.posterName}さん）` }, message: `${r.workerName}さんに報酬を渡しました` };
  }
  if (r.worker) return '引き受けた人がいる間は取り下げられません（完了を確認するか、相手にやめてもらってください）';
  return { list: rest, pay: { to: r.poster, amount: r.reward, label: `依頼の取り下げ：${r.title}` }, message: '依頼を取り下げました（報酬は戻りました）' };
}
