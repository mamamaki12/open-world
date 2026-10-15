// 歩きモードのプレイヤー：キー入力で動かし、三人称・一人称のカメラで追う。
// 開いた窓は Space で乗り越えられる（2階以上なら枠によじ登ってから飛び降りる）
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { BASE_HEIGHT, GRID, LOT_D, LOT_W, MAX_LEVEL, STORY_HEIGHT } from '../building/dimensions';
import { getOpening } from '../catalog';
import { LEAP_VELOCITY, climbDuration, climbFrame, planClimb } from '../building/climb';
import type { ClimbPlan } from '../building/climb';
import { PLAYER, nearestOpening, resolveCollisions, surfaceHeight, windowPassage } from '../building/walk';
import type { WindowPassage } from '../building/walk';
import { isDoorOpen, useDoors } from '../state/doors';
import { playClimbSound, playDoorSound, playLandSound, playWindowSound } from './sound';
import { useGame } from '../state/store';
import { AvatarModel, poseRig, useRig, useSmooth } from './Avatar';

const WALK_SPEED = 2.6;
const RUN_SPEED = 5.2;
const CROUCH_SPEED = 1.2;
const JUMP_SPEED = 4.2;
const GRAVITY = 9.8;
/** 歩き出し・止まるときの加速のなめらかさ（大きいほどきびきび） */
const ACCEL = 9;
const THIRD_PITCH = -0.22;
const FOV = { third: 55, first: 72 };
/** 窓を乗り越えられる距離（m） */
const CLIMB_REACH = 1.2;

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
  interact: ['KeyF', 'KeyE'],
};

/** いま狙っているドア・窓を開け閉めする（キーと画面のボタンの両方から呼ぶ） */
export function toggleTargetDoor() {
  const doors = useDoors.getState();
  const id = doors.target;
  if (!id || doors.climbing) return;
  const { house } = useGame.getState();
  const spot = nearestOpening(house, playerMemory.x, playerMemory.z, playerMemory.y);
  // 開く向き：プレイヤーがいる側と反対へ
  const dir = (spot && spot.id === id ? -spot.side : 1) as 1 | -1;
  const opened = doors.toggle(id, dir);
  const o = house.openings.find((p) => p.id === id);
  if (!o) return;
  const style = getOpening(o.type).style;
  if (o.kind === 'window') playWindowSound(opened, style === 'slidingWindow');
  else playDoorSound(opened, style === 'sliding');
}

/** 近くの開いた窓のうち、乗り越えられるもの */
function climbablePassage(): WindowPassage | null {
  const { house } = useGame.getState();
  const id = useDoors.getState().target;
  const o = id ? house.openings.find((p) => p.id === id) : undefined;
  if (!o || !isDoorOpen(o.id)) return null;
  const pass = windowPassage(house, o, playerMemory.x, playerMemory.z, playerMemory.y);
  if (!pass || !pass.ok) return null;
  if (Math.hypot(playerMemory.x - pass.x, playerMemory.z - pass.z) > CLIMB_REACH) return null;
  return pass;
}

/** 歩きながら建てるツールを持っているか（選択ツール = 手ぶら） */
export function isBuilding() {
  return useGame.getState().tool !== 'select';
}

/** 立っている高さから、いまいる階を求める */
function levelAt(y: number) {
  return Math.min(Math.max(Math.floor((y - BASE_HEIGHT + 0.4) / STORY_HEIGHT), 0), MAX_LEVEL);
}

interface Action {
  plan: ClimbPlan;
  t: number;
}

/** 着地の土ぼこり：広がって消える輪と、舞い上がる粒 */
const DUST_COUNT = 12;
function makeDust() {
  return {
    life: 0,
    strength: 0,
    origin: new THREE.Vector3(),
    dirs: Array.from({ length: DUST_COUNT }, (_, i) => {
      const a = (i / DUST_COUNT) * Math.PI * 2 + Math.random() * 0.4;
      return new THREE.Vector3(Math.cos(a), 0.35 + Math.random() * 0.5, Math.sin(a)).multiplyScalar(0.7 + Math.random() * 0.6);
    }),
  };
}

