import { CIVIC_SITE, TOWN_BOUNDS } from '../economy/town';
/** Store geometry remains in civic coordinates; sites are chosen in town coordinates. */
export function shopSite(x: number, z: number, width: number, depth: number) {
  return { x0: x - CIVIC_SITE.x, x1: x + width - CIVIC_SITE.x, z0: z - CIVIC_SITE.z, z1: z + depth - CIVIC_SITE.z };
}
export const SHOPPING_SOUTH = TOWN_BOUNDS.z1 + 9;
export const SHOPPING_NORTH = TOWN_BOUNDS.z0 - 20;
export const SHOPPING_WEST = TOWN_BOUNDS.x0 + 5;
export const SHOPPING_AREAS = [
  { name: '西の商店街', x: SHOPPING_WEST + 24, z: SHOPPING_SOUTH + 16 },
  { name: '北のブティック通り', x: TOWN_BOUNDS.x0 + 45, z: TOWN_BOUNDS.z0 - 9.5 },
  { name: '北東のストリートショップ', x: TOWN_BOUNDS.x1 - 35, z: TOWN_BOUNDS.z0 - 9.5 },
];
