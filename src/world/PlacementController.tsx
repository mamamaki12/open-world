// 床・壁・屋根・階段・家具を置く操作と、家具のドラッグ移動。
// 置く階は決めておかず、マウスの下にあるもの（地面・床・壁の上）から自動で決める。
// その面の高さの水平面に対してマウス位置を求め、マス目に吸着させる。
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { getFurniture } from '../catalog';
import { BASE_HEIGHT, GRID, LOT_D, LOT_W, MAX_LEVEL, STORY_HEIGHT, floorY } from '../building/dimensions';
import {
  axisAlignedSegment,
  canPlaceFloor,
  canPlaceRoof,
  canPlaceStair,
  canPlaceWall,
  newId,
  normalizeRect,
  snapFurniture,
} from '../building/rules';
import type { Rect } from '../building/rules';
import type { House } from '../building/types';
import { useGame } from '../state/store';
import { useInteraction } from '../state/interaction';

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

/** 床を張る階：マウスの下の面の階から上へ順に、張れる階を探す（1階の床の上でドラッグしても2階の床になる） */
function floorLevel(house: House, surface: number, rect: Rect): number {
  for (let l = surface; l <= MAX_LEVEL; l++) if (canPlaceFloor(house, l, rect) === null) return l;
  return surface;
}

/** その階の（高さのある）壁が囲む範囲。壁がなければ null */
function wallBounds(house: House, level: number): Rect | null {
  const ws = house.walls.filter((w) => w.level === level && w.height !== 'half');
  if (!ws.length) return null;
  return {
    x0: Math.min(...ws.map((w) => Math.min(w.x0, w.x1))),
    z0: Math.min(...ws.map((w) => Math.min(w.z0, w.z1))),
    x1: Math.max(...ws.map((w) => Math.max(w.x0, w.x1))),
    z1: Math.max(...ws.map((w) => Math.max(w.z0, w.z1))),
  };
}

/** 当たったメッシュが、見えている不透明なものか（プレビューやガラスは除く） */
function solid(o: THREE.Object3D): boolean {
  const m = (o as THREE.Mesh).material;
  if (!m) return false;
  return (Array.isArray(m) ? m : [m]).some((x) => !x.transparent || x.opacity >= 0.99);
}

