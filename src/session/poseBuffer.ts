import type { RemotePose } from './session';

/**
 * ほかのプレイヤーの位置は10回/秒しか届かない。届いた座標を時刻つきで貯めておき、
 * 少し過去（届く間隔＋揺らぎ分）の時刻で前後2つの座標の間を補間して描く（スナップショット補間）。
 * 次が遅れたときは最後の速度で少しだけ先読みし、それでも来なければ止める。
 */
interface Spot { x: number; y: number; z: number; yaw: number }
interface Snap extends Spot { t: number; cars: Record<string, Spot> }
interface Track { snaps: Snap[]; gap: number; jitter: number; offset?: number; ts?: number; recv: number; delay?: number; at?: number }
const tracks = new Map<string, Track>();
const JUMP = 30, STALE = 1000, MAX_EXTRAPOLATE = 250;

const spot = (p: { x: number; y?: number; z: number; yaw: number }): Spot => ({ x: p.x, y: p.y ?? 0, z: p.z, yaw: p.yaw });
const angle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/**
 * 送った側の時刻（pose.ts）があれば、それをこちらの時計に直して並べる。
 * 届くのが遅れたり2つまとめて届いたりしても、動きの速さが揺れない。
 */
export function recordPose(id: string, pose: RemotePose, now = performance.now()) {
  let tr = tracks.get(id);
  if (!tr) tracks.set(id, tr = { snaps: [], gap: 100, jitter: 10, recv: now });
  const last = tr.snaps[tr.snaps.length - 1], ts = Number.isFinite(pose.ts) ? pose.ts! : undefined;
  const restart = !last || now - tr.recv > STALE || Math.hypot(pose.x - last.x, pose.z - last.z) > JUMP ||
    (ts === undefined) !== (tr.ts === undefined) || (ts !== undefined && ts <= tr.ts!);
  // ワープ・長い途切れ・相手の再読み込みのあとは補間せず、そこから始め直す。
  if (restart) { tr.snaps.length = 0; tr.offset = undefined; tr.delay = undefined; }
  let t = now;
  if (ts !== undefined) {
    // こちらの時計との差。いちばん早く届いたものに合わせ、時計のずれにはゆっくりついていく。
    const o = now - ts;
    tr.offset = tr.offset === undefined || o < tr.offset ? o : tr.offset + (o - tr.offset) * .002;
    t = ts + tr.offset;
    if (!restart) { tr.gap += (ts - tr.ts! - tr.gap) * .1; tr.jitter += (now - t - tr.jitter) * .1; }
  } else if (!restart) {
    const gap = now - tr.recv;
    tr.jitter += (Math.abs(gap - tr.gap) - tr.jitter) * .1;
    tr.gap += (gap - tr.gap) * .1;
  }
  tr.ts = ts; tr.recv = now;
  if (last && !restart && t <= last.t) t = last.t + 1;
  tr.snaps.push({ ...spot(pose), t, cars: Object.fromEntries(pose.cars.map(c => [c.id, spot(c)])) });
  while (tr.snaps.length > 2 && now - tr.snaps[1].t > STALE) tr.snaps.shift();
}
export function forgetPose(id: string) { tracks.delete(id); }
/** 描画を何ms遅らせるか。届く間隔が乱れるほど長くとる。急に変えると速さが揺れるので、少しずつ（5%まで）寄せる。 */
export function renderDelay(id: string, now = performance.now()) {
  const tr = tracks.get(id); if (!tr) return 120;
  const target = Math.min(350, Math.max(100, tr.gap + tr.jitter * 2 + 20));
  if (tr.delay === undefined) tr.delay = target;
  else if (now !== tr.at) { const step = Math.max(0, now - (tr.at ?? now)) * .05; tr.delay += Math.max(-step, Math.min(step, target - tr.delay)); }
  tr.at = now;
  return tr.delay;
}

function sample(id: string, pick: (s: Snap) => Spot | undefined, now: number): Spot | null {
  const tr = tracks.get(id); if (!tr) return null;
  const snaps = tr.snaps.filter(s => pick(s)); if (!snaps.length) return null;
  const at = now - renderDelay(id, now);
  let i = snaps.length - 1;
  while (i > 0 && snaps[i - 1].t > at) i--;
  const b = snaps[i], a = snaps[i - 1] ?? b, pa = pick(a)!, pb = pick(b)!;
  if (at >= b.t) {
    // 次の座標がまだ来ていない: 直前の速度で少しだけ進める。
    if (a === b || b.t === a.t || Math.hypot(pb.x - pa.x, pb.z - pa.z) > JUMP) return pb;
    const k = Math.min(at - b.t, MAX_EXTRAPOLATE) / (b.t - a.t);
    return { x: pb.x + (pb.x - pa.x) * k, y: pb.y + (pb.y - pa.y) * k, z: pb.z + (pb.z - pa.z) * k, yaw: pb.yaw + angle(pb.yaw - pa.yaw) * k };
  }
  if (a === b || at <= a.t) return pa;
  const k = (at - a.t) / (b.t - a.t);
  if (Math.hypot(pb.x - pa.x, pb.z - pa.z) > JUMP) return k < .5 ? pa : pb;
  return { x: pa.x + (pb.x - pa.x) * k, y: pa.y + (pb.y - pa.y) * k, z: pa.z + (pb.z - pa.z) * k, yaw: pa.yaw + angle(pb.yaw - pa.yaw) * k };
}
export const samplePose = (id: string, now = performance.now()) => sample(id, s => s, now);
export const sampleCar = (owner: string, car: string, now = performance.now()) => sample(owner, s => s.cars[car], now);
