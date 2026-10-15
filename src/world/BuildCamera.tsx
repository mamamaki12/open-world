// 建築モードのカメラをキーで動かす：WASD / 矢印で前後左右、Q / E で回る、Shift で速く。
// 作業する階を変えたら、カメラも同じ高さだけ上下させる。
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { GRID, LOT_D, LOT_W, floorY } from '../building/dimensions';
import { useGame } from '../state/store';

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

  useEffect(() => {
    const isTyping = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      return t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA';
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

  // 作業する階を変えたら、その階の床の高さへカメラごと移す（歩きモード中に変わった分は戻ったときに合わせる）
  const walking = useGame((s) => s.mode === 'walk');
  const alignedLevel = useRef(useGame.getState().activeLevel);
  useEffect(() => {
    if (walking || !controls) return;
    const align = (level: number) => {
      if (level === alignedLevel.current) return;
      const dy = floorY(level) - floorY(alignedLevel.current);
      alignedLevel.current = level;
      controls.target.y += dy;
      camera.position.y += dy;
      controls.update();
    };
    align(useGame.getState().activeLevel);
    return useGame.subscribe((s) => align(s.activeLevel));
  }, [camera, controls, walking]);

  useFrame((_, rawDt) => {
    if (!controls || walking) return;
    const dt = Math.min(rawDt, 0.1);
    const k = keys.current;
    // 家具を選んでいるときの矢印キーは、家具を少しずつ動かすのに使う
    const furniture = useGame.getState().selection?.kind === 'furniture';
    const pressed = (codes: string[]) => codes.some((c) => k.has(c) && !(furniture && ARROWS.includes(c)));
    const fwd = (pressed(CAMERA_KEYS.forward) ? 1 : 0) - (pressed(CAMERA_KEYS.back) ? 1 : 0);
    const side = (pressed(CAMERA_KEYS.right) ? 1 : 0) - (pressed(CAMERA_KEYS.left) ? 1 : 0);
    // Q を押すとカメラは上から見て時計回りに家のまわりを回る（E はその逆）
    const turn = (pressed(CAMERA_KEYS.turnRight) ? 1 : 0) - (pressed(CAMERA_KEYS.turnLeft) ? 1 : 0);
    if (!fwd && !side && !turn) return;
    const fast = pressed(CAMERA_KEYS.fast) ? 2.5 : 1;
    const target = controls.target;
    const offset = camera.position.clone().sub(target);

    if (turn) {
      offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), turn * TURN_SPEED * fast * dt);
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
