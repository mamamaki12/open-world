import type { CarDef } from '../catalog/cars';

export interface DrivePose { x: number; z: number; yaw: number; speed: number; steer: number; wheelSpin: number; braking: boolean }
export interface DriveInput { throttle: number; steering: number; brake: boolean }
export function carSamples(p: Pick<DrivePose, 'x'|'z'|'yaw'>, def: CarDef) {
  return [-1, 0, 1].map(end => ({ x: p.x - Math.sin(p.yaw) * end * (def.length - def.width) / 2,
    z: p.z - Math.cos(p.yaw) * end * (def.length - def.width) / 2 }));
}
/** 切れ角の上限(rad)。止まっているときは0.5、時速50kmで約0.15。 */
export function maxSteer(speed: number) { return .5 / (1 + Math.abs(speed) / 6); }
/** 自転車モデル。短い刻みで車幅を含む当たり判定を行い、壁のすり抜けを防ぐ。 */
export function integrateDrive(p: DrivePose, input: DriveInput, elapsed: number, def: CarDef,
  blocked: (pose: DrivePose) => boolean) {
  const steps = Math.max(1, Math.ceil(Math.min(elapsed, .25) / .008));
  const dt = Math.min(elapsed, .25) / steps;
  for (let i = 0; i < steps; i++) {
    // 速いほど切れ角を小さくし、ハンドルはゆっくり切る・戻す（効きすぎないように）
    const lock = maxSteer(p.speed);
    const rate = input.steering ? 2.2 : 4;
    p.steer += (input.steering * lock - p.steer) * Math.min(1, dt * rate);
    p.braking = input.brake || input.throttle * p.speed < -.05;
    if (input.brake) p.speed *= Math.exp(-dt * 10);
    else if (input.throttle) {
      p.speed += input.throttle * (p.braking ? 9 : def.power) * dt;
    } else {
      const drag = (.7 + Math.abs(p.speed) * .13) * dt;
      p.speed = Math.sign(p.speed) * Math.max(0, Math.abs(p.speed) - drag);
    }
    p.speed = Math.max(-def.reverseSpeed, Math.min(def.maxSpeed, p.speed));
    const yaw = p.yaw - p.speed / def.wheelbase * Math.tan(p.steer) * dt;
    const next = { ...p, yaw, x: p.x - Math.sin(yaw) * p.speed * dt, z: p.z - Math.cos(yaw) * p.speed * dt };
    if (blocked(next)) { p.speed = 0; continue; }
    p.x = next.x; p.z = next.z; p.yaw = next.yaw;
    p.wheelSpin += p.speed * dt / def.wheel;
  }
}
