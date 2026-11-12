// 床・壁・屋根・階段・家具を置く操作と、家具のドラッグ移動。
// 置く階は決めておかず、マウスの下にあるもの（地面・床・壁の上）から自動で決める。
// その面の高さの水平面に対してマウス位置を求め、マス目に吸着させる。
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { getFurniture } from '../catalog';
import { designOf } from '../catalog/designs';
import { GRID, lotSize, MAX_LEVEL } from '../building/dimensions';
import { editTargetAt, switchEditTarget, targetLabel } from '../state/editAnywhere';
import {
  axisAlignedSegment,
  canPlaceRoof,
  canPlaceStair,
  canPlaceWall,
  newId,
  partsInRect,
  normalizeRect,
} from '../building/rules';
import type { Rect } from '../building/rules';
import type { House } from '../building/types';
import { touchGesture, reservesTouch, placingTool } from '../state/gestures';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useGame } from '../state/store';
import { useInteraction } from '../state/interaction';
import { snapFurniturePlacement } from '../building/furnitureSnap';
import { moveBuildingGroup } from '../building/groups';
import { aimBuilding } from './aimMode';
import { placementPoint } from './placementRay';
import { floorPlacementPlan } from '../building/floorPlacement';
import { hasRoomCeiling } from '../building/roomLighting';
import { floorPointerLevel, pointerSurfaceLevel } from './placementSurface';
import { blockWallSegment } from '../building/singleBlock';

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
/** 歩く画面では床・壁・屋根を1ブロックずつ置く（範囲のドラッグは建築の画面だけ） */
const singleBlock = () => {
  const g = useGame.getState();
  return g.mode === 'walk' && (g.tool === 'floor' || g.tool === 'wall' || g.tool === 'roof');
};

/** その階の（高さのある）壁が囲む範囲。壁がなければ null */
function wallBounds(house: House, level: number): Rect | null {
  const ws = house.walls.filter((w) => w.level === level && (!w.height || w.height === 'full'));
  if (!ws.length) return null;
  return {
    x0: Math.min(...ws.map((w) => Math.min(w.x0, w.x1))),
    z0: Math.min(...ws.map((w) => Math.min(w.z0, w.z1))),
    x1: Math.max(...ws.map((w) => Math.max(w.x0, w.x1))),
    z1: Math.max(...ws.map((w) => Math.max(w.z0, w.z1))),
  };
}

