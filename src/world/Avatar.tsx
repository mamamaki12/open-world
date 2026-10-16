// プレイヤーの人形：丸みのある体と関節（腰・ひざ・足首・肩・ひじ・首）。
// 足は2関節のIK（足もとの位置からももとすねの角度を出す）で地面に付け、
// 歩き・走り・しゃがみ・ジャンプ・着地・窓によじ登る動きを、毎フレームなめらかにつなぐ。
import { useRef } from 'react';
import { TailoredLimb } from './TailoredLimb';
import type { MutableRefObject, ReactNode } from 'react';
import * as THREE from 'three';
import { plainMaterial } from './materials';
import { getGarment } from '../catalog/clothes';
import type { Outfit } from '../catalog/clothes';
import { useWardrobe } from '../state/wardrobe';
import { useLooks } from '../state/looks';
import { DEFAULT_LOOKS, FACES, HAIR_COLORS, SKIN_TONES, buildWidth, getHair } from '../catalog/looks';
import type { HairShape, Looks } from '../catalog/looks';

/** 体の寸法（m）。体は -Z が正面、原点は足もと */
const THIGH = 0.43;
const SHIN = 0.42;
const ANKLE_Y = 0.075;
const UPPER_ARM = 0.27;
const FOREARM = 0.25;
const HAND = 0.04;
const HIP_X = 0.095;
const SHOULDER = { x: 0.205, y: 0.405 };
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
  const g = new THREE.LatheGeometry(new THREE.SplineCurve(profile.map(([r, y]) => new THREE.Vector2(r, y))).getPoints(profile.length * 6).map(p => new THREE.Vector2(Math.max(p.x, 0.0001), p.y)), segments);
  g.computeVertexNormals();
  geometries.set(key, g);
  return g;
}
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

