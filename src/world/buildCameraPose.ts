/** Enter construction near the current walking position, keeping its heading. */
export function buildCameraPose(player: { x: number; y: number; z: number; yaw: number }) {
  const fx = -Math.sin(player.yaw), fz = -Math.cos(player.yaw);
  const target = [player.x + fx * 4, player.y, player.z + fz * 4] as const;
  const position = [target[0] - fx * 10, target[1] + 12, target[2] - fz * 10] as const;
  return { target, position };
}