export function PlacementController() {
  const { gl, camera, scene } = useThree();
  const controls = useThree((s) => s.controls) as unknown as OrbitControlsImpl | null;
  const controlsRef = useRef(controls);
  controlsRef.current = controls;
  /** 歩きながら建てるとき、マウスを動かさなくても体の移動に合わせてプレビューを追従させる */
  const refresh = useRef<(() => void) | null>(null);

  useEffect(() => {
    const el = gl.domElement;
    let dragStart: { x: number; z: number } | null = null;
    /** ドラッグを始めたときの面の階（ドラッグ中は変えない） */
    let dragSurface = 0;
    /** まとめて消す範囲のドラッグを始めた画面の位置（クリックとドラッグを見分ける） */
    let eraseFrom: { x: number; y: number } | null = null;
    // 指で触っているもの。2本目が触れたら、置く操作をやめてカメラの操作にゆずる
    const touches = new Set<number>();
    /** 置く操作をしている指（マウスなら null） */
    let activeTouch: number | null = null;
    /** 指でタップして置くもの（階段・家具）は、離したときに置く */
    let tap: { x: number; y: number } | null = null;
    /** 指でほかの区画に触れたとき、離すまで切り替えを待つ（滑らせたら画面を回しただけなので切り替えない） */
    let switchTap: { x: number; y: number; id: number; target: ReturnType<typeof editTargetAt> } | null = null;
    const switchTo = (target: ReturnType<typeof editTargetAt>) => {
      const err = switchEditTarget(target, () => useGame.getState().notify(`${targetLabel(target).replace(/に置く$/, '')}に切り替えました。もう一度タップして置いてください`));
      if (err) useGame.getState().notify(err);
    };
    const cancelTouch = () => {
      switchTap = null;
      dragStart = null;
      eraseFrom = null;
      tap = null;
      activeTouch = null;
      const game = useGame.getState();
      if (game.dragBase) game.dragTo(game.dragBase);
      if (useInteraction.getState().buildingDrag) {
        useInteraction.setState({ buildingDrag: null });
        useGame.getState().endDrag();
      }
      if (useInteraction.getState().furnitureDrag) {
        useInteraction.getState().setFurnitureDrag(null);
        useGame.getState().endDrag();
      }
      useInteraction.getState().setPreview(null);
    };

    const groundPoint = (e: PointerEvent, level: number) => {
      const g=useGame.getState();
      const grounded = g.tool === 'erase' || g.tool === 'select' && !useInteraction.getState().buildingDrag && !useInteraction.getState().furnitureDrag || (g.tool==='wall' && (g.defaults.wallHeight==='fence'||g.defaults.wallHeight==='privacyFence')) ||
        (g.tool==='furniture' && getFurniture(g.defaults.furnitureType).grounded);
      return placementPoint(camera, el.getBoundingClientRect(), e.clientX, e.clientY, level, grounded?0:undefined);
    };
    /** マウスの下にある面の階。地面なら0、床の上ならその階、壁の上なら一つ上の階 */
    const pickSurface = (e: PointerEvent): number => {
      return pointerSurfaceLevel(camera, el.getBoundingClientRect(), e.clientX, e.clientY, scene.getObjectByName('house'));
    };
    const cellAt = (p: THREE.Vector3) => ({
      x: clamp(Math.floor(p.x / GRID), 0, lotSize.w - 1),
      z: clamp(Math.floor(p.z / GRID), 0, lotSize.d - 1),
    });
    const pointAt = (p: THREE.Vector3) => ({
      x: clamp(Math.round(p.x / GRID), 0, lotSize.w),
      z: clamp(Math.round(p.z / GRID), 0, lotSize.d),
    });
    const cellRect = (a: { x: number; z: number }, b: { x: number; z: number }): Rect => {
      const r = normalizeRect({ x0: a.x, z0: a.z, x1: b.x, z1: b.z });
      return { ...r, x1: r.x1 + 1, z1: r.z1 + 1 };
    };
    /** 1マス分の壁の線（土地の中に寄せる） */
    const blockWall = (p: THREE.Vector3) => {
      const s = blockWallSegment(p.x, p.z);
      const dx = clamp(s.x0, 0, lotSize.w - (s.x1 - s.x0)) - s.x0, dz = clamp(s.z0, 0, lotSize.d - (s.z1 - s.z0)) - s.z0;
      return { x0: s.x0 + dx, z0: s.z0 + dz, x1: s.x1 + dx, z1: s.z1 + dz };
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
    const surfaceAt = (e: PointerEvent) => {
      if (dragStart) return dragSurface;
      const g = useGame.getState();
      if (g.tool === 'erase' || g.tool === 'select') return 0;
      if (g.tool === 'wall' && (g.defaults.wallHeight === 'fence' || g.defaults.wallHeight === 'privacyFence')) return 0;
      if (g.tool === 'furniture' && getFurniture(g.defaults.furnitureType).grounded) return 0;
      if (g.tool === 'roof') return roofSurface(e);
      return g.tool === 'floor'
        ? floorPointerLevel(g.house, camera, el.getBoundingClientRect(), e.clientX, e.clientY, scene.getObjectByName('house'))
        : pickSurface(e);
    };

    let lastPointer: PointerEvent | null = null;
    refresh.current = () => {
      if (lastPointer) updatePreview(lastPointer);
    };
    const updatePreview = (e: PointerEvent) => {
      lastPointer = e;
      const g = useGame.getState();
      const ui = useInteraction.getState();
      if (g.tool === 'furniture' && getFurniture(g.defaults.furnitureType).mount) return;
      const surface = surfaceAt(e);
      const p = groundPoint(e, surface);
      if (!p) return;
      switch (g.tool) {
        case 'erase': {
          if (dragStart && eraseFrom) ui.setPreview({ kind: 'rect', rect: cellRect(dragStart, cellAt(p)), valid: true, tool: 'erase' });
          break;
        }
        case 'floor':
        case 'roof': {
          const c = cellAt(p);
          const rect = dragStart ? cellRect(dragStart, c) : cellRect(c, c);
          const level = g.tool === 'floor' ? surface : surface - 1;
          g.setLevel(level);
          const valid =
            (g.tool === 'floor' ? floorPlacementPlan(g.house, level, rect).error : canPlaceRoof(g.house, level, rect)) === null;
          ui.setPreview({ kind: 'rect', rect, valid, tool: g.tool });
          break;
        }
        case 'wall': {
          g.setLevel(surface);
          const q = pointAt(p);
          const single = singleBlock();
          const seg = single ? blockWall(p) : dragStart ? axisAlignedSegment(dragStart, q) : { x0: q.x, z0: q.z, x1: q.x, z1: q.z };
          const valid = !(dragStart || single) || canPlaceWall(g.house, { level: surface, ...seg }) === null;
          ui.setPreview({ kind: 'wall', ...seg, valid });
          break;
        }
        case 'stair': {
          g.setLevel(surface);
          const c = cellAt(p);
          const valid = canPlaceStair(g.house, { level: surface, x: c.x, z: c.z, rot: ui.stairRot, shape: g.defaults.stairShape }) === null;
          ui.setPreview({ kind: 'stair', x: c.x, z: c.z, valid });
          break;
        }
        case 'furniture': {
          g.setLevel(surface);
          ui.setPreview({ kind: 'furniture', ...snapFurniturePlacement(g.house, { level: surface, type: g.defaults.furnitureType, rotation: g.defaults.furnitureRotation }, p.x, p.z, e.shiftKey) });
          break;
        }
      }
    };

    /**
     * 1本指を「置く」に使うか「回す」に使うかを、指が触れた瞬間に決める。
     * 置くときと同じ面・同じ点で土地の中かを見る（屋根は壁の上端で読むなど）。端から1マスは中とみなす。
     * OrbitControls より先に決めるため、キャプチャで受ける。
     */
    const reserve = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return;
      // 置いている途中に別の指が触れたときは、置く操作をやめるので回転は2本指の操作になる
      if (dragStart || tap) return;
      const g = useGame.getState();
      let inside = false;
      // ドア・窓・壁に付ける家具は、壁に触れた指を予約する（壁の上でずらして位置を決める）
      const onWallTool = g.tool === 'door' || g.tool === 'window' || (g.tool === 'furniture' && !!getFurniture(g.defaults.furnitureType).mount);
      if (onWallTool) {
        const house = scene.getObjectByName('house');
        const r = el.getBoundingClientRect();
        const ray = new THREE.Raycaster();
        ray.setFromCamera(new THREE.Vector2((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1), camera);
        inside = !!house && ray.intersectObject(house, true).some((h) => (h.object.userData.partRef as { kind?: string } | undefined)?.kind === 'wall');
      } else if (!aimBuilding()) {
        const p = groundPoint(e, surfaceAt(e));
        inside = !!p && p.x >= -GRID && p.x <= (lotSize.w + 1) * GRID && p.z >= -GRID && p.z <= (lotSize.d + 1) * GRID;
      }
      const reserves = !aimBuilding() && reservesTouch(g.tool, g.mode, g.eraseMulti, inside);
      // 真上から見る床・壁では、土地の外から触れた1本指でも画面を回さない（線を引くつもりで回ってしまうため。回すのはボタンか2本指）
      const topView = g.mode === 'build' && (g.tool === 'floor' || g.tool === 'wall');
      touchGesture.reserved = reserves || (!aimBuilding() && topView);
      touchGesture.placeable = reserves && inside;
      const c = controlsRef.current;
      if (c) c.touches.ONE = touchGesture.reserved ? (-1 as THREE.TOUCH) : THREE.TOUCH.ROTATE;
    };

    const onDown = (e: PointerEvent) => {
      if (aimBuilding()) return;
      if (e.button !== 0) return;
      if (Date.now() < useInteraction.getState().ignorePartClickUntil) return;
      if (useGame.getState().tool === 'furniture' && getFurniture(useGame.getState().defaults.furnitureType).mount) return;
      if (e.pointerType === 'touch') {
        touches.add(e.pointerId);
        if (touches.size > 1) return cancelTouch();
        activeTouch = e.pointerId;
      }
      const g = useGame.getState();
      if (g.overlay || g.tool === 'select') return;
      const surface = surfaceAt(e);
      const p = groundPoint(e, surface);
      if (!p) return;
      // ほかの区画（他人の土地・町の家・空き区画）を押したら、そこを編集先にする（次のタップから置ける）
      if (placingTool(g.tool) && (p.x < -GRID || p.z < -GRID || p.x > (lotSize.w + 1) * GRID || p.z > (lotSize.d + 1) * GRID)) {
        const target = editTargetAt(p.x, p.z);
        if (target.kind === 'lot' || target.kind === 'plot') {
          if (e.pointerType === 'touch') {
            cancelTouch();
            switchTap = { x: e.clientX, y: e.clientY, id: e.pointerId, target };
            return;
          }
          switchTo(target);
          return;
        }
      }
      // 回す指（土地の外から触れた指）では青いプレビューを出さない
      // 土地の外から触れた指では置かない（画面も回さない）
      if(e.pointerType==='touch' && placingTool(g.tool) && !touchGesture.placeable){activeTouch=null;return;}
      if (g.tool === 'furniture' || (e.pointerType === 'touch' && g.tool === 'stair') || singleBlock()) {
        tap = { x: e.clientX, y: e.clientY };
        updatePreview(e);
        return;
      }
      place(e, p, surface);
    };

    /** 床・屋根を範囲に置く。屋根は、読んだ壁の上端（surface）に載る */
    const commitRect = (tool: 'floor' | 'roof', surface: number, rect: Rect) => {
      const g = useGame.getState();
      if (tool === 'floor') {
        const level = surface;
        const plan = floorPlacementPlan(g.house, level, rect);
        if (plan.error) return g.notify(plan.error);
        const terrace = g.defaults.floorKind === 'terrace';
        const floors = plan.rects.map(r => ({ id: newId('floor'), level, ...r, finish: terrace ? g.defaults.terrace : g.defaults.floor, ...(terrace ? { kind: 'terrace' as const } : {}) }));
        g.commit({ ...g.house, floors: [...g.house.floors, ...floors] });
        return;
      }
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
    };
    const commitWall = (surface: number, seg: { x0: number; z0: number; x1: number; z1: number }) => {
      const g = useGame.getState();
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
    };

    const place = (e: PointerEvent, p: THREE.Vector3, surface: number) => {
      const g = useGame.getState();
      const ui = useInteraction.getState();
      switch (g.tool) {
        case 'erase':
          // 削除は1つずつ（パーツのクリックは usePart が受ける）。範囲では消さない
          break;
        case 'floor':
        case 'roof':
          if (singleBlock()) {
            const c = cellAt(p);
            commitRect(g.tool, surface, cellRect(c, c));
            updatePreview(e);
            break;
          }
          dragStart = cellAt(p);
          dragSurface = surface;
          updatePreview(e);
          break;
        case 'wall':
          if (singleBlock()) {
            commitWall(surface, blockWall(p));
            updatePreview(e);
            break;
          }
          dragStart = pointAt(p);
          dragSurface = surface;
          updatePreview(e);
          break;
        case 'stair': {
          const c = cellAt(p);
          const stair = { level: surface, x: c.x, z: c.z, rot: ui.stairRot, shape: g.defaults.stairShape };
          const err = canPlaceStair(g.house, stair);
          if (err) return g.notify(err);
          g.commit({ ...g.house, stairs: [...g.house.stairs, { id: newId('stair'), ...stair, finish: g.defaults.stairFinish, rail: g.defaults.stairRail }] });
          updatePreview(e);
          break;
        }
        case 'furniture': {
          // 自分の土地の外（となりの区画など）には置かない
          if (p.x < -0.5 || p.z < -0.5 || p.x > lotSize.w * GRID + 0.5 || p.z > lotSize.d * GRID + 0.5) return g.notify('自分の土地の中に置いてください');
          const pos = snapFurniturePlacement(g.house, { level: surface, type: g.defaults.furnitureType, rotation: g.defaults.furnitureRotation }, p.x, p.z, e.shiftKey);
          if(getFurniture(g.defaults.furnitureType).ceiling&&!hasRoomCeiling(g.house,surface,pos.x,pos.z))return g.notify('天井のある部屋の床を選んでください');
          const item = {
            id: newId('furniture'),
            level: surface,
            type: g.defaults.furnitureType,
            ...pos,
            rotation: g.defaults.furnitureRotation,
            color: getFurniture(g.defaults.furnitureType).colors[0],
            ...(getFurniture(g.defaults.furnitureType).label ? { label: g.defaults.nameplateText } : {}),
            ...designOf(g.defaults.furnitureType),
          };
          g.commit({ ...g.house, furniture: [...g.house.furniture, item] });
          useInteraction.setState({ ignorePartClickUntil: Date.now() + 100 });
          g.setTool('select');
          g.select({ kind: 'furniture', id: item.id });
          ui.setPreview(null);
          break;
        }
      }
    };

    const onMove = (e: PointerEvent) => {
      if (aimBuilding()) return;
      const building = useInteraction.getState().buildingDrag;
      if (building) {
        if (Math.hypot(e.clientX - building.startX, e.clientY - building.startY) < 5) return;
        const game = useGame.getState();
        if (!game.dragBase) return;
        const p = groundPoint(e, building.level);
        if (!p) return;
        const dx = Math.round((p.x - building.x) / GRID), dz = Math.round((p.z - building.z) / GRID);
        if (dx === building.dx && dz === building.dz) return;
        const result = moveBuildingGroup(game.dragBase, building.refs, dx, dz);
        useInteraction.setState({ buildingDrag: { ...building, dx, dz, error: result.error } });
        if (!result.error) game.dragTo(result.house);
        return;
      }
      if (e.pointerType === 'touch' && activeTouch !== e.pointerId && !useInteraction.getState().furnitureDrag) return;
      const drag = useInteraction.getState().furnitureDrag;
      if (drag) {
        if (Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) < 5) return;
        const g = useGame.getState();
        const item = g.house.furniture.find((f) => f.id === drag.id);
        if (!item) return;
        const p = groundPoint(e, item.level);
        if (!p) return;
        const pos = snapFurniturePlacement(g.house, item, p.x - drag.dx, p.z - drag.dz, e.shiftKey);
        if (pos.x === item.x && pos.z === item.z) return;
        g.dragTo({ ...g.house, furniture: g.house.furniture.map((f) => (f.id === item.id ? { ...f, ...pos } : f)) });
        return;
      }
      if (e.target === el || dragStart) updatePreview(e);
    };

    const onUp = (e: PointerEvent) => {
      if (aimBuilding()) return;
      const pendingErase = useInteraction.getState().pendingErase;
      if (pendingErase) {
        useInteraction.setState({ pendingErase: null });
        if (Math.hypot(e.clientX - pendingErase.x, e.clientY - pendingErase.y) <= 5) {
          const game = useGame.getState();
          if (game.tool === 'erase' && game.eraseMulti) game.toggleMark(pendingErase.ref);
          else if (game.tool === 'erase') game.eraseOne(pendingErase.ref);
        }
        // 別の所有地を選んだ直後も、ドラッグなら範囲選択の終了処理へ進む。
        if (!dragStart) return;
      }
      const building = useInteraction.getState().buildingDrag;
      if (building) {
        touches.delete(e.pointerId);
        activeTouch = null;
        dragStart = null;
        eraseFrom = null;
        tap = null;
        useInteraction.getState().setPreview(null);
        useInteraction.setState({ buildingDrag: null, ignorePartClickUntil: Date.now() + 100 });
        useGame.getState().endDrag();
        if (building.error) useGame.getState().notify(building.error);
        return;
      }
      if (e.pointerType !== 'touch' && tap) {
        const moved = Math.hypot(e.clientX - tap.x, e.clientY - tap.y) > 12;
        tap = null;
        const surface = singleBlock() ? surfaceAt(e) : pickSurface(e);
        const p = groundPoint(e, surface);
        if (!moved && p) place(e, p, surface);
        return;
      }
      if (e.pointerType === 'touch' && switchTap?.id === e.pointerId) {
        const st = switchTap;
        switchTap = null;
        touches.delete(e.pointerId);
        if (Math.hypot(e.clientX - st.x, e.clientY - st.y) <= 12) switchTo(st.target);
        return;
      }
      if (e.pointerType === 'touch') {
        const mine = activeTouch === e.pointerId;
        touches.delete(e.pointerId);
        if (!mine && !useInteraction.getState().furnitureDrag) return;
        activeTouch = null;
        if (tap) {
          // 土地の中で触れた指は、ずらした先（離した場所）に置く。土地の外から触れた指は見回すつもりなので、滑らせたら置かない
          const moved = !touchGesture.placeable && Math.hypot(e.clientX - tap.x, e.clientY - tap.y) > 12;
          tap = null;
          const surface = singleBlock() ? surfaceAt(e) : pickSurface(e);
          const p = groundPoint(e, surface);
          if (!moved && p) place(e, p, surface);
          return;
        }
      }
      if (useInteraction.getState().furnitureDrag) {
        dragStart = null;
        eraseFrom = null;
        tap = null;
        useInteraction.getState().setPreview(null);
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
      if (g.tool === 'erase' || g.tool === 'select') {
        const from = eraseFrom;
        eraseFrom = null;
        useInteraction.getState().setPreview(null);
        if (p && from && Math.hypot(e.clientX - from.x, e.clientY - from.y) > 8) {
          // 「1つずつ」のときに範囲で選んだら、「まとめて選ぶ」に切り替えて選んだものを見せる
          const rect = cellRect(start, cellAt(p));
          let refs = partsInRect(g.house, rect);
          if (g.tool === 'select') {
            // 開口部・壁付け家具は、取り付けた壁が同時に選ばれていないと移動できない。
            // 削除ツールではそのまま消せるよう残すが、選択ツールの一括移動では親壁ごと選ぶ。
            const selectedWalls = new Set(refs.filter((r) => r.kind === 'wall').map((r) => r.id));
            refs = refs.filter((r) => {
              if (r.kind === 'opening') {
                const wallId = g.house.openings.find((o) => o.id === r.id)?.wallId;
                return wallId && selectedWalls.has(wallId);
              }
              if (r.kind === 'furniture') {
                const wallId = g.house.furniture.find((f) => f.id === r.id)?.wallMount?.wallId;
                return !wallId || selectedWalls.has(wallId);
              }
              return true;
            });
            g.addMarks(refs);
            useGame.getState().select(useGame.getState().marked[0] ?? null);
          }
          useInteraction.setState({ ignorePartClickUntil: Date.now() + 150 });
        }
        return;
      }
      if (!p) return;
      if (g.tool === 'floor' || g.tool === 'roof') commitRect(g.tool, surface, cellRect(start, cellAt(p)));
      else if (g.tool === 'wall') commitWall(surface, axisAlignedSegment(start, pointAt(p)));
      updatePreview(e);
    };

    const onLeave = () => {
      lastPointer = null;
      if (!dragStart && !useInteraction.getState().furnitureDrag) useInteraction.getState().setPreview(null);
    };

    const onCancel = (e: PointerEvent) => {
      useInteraction.setState({ pendingErase: null });
      touches.delete(e.pointerId);
      if (switchTap?.id === e.pointerId) switchTap = null;
      if (activeTouch === e.pointerId || dragStart || useInteraction.getState().buildingDrag || useInteraction.getState().furnitureDrag) cancelTouch();
    };

    const cancel = () => { touches.clear(); cancelTouch(); useInteraction.setState({ pendingErase: null }); };
    const unsubscribe = useGame.subscribe((s, prev) => {
      if (s.tool !== prev.tool || s.mode !== prev.mode || s.overlay !== prev.overlay || s.eraseMulti !== prev.eraseMulti || s.boxSelect !== prev.boxSelect) cancel();
    });

    el.addEventListener('pointerdown', reserve, true);
    el.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    el.addEventListener('pointerleave', onLeave);
    window.addEventListener('blur', cancel);
    return () => {
      unsubscribe();
      window.removeEventListener('blur', cancel);
      el.removeEventListener('pointerdown', reserve, true);
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
    if (!aimBuilding() && g.mode === 'walk' && g.tool !== 'select' && g.tool !== 'erase') refresh.current?.();
  });

  // ツールを持ち替えたらプレビューを消す
  const tool = useGame((s) => s.tool);
  useEffect(() => {
    useInteraction.getState().setPreview(null);
  }, [tool]);

  return null;
}

