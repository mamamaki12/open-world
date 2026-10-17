import { describe, expect, it } from 'vitest';
import { recordPose, samplePose, sampleCar, renderDelay } from './poseBuffer';
import type { RemotePose } from './session';

const pose = (x: number, carX = 0): RemotePose => ({ x, y: 0, z: 0, yaw: 0, outfit: {} as RemotePose['outfit'], cars: [{ id: 'c', x: carX, z: 0, yaw: 0 } as RemotePose['cars'][number]] });

describe('poseBuffer', () => {
  it('受信した座標の間をなめらかに補間する', () => {
    for (let i = 0; i <= 10; i++) recordPose('a', pose(i, i * 2), i * 100);
    const d = renderDelay('a');
    expect(d).toBeGreaterThanOrEqual(100);
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
});