export function Player() {
  const { camera, gl, scene } = useThree();
  const view = useGame((s) => s.view);
  const rig = useRig();
  const smooth = useSmooth();
  const keys = useRef(new Set<string>());
  const state = useRef({ velY: 0, vx: 0, vz: 0, grounded: true, crouch: false, airTime: 0, lastYaw: 0, shake: 0 });
  const action = useRef<Action | null>(null);
  const playerLevel = useRef(-1);
  /** 窓から飛び出した直後：通ってきた窓の壁に押し戻されないよう、少しの間だけ壁の当たり判定を切る */
  const skipWalls = useRef(false);
  const raycaster = useRef(new THREE.Raycaster());
  const dust = useRef(makeDust());
  const dustRing = useRef<THREE.Mesh>(null);
  const dustPuffs = useRef<THREE.InstancedMesh>(null);

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
      useDoors.getState().setTarget(null);
      useDoors.getState().setClimb(null, false);
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
      if (WALK_KEYS.jump.includes(e.code) && st.grounded && !action.current) {
        // 開いた窓の前なら乗り越える。そうでなければジャンプ
        const pass = climbablePassage();
        if (pass) {
          const { house } = useGame.getState();
          action.current = { plan: planClimb(house, pass, { x: playerMemory.x, y: playerMemory.y, z: playerMemory.z }), t: 0 };
          st.crouch = false;
          st.vx = 0;
          st.vz = 0;
          playClimbSound();
        } else {
          st.velY = JUMP_SPEED;
          st.grounded = false;
        }
      }
      if (WALK_KEYS.crouch.includes(e.code) && !action.current) st.crouch = !st.crouch;
      if (WALK_KEYS.view.includes(e.code)) {
        useGame.getState().toggleView();
        playerMemory.pitch = useGame.getState().view === 'first' ? 0 : THIRD_PITCH;
      }
      if (WALK_KEYS.interact.includes(e.code)) toggleTargetDoor();
      // 階段・家具を持っているときの R は向きを変える（App 側で処理）
      const tool = useGame.getState().tool;
      if (WALK_KEYS.resetCamera.includes(e.code) && tool !== 'stair' && tool !== 'furniture') {
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
      // 建てるツールを持っているときは、左クリックで置き、右ドラッグで見回す
      if (isBuilding()) {
        if (e.button === 2) dragging = true;
        return;
      }
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
    const onContextMenu = (e: MouseEvent) => e.preventDefault();
    // ツールを持ったらマウスの固定を外す（カーソルで置く場所を指すため）
    const unsubTool = useGame.subscribe((s, prev) => {
      if (s.tool !== prev.tool && s.tool !== 'select' && document.pointerLockElement === el) document.exitPointerLock();
    });
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
    el.addEventListener('contextmenu', onContextMenu);
    return () => {
      unsubTool();
      el.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('blur', onBlur);
      el.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('mousemove', onMouseMove);
      el.removeEventListener('wheel', onWheel);
    };
  }, [gl]);

  useFrame(({ clock }, rawDt) => {
    // 描画が遅い環境でも同じ速さで動くよう、細かい時間に分けて計算する
    const frameDt = Math.min(rawDt, 0.25);
    const steps = Math.max(1, Math.ceil(frameDt / 0.03));
    const dt = frameDt / steps;
    const { house, view: v } = useGame.getState();
    const st = state.current;
    const k = keys.current;
    const pressed = (codes: string[]) => codes.some((c) => k.has(c));
    const yawBefore = playerMemory.bodyYaw;

    // 移動の入力（カメラの向き基準）
    const fwd = (pressed(WALK_KEYS.forward) ? 1 : 0) - (pressed(WALK_KEYS.back) ? 1 : 0);
    const side = (pressed(WALK_KEYS.right) ? 1 : 0) - (pressed(WALK_KEYS.left) ? 1 : 0);
    const sinY = Math.sin(playerMemory.yaw);
    const cosY = Math.cos(playerMemory.yaw);
    let mx = -sinY * fwd + cosY * side;
    let mz = -cosY * fwd - sinY * side;
    const mlen = Math.hypot(mx, mz);
    if (mlen > 0) {
      mx /= mlen;
      mz /= mlen;
    }
    const running = pressed(WALK_KEYS.run) && !st.crouch;
    const speedGoal = mlen === 0 ? 0 : st.crouch ? CROUCH_SPEED : running ? RUN_SPEED : WALK_SPEED;

    // 窓を乗り越えている最中は、決まった動きに沿って体を動かす
    let climbPose: ReturnType<typeof climbFrame> | null = null;
    const act = action.current;
    if (act) {
      act.t += frameDt;
      const f = climbFrame(act.plan, act.t);
      if (f.phase === 'leap') {
        // 枠から外へ飛び出す。ここからは重力で落ちる
        playerMemory.x = f.pos.x;
        playerMemory.y = f.pos.y;
        playerMemory.z = f.pos.z;
        st.vx = act.plan.passage.nx * LEAP_VELOCITY.out;
        st.vz = act.plan.passage.nz * LEAP_VELOCITY.out;
        st.velY = LEAP_VELOCITY.up;
        st.grounded = false;
        st.airTime = 0;
        skipWalls.current = true;
        action.current = null;
      } else if (act.t >= climbDuration(act.plan)) {
        // 足から降りきった
        playerMemory.x = act.plan.dest.x;
        playerMemory.y = act.plan.dest.y;
        playerMemory.z = act.plan.dest.z;
        st.velY = -2.5; // 軽い着地として扱う
        st.grounded = true;
        action.current = null;
        playLandSound(0.2);
      } else {
        climbPose = f;
        playerMemory.x = f.pos.x;
        playerMemory.y = f.pos.y;
        playerMemory.z = f.pos.z;
        let diff = act.plan.yaw - playerMemory.bodyYaw;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        playerMemory.bodyYaw += diff * Math.min(1, frameDt * 10);
        if (v === 'first') playerMemory.yaw = playerMemory.bodyYaw;
      }
    }

    if (!climbPose) {
      for (let i = 0; i < steps; i++) {
        // 速さは少しずつ変える（歩き出し・止まりがなめらかになる）。空中では向きを変えにくい
        const control = st.grounded ? ACCEL : 1.2;
        const blend = 1 - Math.exp(-control * dt);
        st.vx += (mx * speedGoal - st.vx) * (st.grounded || mlen > 0 ? blend : 0);
        st.vz += (mz * speedGoal - st.vz) * (st.grounded || mlen > 0 ? blend : 0);
        const hs = Math.hypot(st.vx, st.vz);
        if (hs > 0.01) {
          const height = st.crouch ? PLAYER.crouchHeight : PLAYER.height;
          const nx = playerMemory.x + st.vx * dt;
          const nz = playerMemory.z + st.vz * dt;
          // 窓から飛び出した直後は、通ってきた窓の壁に押し戻されないようにする
          const next = skipWalls.current && st.airTime < 0.3
            ? { x: nx, z: nz }
            : resolveCollisions(house, { x: nx, z: nz }, playerMemory.y, height, isDoorOpen);
          playerMemory.x = Math.min(Math.max(next.x, -25), LOT_W * GRID + 25);
          playerMemory.z = Math.min(Math.max(next.z, -25), LOT_D * GRID + 25);
          // 三人称では進む向きへ体を回す
          if (mlen > 0 || !st.grounded) {
            const target = Math.atan2(-st.vx, -st.vz);
            let diff = target - playerMemory.bodyYaw;
            diff = Math.atan2(Math.sin(diff), Math.cos(diff));
            playerMemory.bodyYaw += diff * Math.min(1, dt * (mlen > 0 ? 9 : 3));
          }
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
          st.airTime += dt;
        }
        if (playerMemory.y <= ground) {
          playerMemory.y = ground;
          st.velY = 0;
          st.grounded = true;
          st.airTime = 0;
          skipWalls.current = false;
        }
      }
    }

    // 作業する階は、いまいる階に合わせる（Z / X で一時的に変えられる）
    const lv = levelAt(playerMemory.y);
    if (lv !== playerLevel.current) {
      playerLevel.current = lv;
      if (useGame.getState().activeLevel !== lv) useGame.getState().setLevel(lv);
    }

    // 近くのドア・窓を操作対象にする。開いた窓なら出られるかも調べる
    const doors = useDoors.getState();
    if (!action.current) {
      const spot = nearestOpening(house, playerMemory.x, playerMemory.z, playerMemory.y);
      doors.setTarget(spot?.id ?? null);
      let climb: 'ok' | 'narrow' | 'high' | null = null;
      if (spot?.kind === 'window' && isDoorOpen(spot.id)) {
        const o = house.openings.find((p) => p.id === spot.id);
        const pass = o ? windowPassage(house, o, playerMemory.x, playerMemory.z, playerMemory.y) : null;
        if (pass) climb = pass.ok ? (Math.hypot(playerMemory.x - pass.x, playerMemory.z - pass.z) <= CLIMB_REACH ? 'ok' : null) : pass.reason;
      }
      doors.setClimb(climb, false);
    } else {
      doors.setClimb(null, true);
    }

    // ---- 体の動き ----
    const r = rig.current;
    const hspeed = climbPose ? 0 : Math.hypot(st.vx, st.vz);
    let turn = playerMemory.bodyYaw - yawBefore;
    turn = Math.atan2(Math.sin(turn), Math.cos(turn));
    let lookYaw = playerMemory.yaw - playerMemory.bodyYaw;
    lookYaw = Math.atan2(Math.sin(lookYaw), Math.cos(lookYaw));
    if (Math.abs(lookYaw) > 1.8) lookYaw = 0; // 真後ろを見ているときは振り向かない
    let hands: [THREE.Vector3, THREE.Vector3] | null = null;
    if (climbPose?.hands && action.current) {
      const pass = action.current.plan.passage;
      // 壁に沿った向き（窓の幅方向）
      const ax = -pass.nz;
      const az = pass.nx;
      if (climbPose.hands === 'sill') {
        const s = Math.min(0.22, pass.width / 2 - 0.05);
        hands = [
          new THREE.Vector3(pass.x - ax * s - pass.nx * 0.04, pass.sillY + 0.02, pass.z - az * s - pass.nz * 0.04),
          new THREE.Vector3(pass.x + ax * s - pass.nx * 0.04, pass.sillY + 0.02, pass.z + az * s - pass.nz * 0.04),
        ];
      } else {
        const s = pass.width / 2 - 0.02;
        const hy = pass.sillY + Math.min(0.7, pass.height - 0.15);
        hands = [
          new THREE.Vector3(pass.x - ax * s, hy, pass.z - az * s),
          new THREE.Vector3(pass.x + ax * s, hy, pass.z + az * s),
        ];
      }
      // 体から見た左右に合わせる（体の左 = 正面 -Z から見て -X）
      const right = new THREE.Vector3(Math.cos(playerMemory.bodyYaw), 0, -Math.sin(playerMemory.bodyYaw));
      if (hands[0].clone().sub(hands[1]).dot(right) > 0) hands.reverse();
    }
    if (r.root) {
      r.root.position.set(playerMemory.x, playerMemory.y, playerMemory.z);
      r.root.rotation.y = playerMemory.bodyYaw;
      r.root.visible = v === 'third';
    }
    const landed = poseRig(r, smooth.current, {
      dt: frameDt,
      time: clock.elapsedTime,
      speed: hspeed * (st.grounded ? 1 : 0),
      running,
      crouch: climbPose ? climbPose.crouch : st.crouch ? 1 : 0,
      air: climbPose ? climbPose.air : !st.grounded,
      velY: st.velY,
      turnRate: turn / Math.max(frameDt, 1e-3),
      lookYaw: climbPose ? 0 : lookYaw,
      lookPitch: climbPose ? -climbPose.lookDown : Math.max(playerMemory.pitch - THIRD_PITCH, -0.6),
      hands,
      tuck: climbPose ? climbPose.tuck : 0,
      perch: climbPose ? climbPose.perch : 0,
    });
    if (landed > 0) {
      // 高いところからの着地：土ぼこり・音・カメラの揺れ
      const d = dust.current;
      d.life = 1;
      d.strength = landed;
      d.origin.set(playerMemory.x, playerMemory.y + 0.02, playerMemory.z);
      st.shake = 0.12 * landed;
      playLandSound(landed);
    }
    updateDust(frameDt);

    // ---- カメラ ----
    const head = new THREE.Vector3();
    if (r.head) r.head.getWorldPosition(head);
    else head.set(playerMemory.x, playerMemory.y + 1.5, playerMemory.z);
    st.shake = Math.max(0, st.shake - frameDt * 0.35);
    const shakeY = st.shake * Math.sin(clock.elapsedTime * 55);
    const eye = head.y + 0.1 + shakeY;
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

  const tmpMatrix = useRef(new THREE.Object3D());
  function updateDust(dt: number) {
    const d = dust.current;
    const ring = dustRing.current;
    const puffs = dustPuffs.current;
    if (!ring || !puffs) return;
    if (d.life <= 0) {
      ring.visible = false;
      puffs.visible = false;
      return;
    }
    d.life = Math.max(0, d.life - dt * 1.4);
    const age = 1 - d.life;
    const s = 0.5 + d.strength;
    ring.visible = true;
    ring.position.copy(d.origin);
    ring.scale.setScalar((0.25 + age * 1.3) * s);
    (ring.material as THREE.MeshBasicMaterial).opacity = 0.45 * d.life;
    puffs.visible = true;
    const o = tmpMatrix.current;
    d.dirs.forEach((dir, i) => {
      const travel = (1 - Math.exp(-age * 3)) * s;
      o.position.set(d.origin.x + dir.x * travel, d.origin.y + 0.05 + dir.y * travel * 0.6 - age * age * 0.2, d.origin.z + dir.z * travel);
      o.scale.setScalar((0.06 + age * 0.14) * s);
      o.updateMatrix();
      puffs.setMatrixAt(i, o.matrix);
    });
    puffs.instanceMatrix.needsUpdate = true;
    (puffs.material as THREE.MeshBasicMaterial).opacity = 0.55 * d.life;
  }

  return (
    <>
      <AvatarModel rig={rig} />
      <mesh ref={dustRing} rotation-x={-Math.PI / 2} visible={false}>
        <ringGeometry args={[0.7, 1, 40]} />
        <meshBasicMaterial color="#cdbfa6" transparent opacity={0} depthWrite={false} />
      </mesh>
      <instancedMesh ref={dustPuffs} args={[undefined, undefined, DUST_COUNT]} visible={false}>
        <sphereGeometry args={[1, 10, 8]} />
        <meshBasicMaterial color="#d8cdb8" transparent opacity={0} depthWrite={false} />
      </instancedMesh>
    </>
  );
}
