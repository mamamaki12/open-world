import type { CarDef } from '../catalog/cars';

export interface DrivePose { x: number; z: number; yaw: number; speed: number; steer: number; wheelSpin: number; braking: boolean; slipAngle?: number; handbraking?: boolean; drifting?: boolean }
export interface DriveInput { throttle: number; steering: number; brake: boolean; buttonSteering?: boolean; handbrake?: boolean }
export function carSamples(p: Pick<DrivePose, 'x'|'z'|'yaw'>, def: CarDef) {
  return [-1, 0, 1].map(end => ({ x: p.x - Math.sin(p.yaw) * end * (def.length - def.width) / 2,
    z: p.z - Math.cos(p.yaw) * end * (def.length - def.width) / 2 }));
}
/** 切れ角の上限(rad)。止まっているときは0.5、時速50kmで約0.15。grip はカスタム（足回り・ウィング）での高速の曲がりやすさ。 */
export function maxSteer(speed: number, grip = 1) { return .5 / (1 + Math.abs(speed) / (6 * grip)); }
/** 自転車モデル。短い刻みで車幅を含む当たり判定を行い、壁のすり抜けを防ぐ。 */
export function integrateDrive(p: DrivePose, input: DriveInput, elapsed: number, def: CarDef & { grip?: number },
  blocked: (pose: DrivePose) => boolean) {
  const steps = Math.max(1, Math.ceil(Math.min(elapsed, .25) / .008));
  const dt = Math.min(elapsed, .25) / steps;
  for (let i = 0; i < steps; i++) {
    // 速いほど切れ角を小さくし、ハンドルはゆっくり切る・戻す（効きすぎないように）
    const lock = Math.min(.7, maxSteer(p.speed, def.grip) * (input.buttonSteering ? 1.6 : 1));
    const rate = input.steering ? (input.buttonSteering ? 3.6 : 2.2) : 4;
    p.steer += (input.steering * lock - p.steer) * Math.min(1, dt * rate);
    p.handbraking = !!input.handbrake;
    p.braking = input.brake || !!input.handbrake || input.throttle * p.speed < -.05;
    const loose = !!input.handbrake && p.speed > 3;
    if (input.brake || input.handbrake) {
      // 通常ブレーキは穏やかに。高速のサイドブレーキは後輪を滑らせ、低速では停車用に効く。
      p.speed *= Math.exp(-dt * (input.brake ? 3 : loose ? 1.3 : 6));
      if (Math.abs(p.speed) < .06) p.speed = 0;
    }
    else if (input.throttle) {
      p.speed += input.throttle * (p.braking ? 9 : def.power) * dt;
    } else {
      const drag = (.7 + Math.abs(p.speed) * .13) * dt;
      p.speed = Math.sign(p.speed) * Math.max(0, Math.abs(p.speed) - drag);
    }
    p.speed = Math.max(-def.reverseSpeed, Math.min(def.maxSpeed, p.speed));
    const turn = -p.speed / def.wheelbase * Math.tan(p.steer) * dt * (loose ? 1.5 : 1);
    const yaw = p.yaw + turn;
    // 車体は先に向きを変え、移動方向は遅れて追いつく。解放するとタイヤのグリップが戻る。
    const slip = Math.max(-.85, Math.min(.85, ((p.slipAngle ?? 0) + (loose ? turn : 0)) * Math.exp(-dt * (loose ? .45 : 4 * (def.grip ?? 1)))));
    const travelYaw = yaw - slip;
    const next = { ...p, yaw, x: p.x - Math.sin(travelYaw) * p.speed * dt, z: p.z - Math.cos(travelYaw) * p.speed * dt };
    if (blocked(next)) { p.speed = 0; p.slipAngle = 0; p.drifting = false; continue; }
    p.x = next.x; p.z = next.z; p.yaw = next.yaw;
    p.slipAngle = p.speed === 0 ? 0 : slip;
    p.drifting = Math.abs(p.slipAngle) > .08 && Math.abs(p.speed) > 1;
    p.wheelSpin += p.speed * dt / def.wheel;
  }
}
