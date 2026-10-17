import { getOpening, getFurniture } from '../catalog';
import { GRID, WALL_THICKNESS } from './dimensions';
import { wallDir, wallBaseY, wallHeight, wallLength } from './rules';
import type { FurniturePart, House, WallPart } from './types';

export function nameplateMount(house: House, wall: WallPart, point: { x: number; y: number; z: number }, viewer: { x: number; z: number }, type = 'nameplate') {
  const def = getFurniture(type).mount;
  if (!def) return null;
  const HALF_WIDTH = def.width / 2, HALF_HEIGHT = def.height / 2;
  const { dx, dz } = wallDir(wall);
  const length = wallLength(wall), height = wallHeight(wall);
  if (length < HALF_WIDTH * 2 + 0.08 || height < HALF_HEIGHT * 2 + 0.08) return null;
  const raw = (point.x - wall.x0 * GRID) * dx + (point.z - wall.z0 * GRID) * dz;
  const offset = Math.max(HALF_WIDTH + 0.04, Math.min(length - HALF_WIDTH - 0.04, Math.round(raw / 0.05) * 0.05));
  const h = Math.max(HALF_HEIGHT + 0.04, Math.min(height - HALF_HEIGHT - 0.04, Math.round((point.y - wallBaseY(wall)) / 0.05) * 0.05));
  if (house.openings.some(o => {
    if (o.wallId !== wall.id) return false;
    const def = getOpening(o.type);
    return Math.abs(offset - o.offset) < def.width / 2 + HALF_WIDTH && h + HALF_HEIGHT > def.sill && h - HALF_HEIGHT < def.sill + def.height;
  })) return null;
  const side: 1 | -1 = (viewer.x - wall.x0 * GRID) * -dz + (viewer.z - wall.z0 * GRID) * dx >= 0 ? 1 : -1;
  return { wallId: wall.id, offset: +offset.toFixed(4), height: +h.toFixed(4), side };
}

/** 板の裏面を壁の手前側へ密着させ、文字面（ローカル+Z）を外へ向ける。 */
export function mountedTransform(house: House, mount: NonNullable<FurniturePart['wallMount']>, type = 'nameplate') {
  const wall = house.walls.find(w => w.id === mount.wallId);
  if (!wall) return null;
  const { dx, dz } = wallDir(wall);
  const nx = -dz * mount.side, nz = dx * mount.side;
  const distance = WALL_THICKNESS / 2 + (getFurniture(type).mount?.back ?? .0125) + 0.003;
  return { x: wall.x0 * GRID + dx * mount.offset + nx * distance,
    z: wall.z0 * GRID + dz * mount.offset + nz * distance,
    y: wallBaseY(wall) + mount.height - 1.6,
    rotation: Math.atan2(nx, nz) * 180 / Math.PI, level: wall.level };
}
