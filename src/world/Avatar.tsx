// プレイヤーの人形：丸みのある体と関節（腰・ひざ・足首・肩・ひじ・首）。
// 足は2関節のIK（足もとの位置からももとすねの角度を出す）で地面に付け、
// 歩き・走り・しゃがみ・ジャンプ・着地・窓によじ登る動きを、毎フレームなめらかにつなぐ。
import { useRef } from 'react';
import type { MutableRefObject, ReactNode } from 'react';
import * as THREE from 'three';
import { plainMaterial } from './materials';
import { getGarment } from '../catalog/clothes';
import type { Outfit } from '../catalog/clothes';
import { useWardrobe } from '../state/wardrobe';

/** 体の寸法（m）。体は -Z が正面、原点は足もと */
const THIGH = 0.43;
const SHIN = 0.42;
const ANKLE_Y = 0.075;
const UPPER_ARM = 0.27;
const FOREARM = 0.25;
const HAND = 0.04;
const HIP_X = 0.095;
const SHOULDER = { x: 0.185, y: 0.47 };
export const STAND_HIP = 0.88;
const CROUCH_HIP = 0.5;
const PERCH_HIP = 0.44;

export interface Rig {
  root: THREE.Group | null;
  hips: THREE.Group | null;
  spine: THREE.Group | null;
  head: THREE.Group | null;
  thigh: (THREE.Group | null)[];
  knee: (THREE.Group | null)[];
  ankle: (THREE.Group | null)[];
  shoulder: (THREE.Group | null)[];
  elbow: (THREE.Group | null)[];
}

export function useRig(): MutableRefObject<Rig> {
  return useRef<Rig>({
    root: null,
    hips: null,
    spine: null,
    head: null,
    thigh: [null, null],
    knee: [null, null],
    ankle: [null, null],
    shoulder: [null, null],
    elbow: [null, null],
  });
}

/** 毎フレーム渡す体の状態 */
export interface PoseInput {
  dt: number;
  time: number;
  /** 水平の速さ（m/s） */
  speed: number;
  running: boolean;
  /** 着座時の腰の高さ（足元の基準面から） */
  seated?: number;
  /** しゃがみ（0..1 の目標。なめらかさはこちらで付ける） */
  crouch: number;
  /** 空中にいるか、上下の速さ */
  air: boolean;
  velY: number;
  /** 向きを変える速さ（rad/s）。曲がるときに体を内側へ傾ける */
  turnRate: number;
  /** 顔を向けたい方向（体の正面からの角度・見上げる角度） */
  lookYaw: number;
  lookPitch: number;
  /** 窓によじ登っているとき：両手でつかむ場所（ワールド座標）。null なら腕は振るだけ */
  hands: [THREE.Vector3, THREE.Vector3] | null;
  /** よじ登りで片ひざを持ち上げる度合い 0..1 */
  tuck: number;
  /** 窓枠の上で小さくしゃがむ（頭を枠にぶつけない） */
  perch: number;
}

/** なめらかに追いかける内部の値 */
interface Smooth {
  phase: number;
  speed: number;
  crouch: number;
  air: number;
  land: number;
  hands: number;
  tuck: number;
  perch: number;
  bank: number;
  lookYaw: number;
  lookPitch: number;
  wasAir: boolean;
  fallSpeed: number;
}

export function useSmooth(): MutableRefObject<Smooth> {
  return useRef<Smooth>({
    phase: 0,
    speed: 0,
    crouch: 0,
    air: 0,
    land: 0,
    hands: 0,
    tuck: 0,
    perch: 0,
    bank: 0,
    lookYaw: 0,
    lookPitch: 0,
    wasAir: false,
    fallSpeed: 0,
  });
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
/** 目標へ指数的に近づける（フレームの速さによらず同じ感じになる） */
const approach = (cur: number, goal: number, rate: number, dt: number) => cur + (goal - cur) * (1 - Math.exp(-rate * dt));

/**
 * 2関節のIK。付け根から見て、前へ f・下へ down の点に先端を届かせる角度。
 * bendForward：ひざのように関節が前へ出るなら true、ひじのように後ろへ出るなら false
 */
function twoBone(f: number, down: number, a: number, b: number, bendForward: boolean): [number, number] {
  const d = clamp(Math.hypot(f, down), 0.05, a + b - 0.002);
  const toward = Math.atan2(f, down);
  const A = Math.acos(clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1));
  const K = Math.acos(clamp((a * a + b * b - d * d) / (2 * a * b), -1, 1));
  return bendForward ? [toward + A, -(Math.PI - K)] : [toward - A, Math.PI - K];
}