export function PlacementController() {
  const { gl, camera, scene } = useThree();
  /** 歩きながら建てるとき、マウスを動かさなくても体の移動に合わせてプレビューを追従させる */
  const refresh = useRef<(() => void) | null>(null);

  useEffect(() => {
    const el = gl.domElement;
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let dragStart: { x: number; z: number } | null = null;
    /** ドラッグを始めたときの面の階（ドラッグ中は変えない） */
    let dragSurface = 0;
    // 指で触っているもの。2本目が触れたら、置く操作をやめてカメラの操作にゆずる
    const touches = new Set<number>();
    /** 置く操作をしている指（マウスなら null） */
    let activeTouch: number | null = null;
    /** 指でタップして置くもの（階段・家具）は、離したときに置く */
    let tap: { x: number; y: number } | null = null;
    const cancelTouch = () => {
      dragStart = null;
      tap = null;
      activeTouch = null;
      useInteraction.getState().setPreview(null);
    };

    const groundPoint = (e: PointerEvent, level: number) => {
      const r = el.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -floorY(level));
      const hit = new THREE.Vector3();
      return raycaster.ray.intersectPlane(plane, hit) ? hit : null;
    };
    /** マウスの下にある面の階。地面なら0、床の上ならその階、壁の上なら一つ上の階 */
    const pickSurface = (e: PointerEvent): number => {
      const r = el.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const house = scene.getObjectByName('house');
      const hit = house ? raycaster.intersectObject(house, true).find((h) => solid(h.object)) : undefined;
      const ground = raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), new THREE.Vector3());
      if (!hit || (ground && ground.distanceTo(raycaster.ray.origin) < hit.distance)) return 0;
      return clamp(Math.floor((hit.point.y - BASE_HEIGHT + 0.15) / STORY_HEIGHT), 0, MAX_LEVEL);
    };
    const cellAt = (p: THREE.Vector3) => ({
      x: clamp(Math.floor(p.x / GRID), 0, LOT_W - 1),
      z: clamp(Math.floor(p.z / GRID), 0, LOT_D - 1),
    });
    const pointAt = (p: THREE.Vector3) => ({
      x: clamp(Math.round(p.x / GRID), 0, LOT_W),
      z: clamp(Math.round(p.z / GRID), 0, LOT_D),
    });
    const cellRect = (a: { x: number; z: number }, b: { x: number; z: number }): Rect => {
      const r = normalizeRect({ x0: a.x, z0: a.z, x1: b.x, z1: b.z });
      return { ...r, x1: r.x1 + 1, z1: r.z1 + 1 };
    };

    /**
     * 屋根は壁の上端に載るので、カーソルは地面や床ではなく壁の上端の高さの面で読む
     * （でないと、斜めから見たときに屋根がカーソルからずれた所に出る）。
     * 上の階から順に、その階の壁の上端の面でカーソルがその階の部屋（床、なければ壁の囲む範囲）の上に来るかを見て、来た階に載せる。
     * 返すのは groundPoint に渡す階（屋根の階 + 1 の床の高さ = 壁の上端）
     */
    const roofSurface = (e: PointerEvent): number => {
      const house = useGame.getState().house;
      for (let l = MAX_LEVEL; l >= 0; l--) {
        const b = wallBounds(house, l);
        const p = b && groundPoint(e, l + 1);
        if (!b || !p) continue;
        const gx = p.x / GRID;
        const gz = p.z / GRID;
        const inside = (r: Rect) => gx >= r.x0 && gx <= r.x1 && gz >= r.z0 && gz <= r.z1;
        // その階に床があれば床の上（L字の2階のへこみには載せない）、なければ壁の囲む範囲
        const floors = house.floors.filter((f) => f.level === l);
        if (floors.length ? floors.some(inside) : inside(b)) return l + 1;
      }
      // どの壁の範囲にも入らない：壁のある一番下の階（壁がなければ1階）の上端
      for (let l = 0; l <= MAX_LEVEL; l++) if (wallBounds(house, l)) return l + 1;
      return 1;
    };
    /** 置く位置を読む面の階。ドラッグ中は始めたときの面のまま */
    const surfaceAt = (e: PointerEvent) =>
      dragStart ? dragSurface : useGame.getState().tool === 'roof' ? roofSurface(e) : pickSurface(e);

    let lastPointer: PointerEvent | null = null;
    refresh.current = () => {
      if (lastPointer) updatePreview(lastPointer);
    };
    const updatePreview = (e: PointerEvent) => {
      lastPointer = e;
      const g = useGame.getState();
      const ui = useInteraction.getState();
      const surface = surfaceAt(e);
      const p = groundPoint(e, surface);
      if (!p) return;
      switch (g.tool) {
        case 'floor':
        case 'roof': {
          const c = cellAt(p);
          const rect = dragStart ? cellRect(dragStart, c) : cellRect(c, c);
          const level = g.tool === 'floor' ? floorLevel(g.house, surface, rect) : surface - 1;
          g.setLevel(level);
          const valid =
            (g.tool === 'floor' ? canPlaceFloor(g.house, level, rect) : canPlaceRoof(g.house, level, rect)) === null;
          ui.setPreview({ kind: 'rect', rect, valid, tool: g.tool });
          break;
        }
        case 'wall': {
          g.setLevel(surface);
          const q = pointAt(p);
          const seg = dragStart ? axisAlignedSegment(dragStart, q) : { x0: q.x, z0: q.z, x1: q.x, z1: q.z };
          const valid = !dragStart || canPlaceWall(g.house, { level: surface, ...seg }) === null;
          ui.setPreview({ kind: 'wall', ...seg, valid });
          break;
        }
        case 'stair': {
          g.setLevel(surface);
          const c = cellAt(p);
          const valid = canPlaceStair(g.house, { level: surface, x: c.x, z: c.z, rot: ui.stairRot }) === null;
          ui.setPreview({ kind: 'stair', x: c.x, z: c.z, valid });
          break;
        }
        case 'furniture': {
          g.setLevel(surface);
          ui.setPreview({ kind: 'furniture', ...snapFurniture(p.x, p.z) });
          break;
        }
      }
    };

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      if (e.pointerType === 'touch') {
        touches.add(e.pointerId);
        if (touches.size > 1) return cancelTouch();
        activeTouch = e.pointerId;
      }
      const g = useGame.getState();
      const surface = surfaceAt(e);
      const p = groundPoint(e, surface);
      if (!p) return;
      if (e.pointerType === 'touch' && (g.tool === 'stair' || g.tool === 'furniture')) {
        tap = { x: e.clientX, y: e.clientY };
        updatePreview(e);
        return;
      }
      place(e, p, surface);
    };

    const place = (e: PointerEvent, p: THREE.Vector3, surface: number) => {
      const g = useGame.getState();
      const ui = useInteraction.getState();
      switch (g.tool) {
        case 'floor':
        case 'roof':
          dragStart = cellAt(p);
          dragSurface = surface;
          updatePreview(e);
          break;
        case 'wall':
          dragStart = pointAt(p);
          dragSurface = surface;
          updatePreview(e);
          break;
        case 'stair': {
          const c = cellAt(p);
          const stair = { level: surface, x: c.x, z: c.z, rot: ui.stairRot };
          const err = canPlaceStair(g.house, stair);
          if (err) return g.notify(err);
          g.commit({ ...g.house, stairs: [...g.house.stairs, { id: newId('stair'), ...stair, finish: g.defaults.stairFinish, rail: g.defaults.stairRail }] });
          updatePreview(e);
          break;
        }
        case 'furniture': {
          const pos = snapFurniture(p.x, p.z);
          const item = {
            id: newId('furniture'),
            level: surface,
            type: g.defaults.furnitureType,
            ...pos,
            rotation: g.defaults.furnitureRotation,
            color: getFurniture(g.defaults.furnitureType).colors[0],
          };
          g.commit({ ...g.house, furniture: [...g.house.furniture, item] });
          break;
        }
      }
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch' && activeTouch !== e.pointerId && !useInteraction.getState().furnitureDrag) return;
      const drag = useInteraction.getState().furnitureDrag;
      if (drag) {
        const g = useGame.getState();
        const item = g.house.furniture.find((f) => f.id === drag.id);
        if (!item) return;
        const p = groundPoint(e, item.level);
        if (!p) return;
        const pos = snapFurniture(p.x - drag.dx, p.z - drag.dz);
        if (pos.x === item.x && pos.z === item.z) return;
        g.dragTo({ ...g.house, furniture: g.house.furniture.map((f) => (f.id === item.id ? { ...f, ...pos } : f)) });
        return;
      }
      if (e.target === el || dragStart) updatePreview(e);
    };

    const onUp = (e: PointerEvent) => {
      if (e.pointerType === 'touch') {
        const mine = activeTouch === e.pointerId;
        touches.delete(e.pointerId);
        if (!mine && !useInteraction.getState().furnitureDrag) return;
        activeTouch = null;
        if (tap) {
          // 少しでも指を滑らせたら置かない（見回すつもりだったかもしれない）
          const moved = Math.hypot(e.clientX - tap.x, e.clientY - tap.y) > 12;
          tap = null;
          const surface = pickSurface(e);
          const p = groundPoint(e, surface);
          if (!moved && p) place(e, p, surface);
          return;
        }
      }
      if (useInteraction.getState().furnitureDrag) {
        useInteraction.getState().setFurnitureDrag(null);
        useGame.getState().endDrag();
        return;
      }
      if (e.button !== 0 || !dragStart) return;
      const g = useGame.getState();
      const surface = dragSurface;
      const p = groundPoint(e, surface);
      const start = dragStart;
      dragStart = null;
      if (!p) return;
      if (g.tool === 'floor' || g.tool === 'roof') {
        const rect = cellRect(start, cellAt(p));
        if (g.tool === 'floor') {
          const level = floorLevel(g.house, surface, rect);
          const err = canPlaceFloor(g.house, level, rect);
          if (err) return g.notify(err);
          g.commit({ ...g.house, floors: [...g.house.floors, { id: newId('floor'), level, ...rect, finish: g.defaults.floor }] });
        } else {
          // 屋根は、ドラッグを始めたときにカーソルが読んでいた壁の上端に載る
          const level = surface - 1;
          const err = canPlaceRoof(g.house, level, rect);
          if (err) return g.notify(err);
          const d = g.defaults;
          const axis = rect.x1 - rect.x0 >= rect.z1 - rect.z0 ? 'x' : 'z';
          g.commit({
            ...g.house,
            roofs: [
              ...g.house.roofs,
              {
                id: newId('roof'),
                level,
                ...rect,
                type: d.roofType,
                axis,
                flip: false,
                pitch: d.roofType === 'flat' ? 0 : d.roofPitch,
                overhang: d.roofType === 'flat' ? 0 : d.roofOverhang,
                finish: d.roofType === 'flat' ? { material: 'sheet', color: '#8f9294' } : d.roofFinish,
                gableFinish: d.wallExterior,
              },
            ],
          });
        }
      } else if (g.tool === 'wall') {
        const seg = axisAlignedSegment(start, pointAt(p));
        if (seg.x0 === seg.x1 && seg.z0 === seg.z1) return;
        const err = canPlaceWall(g.house, { level: surface, ...seg });
        if (err) return g.notify(err);
        g.commit({
          ...g.house,
          walls: [
            ...g.house.walls,
            { id: newId('wall'), level: surface, ...seg, exterior: g.defaults.wallExterior, interior: g.defaults.wallInterior, height: g.defaults.wallHeight },
          ],
        });
      }
      updatePreview(e);
    };

    const onLeave = () => {
      lastPointer = null;
      if (!dragStart && !useInteraction.getState().furnitureDrag) useInteraction.getState().setPreview(null);
    };

    const onCancel = (e: PointerEvent) => {
      touches.delete(e.pointerId);
      if (activeTouch === e.pointerId) cancelTouch();
    };

    el.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      el.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      el.removeEventListener('pointerleave', onLeave);
      refresh.current = null;
    };
  }, [gl, camera, scene]);

  useFrame(() => {
    const g = useGame.getState();
    if (g.mode === 'walk' && g.tool !== 'select' && g.tool !== 'erase') refresh.current?.();
  });

  // ツールを持ち替えたらプレビューを消す
  const tool = useGame((s) => s.tool);
  useEffect(() => {
    useInteraction.getState().setPreview(null);
  }, [tool]);

  return null;
}
