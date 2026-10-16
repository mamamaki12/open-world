// 隣り合う2つの土地をつなげて1つの土地にするときの、家の設計図の合わせ方
import { GRID } from './dimensions';
import type { House } from './types';

/** 家を x 方向に dx マスずらす（壁・床・屋根・階段はマス、家具は m） */
export function shiftHouse(h: House, dx: number): House {
  if (dx === 0) return h;
  return {
    ...h,
    floors: h.floors.map((f) => ({ ...f, x0: f.x0 + dx, x1: f.x1 + dx })),
    walls: h.walls.map((w) => ({ ...w, x0: w.x0 + dx, x1: w.x1 + dx })),
    stairs: h.stairs.map((s) => ({ ...s, x: s.x + dx })),
    roofs: h.roofs.map((r) => ({ ...r, x0: r.x0 + dx, x1: r.x1 + dx })),
    furniture: h.furniture.map((f) => ({ ...f, x: +(f.x + dx * GRID).toFixed(3) })),
    // 窓・ドアは壁からの位置なのでそのまま
  };
}

/** 部品の id に印を付けて、もう片方の家の id と重ならないようにする */
export function prefixIds(h: House, tag: string): House {
  const id = (s: string) => `${tag}${s}`;
  return {
    ...h,
    floors: h.floors.map((f) => ({ ...f, id: id(f.id) })),
    walls: h.walls.map((w) => ({ ...w, id: id(w.id) })),
    openings: h.openings.map((o) => ({ ...o, id: id(o.id), wallId: id(o.wallId) })),
    stairs: h.stairs.map((s) => ({ ...s, id: id(s.id) })),
    roofs: h.roofs.map((r) => ({ ...r, id: id(r.id) })),
    furniture: h.furniture.map((f) => ({
      ...f,
      id: id(f.id),
      ...(f.wallMount ? { wallMount: { ...f.wallMount, wallId: id(f.wallMount.wallId) } } : {}),
    })),
  };
}

/** 西の家 a に、dx マス東へずらした家 b を足して1つの家にする（どちらかが null ならもう片方だけ） */
export function mergeHouses(a: House | null, b: House | null, dx: number): House | null {
  if (!b) return a;
  const east = shiftHouse(prefixIds(b, 'j-'), dx);
  if (!a) return east;
  return {
    ...a,
    floors: [...a.floors, ...east.floors],
    walls: [...a.walls, ...east.walls],
    openings: [...a.openings, ...east.openings],
    stairs: [...a.stairs, ...east.stairs],
    roofs: [...a.roofs, ...east.roofs],
    furniture: [...a.furniture, ...east.furniture],
  };
}