const tmp = new THREE.Vector3();

/**
 * 体の状態から関節の角度を決める。
 * 戻り値：着地した瞬間なら、その強さ（0..1）。土ぼこりや音に使う
 */
export function poseRig(rig: Rig, sm: Smooth, input: PoseInput): number {
  const { dt } = input;
  if (!rig.hips || !rig.spine || !rig.root) return 0;

  // ---- なめらかに変える値 ----
  sm.speed = approach(sm.speed, input.speed, 10, dt);
  sm.crouch = approach(sm.crouch, input.crouch, 8, dt);
  sm.air = approach(sm.air, input.air ? 1 : 0, input.air ? 9 : 16, dt);
  sm.hands = approach(sm.hands, input.hands ? 1 : 0, 10, dt);
  sm.tuck = approach(sm.tuck, input.tuck, 9, dt);
  sm.perch = approach(sm.perch, input.perch, 8, dt);
  sm.bank = approach(sm.bank, clamp(input.turnRate * 0.035, -0.12, 0.12), 6, dt);
  sm.lookYaw = approach(sm.lookYaw, clamp(input.lookYaw, -0.9, 0.9), 6, dt);
  sm.lookPitch = approach(sm.lookPitch, clamp(input.lookPitch, -0.6, 0.5), 6, dt);
  // 着地：落ちてきた速さに応じてひざを深く曲げ、ゆっくり戻す
  let landed = 0;
  if (input.air) sm.fallSpeed = Math.max(0, -input.velY);
  if (sm.wasAir && !input.air) {
    landed = clamp((sm.fallSpeed - 4.6) / 5, 0, 1);
    sm.land = Math.max(sm.land, 0.25 + landed * 0.75);
  }
  sm.wasAir = input.air;
  sm.land = approach(sm.land, 0, 4.5, dt);

  const spd = sm.speed;
  const crouch = sm.crouch;
  const air = sm.air;
  const land = sm.land;
  // 歩幅：速いほど大きく、しゃがみ歩きは小さく。歩幅と速さから足を運ぶ速さを決めると足がすべらない
  const stride = clamp(0.12 + 0.075 * spd, 0.12, 0.46) * (1 - 0.4 * crouch);
  if (spd > 0.05) sm.phase += ((Math.PI * spd) / (2 * stride)) * dt * (1 - air);
  const gait = clamp(spd / 1.2, 0, 1) * (1 - air);
  const run = clamp((spd - 3) / 2, 0, 1);
  const p = sm.phase;
  const breath = Math.sin(input.time * 2.1);

  // ---- 腰の高さ ----
  const bob = gait * (0.02 + 0.012 * spd) * Math.sin(p) ** 2;
  let hipY = THREE.MathUtils.lerp(STAND_HIP, CROUCH_HIP, crouch) - bob - land * 0.32;
  hipY = THREE.MathUtils.lerp(hipY, PERCH_HIP, sm.perch);
  if (input.seated !== undefined) hipY = input.seated;
  hipY -= air * 0.04;
  rig.hips.position.y = hipY;
  rig.hips.rotation.y = -Math.sin(p) * 0.07 * gait;

  // ---- 足（IK）----
  for (let i = 0; i < 2; i++) {
    const pi = p + i * Math.PI;
    let f = stride * Math.sin(pi) * gait;
    let lift = gait * (0.05 + 0.035 * spd) * Math.max(0, Math.cos(pi));
    // しゃがむと足を少し前に置いて、かかとに体重を乗せる
    f += crouch * 0.06 + land * 0.05;
    // 空中：片ひざを上げ、もう片方は少し後ろへ
    f = THREE.MathUtils.lerp(f, i === 0 ? 0.14 : -0.06, air);
    lift = THREE.MathUtils.lerp(lift, i === 0 ? 0.26 : 0.1, air);
    // よじ登り：左ひざを窓台へ持ち上げる
    if (i === 0) {
      f = THREE.MathUtils.lerp(f, 0.3, sm.tuck);
      lift = THREE.MathUtils.lerp(lift, 0.42, sm.tuck);
    } else {
      f = THREE.MathUtils.lerp(f, -0.12, sm.tuck);
      lift = THREE.MathUtils.lerp(lift, 0.08, sm.tuck);
    }
    const down = hipY - (ANKLE_Y + lift);
    const [thigh, knee] = twoBone(f, down, THIGH, SHIN, true);
    const side = i === 0 ? -1 : 1;
    rig.thigh[i]?.rotation.set(thigh, 0, side * (0.03 + 0.12 * crouch));
    rig.knee[i]?.rotation.set(knee, 0, 0);
    // 足首：足の裏を地面と平行に。蹴り出しでつま先を少し下げる
    const toe = gait * 0.25 * Math.max(0, -Math.cos(pi)) * Math.max(0, -Math.sin(pi));
    rig.ankle[i]?.rotation.set(-(thigh + knee) + toe + air * 0.25, 0, -side * 0.12 * crouch);
    if (input.seated !== undefined) {
      rig.thigh[i]?.rotation.set(Math.PI / 2, 0, side * 0.06);
      rig.knee[i]?.rotation.set(-Math.PI / 2, 0, 0);
      rig.ankle[i]?.rotation.set(0, 0, 0);
    }
  }

  // ---- 上半身 ----
  const lean = 0.035 * spd + 0.08 * run + 0.42 * crouch + 0.35 * land + 0.25 * sm.perch - 0.1 * air * clamp(input.velY, -1, 1);
  rig.spine.rotation.set(-lean + breath * 0.012, Math.sin(p) * 0.09 * gait, sm.bank);
  rig.spine.scale.set(1 + breath * 0.008, 1, 1 + breath * 0.012);
  if (rig.head) {
    // 頭は体が傾いても前を見て、カメラの向きに少し振り向く
    rig.head.rotation.set(lean * 0.75 - sm.lookPitch * 0.6, sm.lookYaw * 0.7, -sm.bank * 0.6);
  }

  // ---- 腕 ----
  rig.root.updateMatrixWorld(true);
  for (let i = 0; i < 2; i++) {
    const side = i === 0 ? -1 : 1;
    const pi = p + i * Math.PI;
    // 振り：同じ側の足と逆に振る
    let sx = -Math.sin(pi) * (0.22 + 0.11 * spd) * gait;
    let sz = side * (0.08 + 0.1 * crouch + 0.5 * air);
    let el = 0.12 + 0.14 * spd + 0.7 * run + 0.25 * crouch;
    // しゃがむと腕をひざの上へ、着地では前へ出してバランスを取る
    sx += 0.55 * crouch + 0.5 * land + 0.35 * air - breath * 0.015 * (1 - gait);
    el += 0.3 * land;
    if (input.hands && rig.spine) {
      // 窓枠をつかむ：肩から手の位置へ向ける
      tmp.copy(input.hands[i]);
      rig.spine.worldToLocal(tmp);
      const rx = tmp.x - side * SHOULDER.x;
      const ry = tmp.y - SHOULDER.y;
      const rz = tmp.z;
      // 横へ開く角度（肩の Z 回転）を先に決め、残りを前後の面の2関節で解く
      const d = Math.max(0.05, Math.hypot(rx, ry, rz));
      const lat = Math.asin(clamp(rx / d, -1, 1));
      const k = d / Math.max(0.01, Math.hypot(ry, rz));
      const [up, elbow] = twoBone(-rz * k, -ry * k, UPPER_ARM, FOREARM + HAND, false);
      const h = sm.hands;
      sx = THREE.MathUtils.lerp(sx, up, h);
      sz = THREE.MathUtils.lerp(sz, lat, h);
      el = THREE.MathUtils.lerp(el, elbow, h);
    }
    rig.shoulder[i]?.rotation.set(sx, 0, sz);
    rig.elbow[i]?.rotation.set(el, 0, 0);
  }
  return landed;
}

