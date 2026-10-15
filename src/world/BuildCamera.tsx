// 建築モードのカメラをキーで動かす：WASD / 矢印で前後左右、Q / E で回る、Shift で速く。
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { GRID, LOT_D, LOT_W } from '../building/dimensions';
import { useGame } from '../state/store';
import { useInteraction } from '../state/interaction';
import { touchCamera } from '../state/touch';
import { useTouchDevice } from '../ui/useTouchDevice';
import { useBuildView } from '../state/lotEditing';

export const CAMERA_KEYS = {
  forward: ['KeyW', 'ArrowUp'],
  back: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  turnLeft: ['KeyQ'],
  turnRight: ['KeyE'],
  fast: ['ShiftLeft', 'ShiftRight'],
};
const ARROWS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
/** 注視点が土地から離れすぎないように（m） */
const MARGIN = 30;
const TURN_SPEED = 1.6;

export function BuildCamera() {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as unknown as OrbitControlsImpl | null;
  const keys = useRef(new Set<string>());
  const touch = useTouchDevice();
  const tool = useGame((s) => s.tool);
  const mode = useGame((s) => s.mode);
  const preciseTouch = touch && mode === 'build' && (tool === 'floor' || tool === 'wall');
  const focusVersion = useBuildView((s) => s.focusVersion);
  const focused = useRef(focusVersion);
  // 真上からなら床・壁の高さで画面上の位置がずれず、指の真下に配置できる。
  useEffect(() => {
    if (!preciseTouch || !controls) return;
    const position = camera.position.clone();
    const target = controls.target.clone();
    const height = Math.max(12, position.distanceTo(target));
    camera.position.set(target.x, target.y + height, target.z + 0.001);
    camera.lookAt(target);
    controls.update();
    return () => {
      camera.position.copy(position);
      controls.target.copy(target);
      camera.lookAt(target);
      controls.update();
    };
  }, [preciseTouch, camera, controls]);

  useEffect(() => {
    if (!controls || mode !== 'build' || focusVersion === focused.current) return;
    focused.current = focusVersion;
    keys.current.clear();
    const x = LOT_W * GRID / 2, z = LOT_D * GRID / 2;
    controls.target.set(x, 0, z);
    camera.position.set(x + 13, 15, z + 19);
    camera.lookAt(controls.target);
    controls.update();
  }, [focusVersion, mode, camera, controls]);

  useEffect(() => {
    const isTyping = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      return t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA' || useGame.getState().overlay !== null;
    };
    const onDown = (e: KeyboardEvent) => {
      if (isTyping(e) || e.ctrlKey || e.metaKey || e.altKey) return;
      keys.current.add(e.code);
    };
    const onUp = (e: KeyboardEvent) => keys.current.delete(e.code);
    const onBlur = () => keys.current.clear();
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  const walking = useGame((s) => s.mode === 'walk');

  useFrame((_, rawDt) => {
    if (!controls || walking || useInteraction.getState().buildingDrag || useInteraction.getState().furnitureDrag) return;
    const dt = Math.min(rawDt, 0.1);
    const k = keys.current;
    // 家具を選んでいるときの矢印キーは、家具を少しずつ動かすのに使う
    const furniture = useGame.getState().selection?.kind === 'furniture';
    const pressed = (codes: string[]) => codes.some((c) => k.has(c) && !(furniture && ARROWS.includes(c)));
    const fwd = (pressed(CAMERA_KEYS.forward) ? 1 : 0) - (pressed(CAMERA_KEYS.back) ? 1 : 0);
    const side = (pressed(CAMERA_KEYS.right) ? 1 : 0) - (pressed(CAMERA_KEYS.left) ? 1 : 0);
    // Q を押すとカメラは上から見て時計回りに家のまわりを回る（E はその逆）。スマホは回転ボタン
    const turn = (pressed(CAMERA_KEYS.turnRight) ? 1 : 0) - (pressed(CAMERA_KEYS.turnLeft) ? 1 : 0) || touchCamera.turn;
    const zoom = touchCamera.zoom;
    if (!fwd && !side && !turn && !zoom) return;
    const fast = pressed(CAMERA_KEYS.fast) ? 2.5 : 1;
    const target = controls.target;
    const offset = camera.position.clone().sub(target);

    if (turn) {
      offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), turn * TURN_SPEED * fast * dt);
      camera.position.copy(target).add(offset);
    }
    if (zoom) {
      // 寄る・離れる（つまむ操作の代わりのボタン）
      const len = Math.min(Math.max(offset.length() * Math.exp(-zoom * 1.4 * dt), 1.2), 120);
      offset.setLength(len);
      camera.position.copy(target).add(offset);
    }
    if (fwd || side) {
      // 遠くから見ているときほど速く動く
      const speed = Math.max(3, offset.length() * 0.8) * fast;
      const forward = new THREE.Vector3(-offset.x, 0, -offset.z);
      if (forward.lengthSq() < 1e-6) camera.getWorldDirection(forward).setY(0);
      forward.normalize();
      const right = new THREE.Vector3(-forward.z, 0, forward.x);
      const move = forward.multiplyScalar(fwd).add(right.multiplyScalar(side)).normalize().multiplyScalar(speed * dt);
      const next = target.clone().add(move);
      next.x = Math.min(Math.max(next.x, -MARGIN), LOT_W * GRID + MARGIN);
      next.z = Math.min(Math.max(next.z, -MARGIN), LOT_D * GRID + MARGIN);
      const delta = next.sub(target);
      target.add(delta);
      camera.position.add(delta);
    }
    controls.update();
  });

  return null;
}

