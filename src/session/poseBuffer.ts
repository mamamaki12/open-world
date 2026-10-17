import type { RemotePose } from './session';

/**
 * ほかのプレイヤーの位置は10回/秒しか届かない。届いた座標を時刻つきで貯めておき、
 * 少し過去（届く間隔＋揺らぎ分）の時刻で前後2つの座標の間を補間して描く（スナップショット補間）。
 * 次が遅れたときは最後の速度で少しだけ先読みし、それでも来なければ止める。
 */
interface Spot { x: number; y: number; z: number; yaw: number }
interface Snap extends Spot { t: number; cars: Record<string, Spot> }
interface Track { snaps: Snap[]; gap: number; jitter: number }
const tracks = new Map<string, Track>();
const JUMP = 30, STALE = 1000, MAX_EXTRAPOLATE = 250;

const spot = (p: { x: number; y?: number; z: number; yaw: number }): Spot => ({ x: p.x, y: p.y ?? 0, z: p.z, yaw: p.yaw });
const angle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

export function recordPose(id: string, pose: RemotePose, now = performance.now()) {
  let tr = tracks.get(id);
  if (!tr) tracks.set(id, tr = { snaps: [], gap: 100, jitter: 10 });
  const last = tr.snaps[tr.snaps.length - 1], snap: Snap = { ...spot(pose), t: now, cars: Object.fromEntries(pose.cars.map(c => [c.id, spot(c)])) };
  // ワープや長い途切れのあとは補間せず、そこから始め直す。
  if (last && (now - last.t > STALE || Math.hypot(snap.x - last.x, snap.z - last.z) > JUMP)) tr.snaps.length = 0;
  else if (last) {
    const gap = now - last.t;
    tr.jitter += (Math.abs(gap - tr.gap) - tr.jitter) * .1;
    tr.gap += (gap - tr.gap) * .1;
  }
  tr.snaps.push(snap);
  while (tr.snaps.length > 2 && now - tr.snaps[1].t > STALE) tr.snaps.shift();
}
export function forgetPose(id: string) { tracks.delete(id); }
/** 描画を何ms遅らせるか。届く間隔が乱れるほど長くとる。 */
export function renderDelay(id: string) { const tr = tracks.get(id); return tr ? Math.min(350, Math.max(100, tr.gap + tr.jitter * 2 + 20)) : 120; }

function sample(id: string, pick: (s: Snap) => Spot | undefined, now: number): Spot | null {
  const tr = tracks.get(id); if (!tr) return null;
  const snaps = tr.snaps.filter(s => pick(s)); if (!snaps.length) return null;
  const at = now - renderDelay(id);
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