// ---- 体の形（回転体で作る、継ぎ目の目立たない滑らかな形）----
const geometries = new Map<string, THREE.BufferGeometry>();
/** [半径, 高さ] の輪郭を回して作る。下から上の順に並べる */
function lathe(key: string, profile: [number, number][], segments = 24): THREE.BufferGeometry {
  const hit = geometries.get(key);
  if (hit) return hit;
  const g = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(Math.max(r, 0.0001), y)), segments);
  g.computeVertexNormals();
  geometries.set(key, g);
  return g;
}
/** 関節から下へ伸びる手足。上の太さ r0 から下の太さ r1 へ細くなり、途中の筋肉で少しふくらむ。両端は丸い */
function limbGeometry(r0: number, r1: number, len: number, bulge = 1.06, at = 0.35): THREE.BufferGeometry {
  const pts: [number, number][] = [];
  for (let i = 0; i <= 6; i++) {
    const a = -Math.PI / 2 + (i / 6) * (Math.PI / 2);
    pts.push([r1 * Math.cos(a), -len + r1 * Math.sin(a)]);
  }
  const mid = THREE.MathUtils.lerp(r0, r1, at) * bulge;
  pts.push([THREE.MathUtils.lerp(r1, mid, 0.6), -len * (1 - (1 - at) * 0.45)]);
  pts.push([mid, -len * at]);
  for (let i = 0; i <= 6; i++) {
    const a = (i / 6) * (Math.PI / 2);
    pts.push([r0 * Math.cos(a), r0 * Math.sin(a)]);
  }
  return lathe(`limb|${r0}|${r1}|${len}|${bulge}|${at}`, pts, 20);
}
/** 胴（腰の上から首の付け根まで）。背骨のグループの原点がへそのあたり */
const TORSO: [number, number][] = [
  [0, -0.08], [0.1, -0.075], [0.128, -0.04], [0.124, 0.04], [0.13, 0.12], [0.148, 0.22], [0.163, 0.31],
  [0.17, 0.38], [0.165, 0.425], [0.14, 0.46], [0.095, 0.485], [0.055, 0.5], [0.0, 0.505],
];
/** 骨盤（腰まわり）。股の下は丸く閉じる */
const PELVIS: [number, number][] = [
  [0, -0.105], [0.06, -0.1], [0.11, -0.075], [0.142, -0.03], [0.15, 0.02], [0.142, 0.07], [0.128, 0.11], [0, 0.115],
];
/** スカート・コートのすそ（腰から下へ広がる） */
const SKIRT: [number, number][] = [[0.17, -0.42], [0.162, -0.3], [0.15, -0.15], [0.148, 0], [0.13, 0.05], [0, 0.055]];
const COAT_HEM: [number, number][] = [[0.2, -0.36], [0.19, -0.2], [0.168, -0.05], [0.16, 0.06], [0, 0.065]];