/** The animation groups stay unchanged; continuous skinned limbs follow their joints. */
export function AvatarModel({rig,children,outfit,looks,mannequin=false}:{rig:MutableRefObject<Rig>;children?:ReactNode;outfit?:Outfit;looks?:Looks;mannequin?:boolean}) {
  const worn=useWardrobe(s=>s.outfit),mine=useLooks(s=>s.looks),look=outfitLook(outfit??worn),r=rig.current;
  const me=mannequin?DEFAULT_LOOKS:looks??mine,female=me.sex==='f',bw=buildWidth(me.build),face=FACES[me.face]??FACES[0];
  /** 肩幅・腰幅：女性は肩が狭く腰が少し広い。体型で全体の幅を変える */
  const sw=bw*(female?.92:1),hw=bw*(female?1.07:1);
  const skin=plainMaterial(mannequin?'#ece8e0':SKIN_TONES[me.skin]??SKIN_TONES[1],'none',{roughness:.65});
  const shirt=plainMaterial(look.top,'none',{roughness:look.topStyle==='knit'||look.topStyle==='hoodie'?1:.85});
  const accent=plainMaterial(look.topAccent,'none',{roughness:.85});
  const pants=plainMaterial(look.bottom,'none',{roughness:.9});
  const hair=plainMaterial(HAIR_COLORS[me.hairColor]?.color??'#2a221d','none',{roughness:.9});
  const shoe=plainMaterial(look.shoe,'none',{roughness:look.shoeStyle==='leather'?.3:.7});
  const sole=plainMaterial(look.shoeStyle==='leather'?'#1a1310':look.shoeAccent??'#d9d6cf','none',{roughness:.8});
  const eye=plainMaterial('#252222'),lip=plainMaterial(female?'#c46f6a':'#c98f7c');
  const hatMat=look.hat?plainMaterial(look.hat.color):null,hatBand=look.hat?plainMaterial(look.hat.accent):null;
  const outer=look.topStyle==='jacket'||look.topStyle==='coat',coat=look.topStyle==='coat',hood=look.topStyle==='hoodie';
  const volume=outer?1.14:hood?1.12:1.04;
  const topProfile:[number,number][]=[
    [coat?.212:.192,coat?-.375:-.125],[coat?.22:.198,coat?-.37:-.12],[coat?.22:.198,coat?-.35:-.10],[coat?.218:.195,coat?-.33:-.08],
    [.19,-.04],[.184,.1],[.19,.26],[.197,.38],[.19,.425],[.151,.465],[.07,.49],[.051,.495]
  ];
  const body=lathe('tailored-top-'+look.topStyle,topProfile,40);
  const panel=(key:string,points:[number,number][])=>{const old=geometries.get(key);if(old)return old;const shape=new THREE.Shape(points.map(([x,y])=>new THREE.Vector2(x,y)));const geo=new THREE.ShapeGeometry(shape);geometries.set(key,geo);return geo;};
  const pelvis=lathe('tailored-hip',[[0,-.105],[.09,-.1],[.157,-.055],[.17,.02],[.16,.08],[.135,.12],[0,.12]],32);
  const head=lathe('smooth-head',[[0,.012],[.034,.018],[.061,.042],[.083,.085],[.097,.132],[.093,.176],[.071,.206],[.035,.224],[0,.23]],40);
  const wide=getGarment((outfit??worn).bottom)?.id==='ak-wide';
  return <group ref={g=>(r.root=g)}>
    <group ref={g=>(r.hips=g)} position={[0,STAND_HIP,0]}>
      <mesh geometry={pelvis} scale={[hw,1,.78*Math.sqrt(hw)]} material={pants} castShadow/>
      {look.bottomStyle==='skirt'&&<mesh geometry={lathe('draped-skirt',[[.27,-.51],[.26,-.49],[.235,-.3],[.195,-.1],[.17,.035],[.15,.085],[0,.085]],48)} scale={[1,1,.8]} material={pants} castShadow/>}
      {[0,1].map(i=><group key={'leg'+i} ref={g=>(r.thigh[i]=g)} position={[(i===0?-1:1)*HIP_X,0,0]}>
        <TailoredLimb rig={rig} index={i} leg style={look.bottomStyle} wide={wide} cloth={pants} skin={skin}/>
        <group ref={g=>(r.knee[i]=g)} position={[0,-THIGH,0]}><group ref={g=>(r.ankle[i]=g)} position={[0,-SHIN,0]}>
          {look.shoeStyle==='boot'&&<mesh position={[0,.035,0]} material={shoe} castShadow><cylinderGeometry args={[.05,.055,.15,24]}/></mesh>}
          <mesh position={[0,-.032,-.042]} scale={[.94,look.shoeStyle==='leather'?.48:.63,1.95]} material={shoe} castShadow><sphereGeometry args={[.065,24,16]}/></mesh>
          <mesh position={[0,-.067,-.042]} scale={[.95,.13,1.96]} material={sole}><sphereGeometry args={[.066,24,12]}/></mesh>
        </group></group>
      </group>)}
      <group ref={g=>(r.spine=g)} position={[0,.06,0]}>
        {/* A hanging garment shell, with no exposed anatomical chest shapes. */}
        <mesh geometry={body} scale={[volume*sw,1,volume*.78*Math.sqrt(bw)]} material={shirt} castShadow/>
        {outer&&<>
          <mesh geometry={panel('inner-shirt',[[-.052,.465],[.052,.465],[.038,.11],[-.038,.11]])} position={[0,0,-.175*volume]} rotation-y={Math.PI} material={accent}/>
          {[-1,1].map(side=><group key={'lapel'+side}>
            <mesh geometry={panel('lapel'+side,[[side*.047,.476],[side*.11,.41],[side*.063,.268],[side*.012,.418]])} position={[0,0,-.18*volume]} rotation-y={Math.PI} material={shirt}/>
            <mesh position={[side*.118,.095,-.146*volume]} rotation-z={side*.08} material={accent}><boxGeometry args={[.065,.008,.006]}/></mesh>
          </group>)}
          {[.19,.08,-.03].map(y=><mesh key={y} position={[.025,y,-.15*volume]} rotation-x={Math.PI/2} material={sole}><cylinderGeometry args={[.005,.005,.004,12]}/></mesh>)}
        </>}
        {look.topStyle==='shirt'&&<>
          {[-1,1].map(side=><mesh key={'collar'+side} geometry={panel('shirt-collar'+side,[[side*.02,.495],[side*.067,.47],[side*.052,.422],[0,.47]])} rotation-y={Math.PI} position={[0,0,-.13]} material={accent}/>)}
          <mesh position={[0,.2,-.171]} material={accent}><boxGeometry args={[.009,.43,.004]}/></mesh>
          {[.09,.17,.25,.33].map(y=><mesh key={y} position={[0,y,-.175]} material={sole}><sphereGeometry args={[.003,8,6]}/></mesh>)}
        </>}
        <mesh geometry={lathe('neck-smooth',[[.049,-.02],[.045,.02],[.041,.065],[.042,.09]],24)} position={[0,.48,0]} material={skin}/>
        <mesh position={[0,.5,0]} rotation-x={Math.PI/2} scale={[1,.8,1]} material={look.topStyle==='shirt'?accent:shirt}><torusGeometry args={[.056,outer?.014:.009,12,32]}/></mesh>
        {hood&&<>
          <mesh position={[0,.448,.087]} scale={[1.4,.9,.8]} material={shirt} castShadow><sphereGeometry args={[.09,24,16]}/></mesh>
          {[-1,1].map(side=><mesh key={side} position={[side*.035,.365,-.153]} material={accent}><cylinderGeometry args={[.003,.003,.13,8]}/></mesh>)}
          <mesh position={[0,.07,-.155]} scale={[1.7,.65,.12]} material={shirt}><sphereGeometry args={[.08,24,12]}/></mesh>
        </>}
        <group ref={g=>(r.head=g)} position={[0,.55,0]}>
          <mesh geometry={head} scale={[.94,1,1]} material={skin} castShadow/>
          {!mannequin&&<>
            <mesh position={[0,.102,-.092]} scale={[.7*face.nose,1.15*face.nose,face.nose]} material={skin}><sphereGeometry args={[.014,16,12]}/></mesh>
            {[-1,1].map(side=><group key={side}>
              <mesh position={[side*.033,.131,-.087]} scale={[face.eye,.65*face.eye,.35]} material={eye}><sphereGeometry args={[.009,16,10]}/></mesh>
              {female&&<mesh position={[side*.035,.137,-.088]} rotation-z={-side*.15} scale={[1.6*face.eye,.16,.25]} material={eye}><sphereGeometry args={[.009,12,8]}/></mesh>}
              <mesh position={[side*.033,.149,-.085]} rotation-z={side*face.brow} scale={[female?1.4:1.6,female?.16:.24,.25]} material={hair}><sphereGeometry args={[.009,12,8]}/></mesh>
              <mesh position={[side*.09,.108,0]} scale={[.4,1,.7]} material={skin}><sphereGeometry args={[.025,16,12]}/></mesh>
            </group>)}
            <mesh position={[0,.062,-.073]} scale={[1.5,.22,.3]} material={lip}><sphereGeometry args={[.011,16,8]}/></mesh>
            <group scale={look.hat?.94:1}><Hair shape={getHair(me.hair).shape} material={hair}/></group>
          </>}
          {look.hat&&hatMat&&hatBand&&<Hat style={look.hat.style} material={hatMat} band={hatBand}/>}
        </group>
        {[0,1].map(i=><group key={'arm'+i} ref={g=>(r.shoulder[i]=g)} rotation-z={(i===0?-1:1)*.12} position={[(i===0?-1:1)*SHOULDER.x*sw,SHOULDER.y,0]}>
          <TailoredLimb rig={rig} index={i} style={look.topStyle} cloth={shirt} skin={skin}/>
          <group ref={g=>(r.elbow[i]=g)} position={[0,-UPPER_ARM,0]}>
            <group position={[0,-FOREARM-.005,0]}>
              <mesh position={[0,-.03,0]} scale={[.58,1,.84]} material={skin} castShadow><sphereGeometry args={[.042,24,16]}/></mesh>
              <mesh position={[(i===0?1:-1)*.018,-.015,-.017]} rotation-x={.5} scale={[.6,1,.6]} material={skin}><sphereGeometry args={[.018,16,10]}/></mesh>
            </group>
          </group>
        </group>)}
      </group>
    </group>
    {children}
  </group>;
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

/** 髪。頭のグループの中に置く（頭の中心はおよそ y = 0.13、顔は -Z） */
const PI=Math.PI;
function Shell({r,y=.13,z=.004,phi=[0,2*PI],theta,sx=.96,sy=1,material}:{r:number;y?:number;z?:number;phi?:[number,number];theta:number;sx?:number;sy?:number;material:THREE.Material}){
  return <mesh position={[0,y,z]} scale={[sx,sy,1.03]} material={material} castShadow><sphereGeometry args={[r,32,18,phi[0],phi[1],0,theta]}/></mesh>;
}
/** 後ろ半分（+Z）に回り込む部分。spread で顔の横へどれだけ回り込むか */
const back=(spread:number):[number,number]=>[-spread,PI+2*spread];
export function Hair({shape,material:m}:{shape:HairShape;material:THREE.Material}){
  switch(shape){
    case 'buzz':return <Shell r={.1} theta={PI*.56} sy={.98} material={m}/>;
    case 'short':return <><Shell r={.107} y={.135} theta={PI*.42} material={m}/><Shell r={.105} phi={back(.1)} theta={PI*.62} material={m}/></>;
    case 'twoblock':return <><Shell r={.099} phi={back(.15)} theta={PI*.62} material={m}/><Shell r={.114} y={.142} theta={PI*.36} sy={.95} material={m}/></>;
    case 'mash':return <><Shell r={.116} y={.13} theta={PI*.47} sy={.98} material={m}/><Shell r={.11} phi={back(.25)} theta={PI*.64} material={m}/></>;
    case 'bob':return <><Shell r={.114} y={.135} theta={PI*.44} material={m}/><Shell r={.116} y={.125} phi={back(.65)} theta={PI*.8} sx={.98} material={m}/></>;
    case 'wavy':return <><Shell r={.116} y={.135} theta={PI*.44} material={m}/><Shell r={.118} y={.125} phi={back(.6)} theta={PI*.78} sx={1} material={m}/>
      {Array.from({length:9},(_,i)=>{const a=-.55+i*(PI+1.1)/8;return <mesh key={i} position={[-Math.cos(a)*.105,.03+Math.abs(Math.sin(i*1.7))*.02,Math.sin(a)*.105+.005]} material={m}><sphereGeometry args={[.035,14,10]}/></mesh>;})}</>;
    case 'long':return <><Shell r={.113} y={.135} theta={PI*.44} material={m}/><Shell r={.115} y={.125} phi={back(.55)} theta={PI*.75} material={m}/>
      <mesh position={[0,-.03,.07]} scale={[1,1,.42]} material={m} castShadow><cylinderGeometry args={[.105,.085,.3,24]}/></mesh>
      <mesh position={[0,-.18,.07]} scale={[1,.35,.42]} material={m}><sphereGeometry args={[.085,20,12]}/></mesh></>;
    case 'pony':return <><Shell r={.108} y={.134} theta={PI*.44} material={m}/><Shell r={.106} phi={back(.1)} theta={PI*.66} material={m}/>
      <mesh position={[0,.15,.115]} material={m}><sphereGeometry args={[.03,14,10]}/></mesh>
      <mesh position={[0,.04,.15]} rotation-x={PI-.25} material={m} castShadow><coneGeometry args={[.045,.24,16]}/></mesh></>;
    case 'bun':return <><Shell r={.107} y={.134} theta={PI*.44} material={m}/><Shell r={.105} phi={back(.1)} theta={PI*.64} material={m}/>
      <mesh position={[0,.235,.06]} material={m} castShadow><sphereGeometry args={[.052,20,14]}/></mesh></>;
  }
}
