import { describe, expect, it } from 'vitest';
import { recordPose, samplePose, sampleCar, renderDelay } from './poseBuffer';
import type { RemotePose } from './session';

const pose = (x: number, carX = 0, ts?: number): RemotePose => ({ x, ts, y: 0, z: 0, yaw: 0, outfit: {} as RemotePose['outfit'], cars: [{ id: 'c', x: carX, z: 0, yaw: 0 } as RemotePose['cars'][number]] });

describe('poseBuffer', () => {
  it('受信した座標の間をなめらかに補間する', () => {
    for (let i = 0; i <= 10; i++) recordPose('a', pose(i, i * 2), i * 100);
    const d = renderDelay('a');
    expect(d).toBeGreaterThanOrEqual(50);
    const xs = [0, 25, 50, 75].map(t => samplePose('a', 800 + d + t)!.x);
    xs.forEach((x, i) => expect(x).toBeCloseTo(8 + i * .25, 5));
    expect(sampleCar('a', 'c', 850 + d)!.x).toBeCloseTo(17, 5);
  });
  it('次が遅れたら少しだけ先読みして止まる', () => {
    for (let i = 0; i <= 5; i++) recordPose('b', pose(i), i * 100);
    expect(samplePose('b', 500 + renderDelay('b') + 100)!.x).toBeCloseTo(6, 5);
    expect(samplePose('b', 500 + renderDelay('b') + 5000)!.x).toBeCloseTo(7.5, 5);
  });
  it('ワープは補間せず飛ぶ', () => {
    recordPose('w', pose(0), 0); recordPose('w', pose(500), 100);
    expect(samplePose('w', 100)!.x).toBe(500);
  });
  it('届く間隔が揺れても、60fpsで見た速さがほぼ一定（止まったり跳んだりしない）', () => {
    // 送信は100msごと、届くのは0〜80ms遅れてばらばら。歩く速さは4m/s。
    let seed = 1;
    const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const arrivals = Array.from({ length: 60 }, (_, i) => ({ t: 5000 + i * 100 + rand() * 80, ts: i * 100, x: i * .4 })).sort((a, b) => a.t - b.t);
    const v: number[] = [];
    let prev = NaN;
    for (let now = 5000; now < 10900; now += 1000 / 60) {
      while (arrivals.length && arrivals[0].t <= now) { const a = arrivals.shift()!; recordPose('j', pose(a.x, 0, a.ts), now); }
      const x = samplePose('j', now)?.x ?? NaN;
      if (now > 8000) v.push((x - prev) * 60);
      prev = x;
    }
    expect(Math.min(...v)).toBeGreaterThan(3.5);
    expect(Math.max(...v)).toBeLessThan(4.5);
  });
  it('20回/秒なら描画の遅れは短い', () => {
    let seed = 7;
    const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const arrivals = Array.from({ length: 100 }, (_, i) => ({ t: 5000 + i * 50 + rand() * 30, ts: i * 50, x: i * .2 })).sort((a, b) => a.t - b.t);
    for (let now = 5000; now < 9900; now += 1000 / 60) {
      while (arrivals.length && arrivals[0].t <= now) { const a = arrivals.shift()!; recordPose('f', pose(a.x, 0, a.ts), now); }
      samplePose('f', now);
    }
    expect(renderDelay('f', 9900)).toBeLessThan(130);
  });
});