/** 着ている服から、体の各部の色と形を決める */
export function outfitLook(outfit: Outfit) {
  const top = getGarment(outfit.top), bottom = getGarment(outfit.bottom), shoes = getGarment(outfit.shoes), hat = getGarment(outfit.hat);
  return {
    top: top?.color ?? '#3e6fa8',
    topStyle: top?.style ?? 'tee',
    topAccent: top?.accent ?? '#f1efe8',
    bottom: bottom?.color ?? '#2f3540',
    bottomStyle: bottom?.style ?? 'pants',
    shoe: shoes?.color ?? '#1c1c1e',
    shoeStyle: shoes?.style ?? 'sneaker',
    shoeAccent: shoes?.accent,
    hat: hat ? { style: hat.style, color: hat.color, accent: hat.accent ?? hat.color } : null,
  };
}

/** 人形の見た目と関節の階層。outfit を渡さなければ、いま着ている服で描く。mannequin はマネキン（顔・髪なし） */
export function AvatarModel({ rig, children, outfit, mannequin = false }: { rig: MutableRefObject<Rig>; children?: ReactNode; outfit?: Outfit; mannequin?: boolean }) {
  const worn = useWardrobe((s) => s.outfit);
  const look = outfitLook(outfit ?? worn);
  const skin = mannequin ? plainMaterial('#ece8e0', 'none', { roughness: 0.4 }) : plainMaterial('#e8c4a0', 'none', { roughness: 0.65 });
  const knit = look.topStyle === 'knit' || look.topStyle === 'hoodie';
  const shirt = plainMaterial(look.top, 'none', { roughness: knit ? 1 : 0.85 });
  const accent = plainMaterial(look.topAccent, 'none', { roughness: 0.8 });
  const pants = plainMaterial(look.bottom, 'none', { roughness: 0.9 });
  const hair = plainMaterial('#2a221d', 'none', { roughness: 0.95 });
  const shoe = plainMaterial(look.shoe, 'none', { roughness: look.shoeStyle === 'leather' ? 0.3 : 0.55 });
  const sole = plainMaterial(look.shoeStyle === 'leather' ? '#1a1310' : look.shoeAccent ?? '#d9d6cf', 'none', { roughness: 0.8 });
  const eye = plainMaterial('#1b1714', 'none', { roughness: 0.3 });
  const lip = plainMaterial('#c98f7c', 'none', { roughness: 0.6 });
  const hatMat = look.hat ? plainMaterial(look.hat.color, 'none', { roughness: look.hat.style === 'beanie' ? 1 : 0.7 }) : null;
  const hatBand = look.hat ? plainMaterial(look.hat.accent, 'none', { roughness: 0.6 }) : null;
  const r = rig.current;
  // 半袖（Tシャツ）はひじから先が肌。ショーツ・スカートはひざから下が肌、スカートはももも肌で上にスカートをかぶせる
  const forearm = look.topStyle === 'tee' ? skin : shirt;
  const thighMat = look.bottomStyle === 'skirt' ? skin : pants;
  const shinMat = look.bottomStyle === 'pants' ? pants : skin;
  const outer = look.topStyle === 'jacket' || look.topStyle === 'coat';
  const puff = outer ? 1.07 : 1;
  const torso = lathe('torso', TORSO, 28), pelvis = lathe('pelvis', PELVIS, 28);
  const thigh = limbGeometry(0.078, 0.052, THIGH, 1.04, 0.3), shin = limbGeometry(0.052, 0.036, SHIN, 1.18, 0.3);
  const upperArm = limbGeometry(0.05 * puff, 0.038 * puff, UPPER_ARM, 1.06, 0.3), lowerArm = limbGeometry(0.039 * puff, 0.029, FOREARM, 1.08, 0.25);
  const neck = lathe('neck', [[0.05, -0.05], [0.043, 0.0], [0.042, 0.04], [0.046, 0.075]], 16);
  // ズボンのすそ・そでぐちを少し太く見せる筒（服を着ている感じ）
  const cuff = limbGeometry(0.058, 0.05, 0.06, 1, 0.5);

  return (
    <group ref={(g) => (r.root = g)}>
      <group ref={(g) => (r.hips = g)} position={[0, STAND_HIP, 0]}>
        {/* 骨盤 */}
        <mesh geometry={pelvis} scale={[1, 1, 0.74]} material={pants} castShadow />
        {look.bottomStyle === 'skirt' && <mesh geometry={lathe('skirt', SKIRT, 28)} scale={[1.05, 1, 0.82]} material={pants} castShadow />}
        {look.topStyle === 'coat' && <mesh geometry={lathe('coat', COAT_HEM, 28)} scale={[1.02, 1, 0.8]} material={shirt} castShadow />}
        {/* 足 */}
        {[0, 1].map((i) => (
          <group key={`leg${i}`} ref={(g) => (r.thigh[i] = g)} position={[(i === 0 ? -1 : 1) * HIP_X, 0, 0]}>
            <mesh geometry={thigh} scale={[1, 1, 1.05]} material={thighMat} castShadow />
            {look.bottomStyle === 'shorts' && <mesh geometry={limbGeometry(0.086, 0.07, THIGH * 0.62, 1, 0.5)} material={pants} castShadow />}
            <group ref={(g) => (r.knee[i] = g)} position={[0, -THIGH, 0]}>
              {/* ふくらはぎは後ろ側がふくらむ */}
              <mesh geometry={shin} position={[0, 0, 0.004]} scale={[0.95, 1, 1.08]} material={shinMat} castShadow />
              {look.bottomStyle === 'pants' && <mesh geometry={cuff} position={[0, -SHIN + 0.075, 0]} material={pants} />}
              <group ref={(g) => (r.ankle[i] = g)} position={[0, -SHIN, 0]}>
                {look.shoeStyle === 'boot' && (
                  <mesh position={[0, 0.03, 0]} material={shoe} castShadow>
                    <cylinderGeometry args={[0.048, 0.052, 0.13, 16]} />
                  </mesh>
                )}
                {/* 足の甲からつま先へ細くなる靴 */}
                <mesh position={[0, -0.035, -0.04]} scale={[0.85, look.shoeStyle === 'leather' ? 0.48 : 0.6, 2]} material={shoe} castShadow>
                  <sphereGeometry args={[0.062, 20, 12]} />
                </mesh>
                <mesh position={[0, -0.067, -0.04]} scale={[0.86, 0.13, 2.02]} material={sole}>
                  <sphereGeometry args={[0.064, 20, 8]} />
                </mesh>
              </group>
            </group>
          </group>
        ))}
        {/* 背骨から上 */}
        <group ref={(g) => (r.spine = g)} position={[0, 0.06, 0]}>
          <mesh geometry={torso} scale={[puff * 1.0, 1, puff * 0.66]} material={shirt} castShadow />
          {/* 胸と肩甲骨のふくらみで、筒ではなく人の胴に見せる */}
          <mesh position={[0, 0.33, -0.035]} scale={[1.55 * puff, 0.75, 0.62 * puff]} material={shirt}>
            <sphereGeometry args={[0.1, 20, 12]} />
          </mesh>
          {/* ジャケット・コートは前の合わせから中のシャツが見える。シャツは襟、パーカーはフード */}
          {outer && (
            <mesh position={[0, 0.36, -0.11]} rotation-x={0.12} scale={[1, 1, 0.35]} material={accent}>
              <coneGeometry args={[0.05, 0.2, 3]} />
            </mesh>
          )}
          {(look.topStyle === 'shirt' || outer) && (
            <mesh position={[0, 0.49, 0]} rotation-x={Math.PI / 2} scale={[1, 0.85, 1]} material={outer ? accent : shirt}>
              <torusGeometry args={[0.052, 0.014, 8, 20]} />
            </mesh>
          )}
          {look.topStyle === 'hoodie' && (
            <>
              <mesh position={[0, 0.47, 0.065]} scale={[1.25, 0.7, 0.9]} material={shirt} castShadow>
                <sphereGeometry args={[0.09, 16, 10]} />
              </mesh>
              {[-1, 1].map((s) => (
                <mesh key={`cord${s}`} position={[s * 0.03, 0.39, -0.106]} material={accent}>
                  <cylinderGeometry args={[0.004, 0.004, 0.1, 6]} />
                </mesh>
              ))}
            </>
          )}
          <mesh geometry={neck} position={[0, 0.5, 0]} material={skin} />
          <group ref={(g) => (r.head = g)} position={[0, 0.55, 0]}>
            {/* 頭は後ろが丸く、あごへ向かって細くなる */}
            <mesh position={[0, 0.115, 0.004]} scale={[0.9, 1.06, 1]} material={skin} castShadow>
              <sphereGeometry args={[0.104, 28, 20]} />
            </mesh>
            <mesh position={[0, 0.06, -0.03]} scale={[0.82, 0.72, 0.9]} material={skin}>
              <sphereGeometry args={[0.08, 22, 14]} />
            </mesh>
            {!mannequin && (
              <>
                {/* 鼻・目・口・耳で顔の向きがわかるように */}
                <mesh position={[0, 0.098, -0.104]} scale={[0.8, 1.3, 1]} material={skin}>
                  <sphereGeometry args={[0.016, 10, 8]} />
                </mesh>
                {[-1, 1].map((s) => (
                  <mesh key={`eye${s}`} position={[s * 0.034, 0.125, -0.09]} scale={[1, 1.15, 0.6]} material={eye}>
                    <sphereGeometry args={[0.011, 10, 8]} />
                  </mesh>
                ))}
                <mesh position={[0, 0.062, -0.094]} scale={[1.6, 0.35, 0.5]} material={lip}>
                  <sphereGeometry args={[0.012, 10, 6]} />
                </mesh>
                {[-1, 1].map((s) => (
                  <mesh key={s} position={[s * 0.094, 0.105, 0.005]} scale={[0.45, 1, 0.75]} material={skin}>
                    <sphereGeometry args={[0.026, 12, 8]} />
                  </mesh>
                ))}
                <mesh position={[0, 0.142, 0.014]} scale={[0.97, 0.9, 1.04]} material={hair} castShadow>
                  <sphereGeometry args={[0.11, 28, 16, 0, Math.PI * 2, 0, Math.PI / 1.8]} />
                </mesh>
              </>
            )}
            {look.hat && hatMat && hatBand && <Hat style={look.hat.style} material={hatMat} band={hatBand} />}
          </group>
          {/* 腕 */}
          {[0, 1].map((i) => (
            <group key={`arm${i}`} ref={(g) => (r.shoulder[i] = g)} position={[(i === 0 ? -1 : 1) * SHOULDER.x, SHOULDER.y, 0]}>
              {/* 肩（三角筋）は胴とつながるように丸く */}
              <mesh position={[(i === 0 ? 1 : -1) * 0.012, -0.005, 0]} scale={[1, 0.95, 0.9]} material={shirt} castShadow>
                <sphereGeometry args={[0.06 * puff, 18, 12]} />
              </mesh>
              <mesh geometry={upperArm} material={shirt} castShadow />
              {look.topStyle === 'tee' && <mesh geometry={limbGeometry(0.056, 0.05, UPPER_ARM * 0.55, 1, 0.5)} material={shirt} />}
              <group ref={(g) => (r.elbow[i] = g)} position={[0, -UPPER_ARM, 0]}>
                <mesh geometry={lowerArm} material={forearm} castShadow />
                {/* 手：手のひらと親指 */}
                <group position={[0, -FOREARM - 0.01, 0]}>
                  <mesh position={[0, -0.035, 0]} scale={[0.55, 1, 0.95]} material={skin} castShadow>
                    <sphereGeometry args={[0.042, 16, 12]} />
                  </mesh>
                  <mesh position={[(i === 0 ? 1 : -1) * 0.004, -0.02, -0.028]} rotation-x={0.5} scale={[0.6, 1, 0.6]} material={skin}>
                    <sphereGeometry args={[0.018, 10, 8]} />
                  </mesh>
                </group>
              </group>
            </group>
          ))}
        </group>
      </group>
      {children}
    </group>
  );
}

