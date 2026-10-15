// 歩きモードのプレイヤー：キー入力で動かし、三人称・一人称のカメラで追う
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { GRID, LOT_D, LOT_W } from '../building/dimensions';
import { PLAYER, resolveCollisions, surfaceHeight } from '../building/walk';
import { useGame } from '../state/store';
import { plainMaterial } from './materials';

const WALK_SPEED = 2.6;
const RUN_SPEED = 5.2;
const CROUCH_SPEED = 1.2;
const JUMP_SPEED = 4.2;
const GRAVITY = 9.8;
const EYE = 1.58;
const CROUCH_EYE = 1.0;
const THIRD_PITCH = -0.22;
const FOV = { third: 55, first: 72 };

/** モードを切り替えても位置を覚えておく（セーブはしない） */
export const playerMemory = {
  x: (LOT_W * GRID) / 2,
  y: 0,
  z: LOT_D * GRID - 1.2,
  yaw: 0,
  pitch: THIRD_PITCH,
  bodyYaw: 0,
  distance: 4.2,
};

/** プレイヤーが入力として使うキー（e.code）。HUD の説明と合わせる */
export const WALK_KEYS = {
  forward: ['KeyW', 'ArrowUp'],
  back: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  run: ['ShiftLeft', 'ShiftRight'],
  jump: ['Space'],
  crouch: ['KeyC'],
  view: ['KeyQ'],
  resetCamera: ['KeyR'],
};

