// 賃貸に出した家に住むNPCの住人。家具（ソファ・ベッド・ダイニングなど）のそばで過ごし、ときどき別の場所へ移る
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { House } from '../building/types';
import { floorY } from '../building/dimensions';
import { AvatarModel, useRig } from './Avatar';
import { satisfaction, residentSeeds } from '../economy/tenants';
import { HAIR_STYLES, SKIN_TONES, HAIR_COLORS, sanitizeLooks } from '../catalog/looks';
import { garmentsOf } from '../catalog/clothes';
import { BOUTIQUE_IDS } from '../building/boutiques';
import type { Outfit, Slot } from '../catalog/clothes';

const SPOT_TYPES = ['sofa', 'sofa-l', 'bed-double', 'bed-single', 'dining', 'chair', 'desk', 'tv', 'kitchen', 'kitchen-island', 'low-table', 'zataku'];

function outfitFor(seed: number): Outfit {
  const items = garmentsOf(BOUTIQUE_IDS[seed % BOUTIQUE_IDS.length]);
  const pick = (slot: Slot, k: number) => { const s = items.filter((g) => g.slot === slot); return s.length ? s[(seed >>> k) % s.length].id : null; };
  return { top: pick('top', 3), bottom: pick('bottom', 7), shoes: pick('shoes', 11), hat: null };
}

function Resident({ seed, spots, index }: { seed: number; spots: { x: number; y: number; z: number; yaw: number }[]; index: number }) {
  const rig = useRig();
  const group = useRef<THREE.Group>(null);
  const looks = useMemo(() => sanitizeLooks({
    sex: seed % 2 ? 'f' : 'm', build: 'normal', skin: (seed >>> 2) % SKIN_TONES.length, face: (seed >>> 5) % 3,
    hair: HAIR_STYLES[(seed >>> 8) % HAIR_STYLES.length].id, hairColor: (seed >>> 12) % HAIR_COLORS.length,
  }), [seed]);
  const outfit = useMemo(() => outfitFor(seed), [seed]);
  const state = useRef({ spot: index % spots.length, until: 4 + (seed % 9), fade: 1 });
  useFrame(({ clock }, dt) => {
    const g = group.current;
    if (!g || !spots.length) return;
    const st = state.current, t = clock.elapsedTime;
    // しばらくしたら別の家具のそばへ移る（壁をすり抜けないよう、いったん消えて現れる）
    if (t > st.until) { st.fade -= dt * 3; if (st.fade <= 0) { st.spot = (st.spot + 1 + (seed % 3)) % spots.length; st.until = t + 10 + ((seed >>> 4) % 12); st.fade = 0; } }
    else st.fade = Math.min(1, st.fade + dt * 3);
    const s = spots[st.spot];
    g.position.set(s.x, s.y + Math.abs(Math.sin(t * 1.6 + seed)) * 0.01, s.z);
    g.rotation.y = s.yaw + Math.sin(t * 0.4 + seed) * 0.25;
    g.scale.setScalar(Math.max(0.001, st.fade));
  });
  return <group ref={group}><AvatarModel rig={rig} looks={looks} outfit={outfit} /></group>;
}

/** house の座標（土地の左上が原点）にそのまま置く。親の group で土地の位置へ動かす */
export function Tenants({ house, lotId }: { house: House; lotId: string }) {
  const { residents } = useMemo(() => satisfaction(house), [house]);
  const spots = useMemo(() => {
    const list = house.furniture.filter((f) => SPOT_TYPES.includes(f.type)).map((f) => {
      const yaw = (f.rotation * Math.PI) / 180;
      // 家具の正面に0.8m離れて、家具の方を向いて立つ
      return { x: f.x + Math.sin(yaw) * 0.8, y: floorY(f.level), z: f.z + Math.cos(yaw) * 0.8, yaw: yaw + Math.PI };
    });
    return list;
  }, [house]);
  const seeds = useMemo(() => residentSeeds(lotId, residents), [lotId, residents]);
  if (!spots.length) return null;
  return <group name="tenants">{seeds.map((s, i) => <Resident key={i} seed={s} spots={spots} index={i * 2} />)}</group>;
}