/** 帽子。頭のグループの中に置く（頭の中心は y = 0.115） */
function Hat({ style, material, band }: { style: string; material: THREE.Material; band: THREE.Material }) {
  if (style === 'cap') return <>
    <mesh position={[0, 0.15, 0.008]} scale={[0.98, 0.82, 1.05]} material={material} castShadow>
      <sphereGeometry args={[0.114, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
    </mesh>
    <mesh position={[0, 0.155, -0.12]} rotation-x={0.12} scale={[1, 1, 1.4]} material={material}>
      <cylinderGeometry args={[0.07, 0.07, 0.01, 18, 1, false, Math.PI / 2, Math.PI]} />
    </mesh>
  </>;
  if (style === 'beanie') return <mesh position={[0, 0.14, 0.008]} scale={[1.0, 1.12, 1.06]} material={material} castShadow>
    <sphereGeometry args={[0.115, 24, 14, 0, Math.PI * 2, 0, Math.PI / 1.9]} />
  </mesh>;
  return <group position={[0, 0.19, 0.008]}>
    <mesh position={[0, 0.05, 0]} material={material} castShadow><cylinderGeometry args={[0.088, 0.103, 0.11, 24]} /></mesh>
    <mesh position={[0, 0.012, 0]} material={band}><cylinderGeometry args={[0.105, 0.105, 0.026, 24]} /></mesh>
    <mesh material={material} castShadow><cylinderGeometry args={[0.19, 0.19, 0.01, 32]} /></mesh>
  </group>;
}
