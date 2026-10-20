import { describe, expect, it } from 'vitest';
import { buildCameraPose } from './buildCameraPose';

describe('entering build mode at the walking position', () => {
  for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    it(`keeps the heading at yaw ${yaw}, away from the original lot and on upper floors`, () => {
      const player = { x: 180, y: 12.1, z: -95, yaw };
      const { target, position } = buildCameraPose(player);
      expect(target[0] - player.x).toBeCloseTo(-Math.sin(yaw) * 4);
      expect(target[2] - player.z).toBeCloseTo(-Math.cos(yaw) * 4);
      expect(target[1]).toBe(player.y);
      expect(position[1] - target[1]).toBeCloseTo(12);
      expect(Math.hypot(position[0] - player.x, position[2] - player.z)).toBeCloseTo(6);
      expect(player).toEqual({ x: 180, y: 12.1, z: -95, yaw });
    });
  }
});
