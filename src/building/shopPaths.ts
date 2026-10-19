import { CIVIC_SITE, TOWN_BOUNDS } from '../economy/town';
import { VENUES, VENUE_KINDS, venueTurn } from './venues';
/** Flat pedestrian routes to dispersed stores, in town coordinates. */
export const SHOP_PATHS = VENUE_KINDS.flatMap(kind => {
  const v = VENUES[kind], x0 = v.x0 + CIVIC_SITE.x, x1 = v.x1 + CIVIC_SITE.x,
    z0 = v.z0 + CIVIC_SITE.z, z1 = v.z1 + CIVIC_SITE.z;
  return venueTurn(kind)===-1 ? [
    {x0:x0-1,x1:x1+1,z0:z1,z1:TOWN_BOUNDS.z0-8.5},
  ] : [{ x0: x0 - 1, x1: x1 + 1, z0: z0 - 2.8, z1: z0 }];
});
