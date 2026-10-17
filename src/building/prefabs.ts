// すぐ建つお店（プレハブ店舗・屋台・テント）。プレイヤーが置くのと同じ部品だけで組み、空いている場所へ一度に置く。
// 中にレジが入っているので、置いてすぐ「お店を開く」ができる。
import { GRID } from './dimensions';
import { HouseKit, fin } from './townHouseKit';
import type { House } from './types';

export interface Prefab { id: string; name: string; desc: string; w: number; d: number }

export const PREFABS: Prefab[] = [
  { id: 'prefab-shop', name: 'プレハブ店舗', desc: '約6.4m×4.5m。ドア・窓・レジ・棚つき', w: 7, d: 5 },
  { id: 'stall', name: '屋台', desc: '約3.6m×2.7m。屋根とカウンターとレジ', w: 4, d: 3 },
  { id: 'tent', name: 'テント', desc: '約4.5m四方。布の屋根の下にレジ', w: 5, d: 5 },
];

/** その種類の部品を (x0, z0) を北西の角として作る。key は部品IDを重ならせないための文字列 */
export function prefabParts(id: string, x0: number, z0: number, key: string): House {
  const k = new HouseKit('shop-' + key);
  const cx = x0, cz = z0;
  if (id === 'prefab-shop') {
    const wall = fin('galvalume', '#e1e3e4'), inside = fin('wallpaper', '#f7f5f0');
    const b = k.box(0, x0, z0, x0 + 7, z0 + 5, wall, inside, fin('flooring', '#c8a57a'));
    k.open(b.s, 'entrance-wide', 2);
    k.windows(b.s, 'sliding', [5]);
    k.windows(b.w, 'sliding-small', [2.5]);
    k.roof(0, x0, z0, x0 + 7, z0 + 5, 'flat', fin('sheet', '#8f9294'), wall, { overhang: 0.3 });
    k.item(0, 'register', cx + 4.5, cz + 2, 0);
    k.item(0, 'shelf', cx + 1.5, cz + 0.6, 0);
    k.item(0, 'shelf', cx + 3.5, cz + 0.6, 0);
    k.item(0, 'plant', cx + 6.4, cz + 4.4, 0);
  } else if (id === 'stall') {
    k.floor(0, x0, z0, x0 + 4, z0 + 3, fin('deck', '#a77b52'), 'terrace');
    k.wall(0, x0, z0 + 3, x0 + 4, z0 + 3, fin('woodboard', '#a0754d'), fin('woodboard', '#a0754d'), 'half');
    k.roof(0, x0, z0, x0 + 4, z0 + 3, 'shed', fin('standing', '#b5603f'), fin('woodboard', '#a0754d'), { axis: 'x', pitch: 2, overhang: 0.4 });
    k.item(0, 'register', cx + 2, cz + 1.6, 0);
  } else if (id === 'tent') {
    k.floor(0, x0, z0, x0 + 5, z0 + 5, fin('deck', '#c49a6c'), 'terrace');
    k.roof(0, x0, z0, x0 + 5, z0 + 5, 'hip', fin('sheet', '#f2efe8'), fin('sheet', '#f2efe8'), { pitch: 6, overhang: 0.2 });
    k.item(0, 'register', cx + 2.5, cz + 2.5, 0);
    k.item(0, 'plant', cx + 0.6, cz + 4.4, 0);
  }
  return k.house;
}

interface Rect { x0: number; z0: number; x1: number; z1: number }
const hit = (a: Rect, b: Rect) => a.x0 < b.x1 && b.x0 < a.x1 && a.z0 < b.z1 && b.z0 < a.z1;

/** 1階で何も置いていない場所を探す（道路側から順に）。見つからなければ null */
export function findSpot(house: House, lot: { w: number; d: number }, w: number, d: number): { x0: number; z0: number } | null {
  const used: Rect[] = [
    ...house.floors.filter(f => f.level === 0).map(f => ({ x0: Math.min(f.x0, f.x1), z0: Math.min(f.z0, f.z1), x1: Math.max(f.x0, f.x1), z1: Math.max(f.z0, f.z1) })),
    ...house.walls.filter(f => f.level === 0).map(f => ({ x0: Math.min(f.x0, f.x1) - 0.1, z0: Math.min(f.z0, f.z1) - 0.1, x1: Math.max(f.x0, f.x1) + 0.1, z1: Math.max(f.z0, f.z1) + 0.1 })),
    ...house.furniture.filter(f => f.level === 0).map(f => ({ x0: f.x / GRID - 0.6, z0: f.z / GRID - 0.6, x1: f.x / GRID + 0.6, z1: f.z / GRID + 0.6 })),
  ];
  // 道路側（z が大きい側）から探す。まわりに少しすき間を空ける
  for (let z0 = lot.d - d; z0 >= 0; z0--) {
    for (let x0 = 0; x0 + w <= lot.w; x0++) {
      const r = { x0: x0 - 0.3, z0: z0 - 0.3, x1: x0 + w + 0.3, z1: z0 + d + 0.3 };
      if (!used.some(u => hit(u, r))) return { x0, z0 };
    }
  }
  return null;
}

/** いまの家にすぐ建つお店を足した家を返す。置けなければ理由 */
export function placePrefab(house: House, id: string, lot: { w: number; d: number }, key: string): House | string {
  const p = PREFABS.find(p => p.id === id);
  if (!p) return 'その建物はありません';
  const spot = findSpot(house, lot, p.w, p.d);
  if (!spot) return `この土地に${p.name}を置ける空きがありません`;
  const add = prefabParts(id, spot.x0, spot.z0, key);
  return {
    ...house,
    floors: [...house.floors, ...add.floors], walls: [...house.walls, ...add.walls], openings: [...house.openings, ...add.openings],
    stairs: [...house.stairs, ...add.stairs], roofs: [...house.roofs, ...add.roofs], furniture: [...house.furniture, ...add.furniture],
  };
}
