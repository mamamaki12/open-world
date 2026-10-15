// 床・壁・屋根・階段・家具を置く操作と、家具のドラッグ移動。
// 今いる階の床の高さの水平面に対してマウス位置を求め、マス目に吸着させる。
import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { getFurniture } from '../catalog';
import { GRID, LOT_D, LOT_W, MAX_LEVEL, floorY } from '../building/dimensions';
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
import { useGame } from '../state/store';
import { useInteraction } from '../state/interaction';

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

export function PlacementController() {
  const { gl, camera } = useThree();

  useEffect(() => {
    const el = gl.domElement;
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let dragStart: { x: number; z: number } | null = null;

    const groundPoint = (e: PointerEvent, level: number) => {
      const r = el.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -floorY(level));
      const hit = new THREE.Vector3();
      return raycaster.ray.intersectPlane(plane, hit) ? hit : null;
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

    const updatePreview = (e: PointerEvent) => {
      const g = useGame.getState();
      const ui = useInteraction.getState();
      const p = groundPoint(e, g.activeLevel);
      if (!p) return;
      switch (g.tool) {
        case 'floor':
        case 'roof': {
          const c = cellAt(p);
          const rect = dragStart ? cellRect(dragStart, c) : cellRect(c, c);
          const valid =
            (g.tool === 'floor' ? canPlaceFloor(g.house, g.activeLevel, rect) : canPlaceRoof(g.house, g.activeLevel, rect)) === null;
          ui.setPreview({ kind: 'rect', rect, valid, tool: g.tool });
          break;
        }
        case 'wall': {
          const q = pointAt(p);
          const seg = dragStart ? axisAlignedSegment(dragStart, q) : { x0: q.x, z0: q.z, x1: q.x, z1: q.z };
          const valid = !dragStart || canPlaceWall(g.house, { level: g.activeLevel, ...seg }) === null;
          ui.setPreview({ kind: 'wall', ...seg, valid });
          break;
        }
        case 'stair': {
          const c = cellAt(p);
          const valid = canPlaceStair(g.house, { level: g.activeLevel, x: c.x, z: c.z, rot: ui.stairRot }) === null;
          ui.setPreview({ kind: 'stair', x: c.x, z: c.z, valid });
          break;
        }
        case 'furniture': {
          ui.setPreview({ kind: 'furniture', ...snapFurniture(p.x, p.z) });
          break;
        }
      }
    };

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const g = useGame.getState();
      const ui = useInteraction.getState();
      const p = groundPoint(e, g.activeLevel);
      if (!p) return;
      switch (g.tool) {
        case 'floor':
        case 'roof':
          dragStart = cellAt(p);
          updatePreview(e);
          break;
        case 'wall':
          dragStart = pointAt(p);
          updatePreview(e);
          break;
        case 'stair': {
          const c = cellAt(p);
          const stair = { level: g.activeLevel, x: c.x, z: c.z, rot: ui.stairRot };
          const err = canPlaceStair(g.house, stair);
          if (err) return g.notify(err);
          g.commit({ ...g.house, stairs: [...g.house.stairs, { id: newId('stair'), ...stair, finish: g.defaults.stairFinish }] });
          updatePreview(e);
          break;
        }
        case 'furniture': {
          const pos = snapFurniture(p.x, p.z);
          const item = {
            id: newId('furniture'),
            level: g.activeLevel,
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
      if (useInteraction.getState().furnitureDrag) {
        useInteraction.getState().setFurnitureDrag(null);
        useGame.getState().endDrag();
        return;
      }
      if (e.button !== 0 || !dragStart) return;
      const g = useGame.getState();
      const p = groundPoint(e, g.activeLevel);
      const start = dragStart;
      dragStart = null;
      if (!p) return;
      if (g.tool === 'floor' || g.tool === 'roof') {
        const rect = cellRect(start, cellAt(p));
        if (g.tool === 'floor') {
          const err = canPlaceFloor(g.house, g.activeLevel, rect);
          if (err) {
            // 上の階に張るつもりで、階を切り替え忘れていることが多い
            const upper = g.activeLevel + 1;
            if (upper <= MAX_LEVEL && canPlaceFloor(g.house, upper, rect) === null && err === 'すでに床があります') {
              return g.notify(`${upper}階にはもう床があります。${upper + 1}階の床は、画面下の「作業する階」で ${upper + 1}階 を選ぶ（キー ${upper + 1}）と張れます`);
            }
            return g.notify(err);
          }
          g.commit({ ...g.house, floors: [...g.house.floors, { id: newId('floor'), level: g.activeLevel, ...rect, finish: g.defaults.floor }] });
        } else {
          const err = canPlaceRoof(g.house, g.activeLevel, rect);
          if (err) return g.notify(err);
          const d = g.defaults;
          const axis = rect.x1 - rect.x0 >= rect.z1 - rect.z0 ? 'x' : 'z';
          g.commit({
            ...g.house,
            roofs: [
              ...g.house.roofs,
              {
                id: newId('roof'),
                level: g.activeLevel,
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
        const err = canPlaceWall(g.house, { level: g.activeLevel, ...seg });
        if (err) return g.notify(err);
        g.commit({
          ...g.house,
          walls: [
            ...g.house.walls,
            { id: newId('wall'), level: g.activeLevel, ...seg, exterior: g.defaults.wallExterior, interior: g.defaults.wallInterior },
          ],
        });
      }
      updatePreview(e);
    };

    const onLeave = () => {
      if (!dragStart && !useInteraction.getState().furnitureDrag) useInteraction.getState().setPreview(null);
    };

    el.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      el.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, [gl, camera]);

  // ツールを持ち替えたらプレビューを消す
  const tool = useGame((s) => s.tool);
  useEffect(() => {
    useInteraction.getState().setPreview(null);
  }, [tool]);

  return null;
}