export function Player() {
  const { camera, gl, scene } = useThree();
  const view = useGame((s) => s.view);
  const body = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const keys = useRef(new Set<string>());
  const state = useRef({ velY: 0, grounded: true, crouch: false, phase: 0, crouchBlend: 0 });
  const raycaster = useRef(new THREE.Raycaster());

  // 建築モードのカメラを覚えておき、戻るときに元に戻す
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const saved = { pos: cam.position.clone(), quat: cam.quaternion.clone(), fov: cam.fov };
    return () => {
      cam.position.copy(saved.pos);
      cam.quaternion.copy(saved.quat);
      cam.fov = saved.fov;
      cam.updateProjectionMatrix();
      if (document.pointerLockElement) document.exitPointerLock();
    };
  }, [camera]);

  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    cam.fov = FOV[view];
    cam.updateProjectionMatrix();
  }, [camera, view]);

  // キーボードとマウス
  useEffect(() => {
    const el = gl.domElement;
    const isTyping = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      return t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA';
    };
    const onDown = (e: KeyboardEvent) => {
      if (isTyping(e) || e.ctrlKey || e.metaKey) return;
      if (Object.values(WALK_KEYS).some((codes) => codes.includes(e.code))) e.preventDefault();
      if (e.repeat) return;
      keys.current.add(e.code);
      const st = state.current;
      if (WALK_KEYS.jump.includes(e.code) && st.grounded) {
        st.velY = JUMP_SPEED;
        st.grounded = false;
      }
      if (WALK_KEYS.crouch.includes(e.code)) st.crouch = !st.crouch;
      if (WALK_KEYS.view.includes(e.code)) {
        useGame.getState().toggleView();
        playerMemory.pitch = useGame.getState().view === 'first' ? 0 : THIRD_PITCH;
      }
      if (WALK_KEYS.resetCamera.includes(e.code)) {
        playerMemory.yaw = playerMemory.bodyYaw;
        playerMemory.pitch = useGame.getState().view === 'first' ? 0 : THIRD_PITCH;
      }
    };
    const onUp = (e: KeyboardEvent) => keys.current.delete(e.code);
    const onBlur = () => keys.current.clear();

    let dragging = false;
    const look = (dx: number, dy: number) => {
      playerMemory.yaw -= dx * 0.0028;
      playerMemory.pitch = Math.min(Math.max(playerMemory.pitch - dy * 0.0028, -1.25), 1.25);
    };
    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      dragging = true;
      // クリックでマウスを固定して視点操作（使えない環境ではドラッグで視点を回す）
      try {
        const r = el.requestPointerLock() as unknown as Promise<void> | undefined;
        r?.catch?.(() => undefined);
      } catch {
        /* ドラッグで代用 */
      }
    };
    const onMouseUp = () => (dragging = false);
    const onMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement === el || dragging) look(e.movementX, e.movementY);
    };
    const onWheel = (e: WheelEvent) => {
      playerMemory.distance = Math.min(Math.max(playerMemory.distance + e.deltaY * 0.004, 1.6), 9);
    };

    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('blur', onBlur);
    el.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('mousemove', onMouseMove);
    el.addEventListener('wheel', onWheel, { passive: true });
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('blur', onBlur);
      el.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('mousemove', onMouseMove);
      el.removeEventListener('wheel', onWheel);
    };
  }, [gl]);

  useFrame((_, rawDt) => {
    // 描画が遅い環境でも同じ速さで動くよう、細かい時間に分けて計算する
    const frameDt = Math.min(rawDt, 0.25);
    const steps = Math.max(1, Math.ceil(frameDt / 0.03));
    const dt = frameDt / steps;
    const { house, view: v } = useGame.getState();
    const st = state.current;
    const k = keys.current;
    const pressed = (codes: string[]) => codes.some((c) => k.has(c));

    // 移動（カメラの向き基準）
    const fwd = (pressed(WALK_KEYS.forward) ? 1 : 0) - (pressed(WALK_KEYS.back) ? 1 : 0);
    const side = (pressed(WALK_KEYS.right) ? 1 : 0) - (pressed(WALK_KEYS.left) ? 1 : 0);
    const sinY = Math.sin(playerMemory.yaw);
    const cosY = Math.cos(playerMemory.yaw);
    let mx = -sinY * fwd + cosY * side;
    let mz = -cosY * fwd - sinY * side;
    const mlen = Math.hypot(mx, mz);
    const moving = mlen > 0;
    const running = pressed(WALK_KEYS.run) && !st.crouch;
    if (moving) {
      mx /= mlen;
      mz /= mlen;
    }
    for (let i = 0; i < steps; i++) {
      if (moving) {
        const speed = st.crouch ? CROUCH_SPEED : running ? RUN_SPEED : WALK_SPEED;
        const height = st.crouch ? PLAYER.crouchHeight : PLAYER.height;
        const next = resolveCollisions(house, { x: playerMemory.x + mx * speed * dt, z: playerMemory.z + mz * speed * dt }, playerMemory.y, height);
        playerMemory.x = Math.min(Math.max(next.x, -25), LOT_W * GRID + 25);
        playerMemory.z = Math.min(Math.max(next.z, -25), LOT_D * GRID + 25);
        // 三人称では進む向きへ体を回す
        const target = Math.atan2(-mx, -mz);
        let diff = target - playerMemory.bodyYaw;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        playerMemory.bodyYaw += diff * Math.min(1, dt * 12);
      }
      if (v === 'first') playerMemory.bodyYaw = playerMemory.yaw;

      // 高さ：重力・ジャンプ・段差と階段
      const ground = surfaceHeight(house, playerMemory.x, playerMemory.z, playerMemory.y);
      if (st.grounded && st.velY <= 0 && playerMemory.y - ground < 0.35) {
        playerMemory.y = ground; // 段差を上る・階段を下りるときは地面に沿わせる
      } else {
        st.velY -= GRAVITY * dt;
        playerMemory.y += st.velY * dt;
        st.grounded = false;
      }
      if (playerMemory.y <= ground) {
        playerMemory.y = ground;
        st.velY = 0;
        st.grounded = true;
      }
    }

    // しゃがみ・歩きの動き
    st.crouchBlend += ((st.crouch ? 1 : 0) - st.crouchBlend) * Math.min(1, frameDt * 10);
    st.phase += moving && st.grounded ? frameDt * (running ? 13 : 8) : 0;
    const swing = moving && st.grounded ? Math.sin(st.phase) * (running ? 0.9 : 0.6) : 0;
    if (body.current) {
      body.current.position.set(playerMemory.x, playerMemory.y, playerMemory.z);
      body.current.rotation.y = playerMemory.bodyYaw;
      body.current.scale.y = 1 - st.crouchBlend * 0.32;
      body.current.visible = v === 'third';
    }
    legL.current?.rotation.set(swing, 0, 0);
    legR.current?.rotation.set(-swing, 0, 0);
    armL.current?.rotation.set(-swing * 0.8, 0, 0);
    armR.current?.rotation.set(swing * 0.8, 0, 0);

    // カメラ
    const eye = playerMemory.y + EYE + (CROUCH_EYE - EYE) * st.crouchBlend;
    const cp = Math.cos(playerMemory.pitch);
    const dir = new THREE.Vector3(-sinY * cp, Math.sin(playerMemory.pitch), -cosY * cp);
    if (v === 'first') {
      camera.position.set(playerMemory.x, eye, playerMemory.z);
      camera.lookAt(playerMemory.x + dir.x, eye + dir.y, playerMemory.z + dir.z);
    } else {
      const focus = new THREE.Vector3(playerMemory.x, eye - 0.1, playerMemory.z);
      let dist = playerMemory.distance;
      // 壁や屋根でカメラが埋もれないよう、手前に寄せる
      const house3d = scene.getObjectByName('house');
      if (house3d) {
        raycaster.current.set(focus, dir.clone().negate());
        raycaster.current.far = dist;
        const hit = raycaster.current.intersectObject(house3d, true).find((h) => {
          const m = (h.object as THREE.Mesh).material as THREE.Material;
          return !(m && m.transparent);
        });
        if (hit) dist = Math.max(0.4, hit.distance - 0.2);
      }
      camera.position.copy(focus).addScaledVector(dir, -dist);
      camera.lookAt(focus);
    }
  });

  const skin = plainMaterial('#e8c4a0', 'none', { roughness: 0.7 });
  const shirt = plainMaterial('#3e6fa8', 'none', { roughness: 0.8 });
  const pants = plainMaterial('#2f3540', 'none', { roughness: 0.85 });
  const hair = plainMaterial('#2a221d', 'none', { roughness: 0.9 });
  const shoe = plainMaterial('#1c1c1e', 'none', { roughness: 0.6 });

  // 体は -Z が正面
  return (
    <group ref={body}>
      {[-1, 1].map((side) => (
        <group key={`leg${side}`} ref={side < 0 ? legL : legR} position={[side * 0.1, 0.86, 0]}>
          <mesh position={[0, -0.41, 0]} material={pants} castShadow>
            <boxGeometry args={[0.15, 0.82, 0.17]} />
          </mesh>
          <mesh position={[0, -0.82, -0.04]} material={shoe} castShadow>
            <boxGeometry args={[0.15, 0.08, 0.26]} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 1.15, 0]} material={shirt} castShadow>
        <boxGeometry args={[0.42, 0.6, 0.23]} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={`arm${side}`} ref={side < 0 ? armL : armR} position={[side * 0.27, 1.42, 0]}>
          <mesh position={[0, -0.24, 0]} material={shirt} castShadow>
            <boxGeometry args={[0.11, 0.48, 0.13]} />
          </mesh>
          <mesh position={[0, -0.55, 0]} material={skin} castShadow>
            <boxGeometry args={[0.09, 0.16, 0.1]} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 1.49, 0]} material={skin}>
        <cylinderGeometry args={[0.05, 0.06, 0.08, 10]} />
      </mesh>
      <mesh position={[0, 1.62, 0]} material={skin} castShadow>
        <sphereGeometry args={[0.12, 20, 16]} />
      </mesh>
      <mesh position={[0, 1.67, 0.02]} scale={[1.05, 0.8, 1.05]} material={hair} castShadow>
        <sphereGeometry args={[0.125, 20, 12, 0, Math.PI * 2, 0, Math.PI / 1.7]} />
      </mesh>
    </group>
  );
}
