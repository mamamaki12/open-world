// 季節・天気・昼夜の見た目：空、太陽、霧、街灯と窓の明かり、雨・雪の粒、冬の地面。
import { Sky } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { climateAt, type Climate } from './climate';
import { glassMaterial } from './materials';
import { MAT as STREET } from './Streetscape';
import { grassMaterial } from './Town';

// 確認用：?climateAt=<UTCミリ秒> でその時刻の空にする
const AT = Number(new URLSearchParams(globalThis.location?.search ?? '').get('climateAt')) || 0;
const START = Date.now();
const now = () => (AT ? AT + (Date.now() - START) : Date.now());

/** 0.5 秒ごとに今の気候を返す（毎フレーム再描画しない） */
export function useClimate(): Climate {
  const [c, setC] = useState(() => climateAt(now()));
  useEffect(() => {
    const id = setInterval(() => setC(climateAt(now())), 500);
    return () => clearInterval(id);
  }, []);
  return c;
}

const DAY_SKY = new THREE.Color('#dfeaff');
const NIGHT_SKY = new THREE.Color('#1c2440');
const GREY = new THREE.Color('#9aa3ad');
const WHITE = new THREE.Color('#ffffff');
const WINDOW_GLOW = new THREE.Color('#ffc978');

export function ClimateLights({ center, shadowSize }: { center: [number, number, number]; shadowSize: number }) {
  const c = useClimate();
  const scene = useThree((s) => s.scene);
  const sunRef = useRef<THREE.DirectionalLight>(null);
  const hemiRef = useRef<THREE.HemisphereLight>(null);
  const wet = c.weather === 'rain' || c.weather === 'snow';
  const dim = c.weather === 'clear' ? 1 : wet ? 0.45 : 0.6;
  const day = 1 - c.night;

  // 太陽は東から昇って西へ沈む。夜は月（弱い青い光）として反対側に
  const angle = ((c.hour - 6) / 24) * Math.PI * 2;
  const up = Math.abs(Math.sin(angle));
  const sunPos: [number, number, number] = [center[0] + Math.cos(angle) * 30 * (c.sun >= 0 ? 1 : -1), 6 + up * 24, center[2] + 12];
  const skySun: [number, number, number] = [Math.cos(angle) * 100, Math.sin(angle) * 100, 40];

  useEffect(() => {
    const k = c.night;
    STREET.lamp.emissiveIntensity = 0.9 + k * 3;
    const g = glassMaterial();
    g.emissive.copy(WINDOW_GLOW);
    g.emissiveIntensity = k * 0.9;
    const grass = grassMaterial();
    grass.emissive.set(c.season === 'winter' ? '#c9d0d8' : '#000000');
    grass.emissiveIntensity = c.season === 'winter' ? 0.55 * (0.3 + 0.7 * day) : 0;
    if (c.season === 'winter') grass.color.set('#e8edf2');
    else if (c.season === 'autumn') grass.color.set('#e9d6a8');
    else if (c.season === 'summer') grass.color.set('#f2ffe8');
    else grass.color.copy(WHITE);
    scene.environmentIntensity = 0.12 + 0.88 * day * dim;
    const fogColor = DAY_SKY.clone().lerp(GREY, wet ? 0.6 : c.weather === 'cloudy' ? 0.3 : 0).lerp(NIGHT_SKY, k);
    if (wet || c.weather === 'cloudy') scene.fog = new THREE.Fog(fogColor, wet ? 25 : 60, wet ? 160 : 320);
    else scene.fog = null;
  }, [c.night, c.season, c.weather, day, dim, wet, scene]);

  return (
    <>
      <Sky
        sunPosition={skySun}
        turbidity={c.weather === 'clear' ? 4 : 12}
        rayleigh={c.weather === 'clear' ? 1.2 : 3}
        mieCoefficient={0.004}
        mieDirectionalG={0.85}
      />
      {c.night > 0.5 && <NightDome />}
      <hemisphereLight ref={hemiRef} args={[c.night > 0.5 ? '#5a6a99' : '#dfeaff', '#bdb6a6', 0.15 + 0.4 * day * dim]} />
      <directionalLight
        ref={sunRef}
        position={sunPos}
        intensity={c.sun >= 0 ? 0.2 + 2.4 * day * dim : 0.25}
        color={c.sun >= 0 ? (c.sun < 0.3 ? '#ffc58a' : '#fff3e2') : '#9db4ff'}
        castShadow
        shadow-mapSize={[shadowSize, shadowSize]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-camera-left={-36}
        shadow-camera-right={36}
        shadow-camera-top={36}
        shadow-camera-bottom={-36}
        shadow-camera-near={1}
        shadow-camera-far={110}
      >
        <object3D attach="target" position={center} />
      </directionalLight>
      {(c.weather === 'rain' || c.weather === 'snow') && <Precipitation snow={c.weather === 'snow'} />}
    </>
  );
}

/** 夜空：暗い球に星を散らす */
function NightDome() {
  const stars = useMemo(() => {
    const p = new Float32Array(600 * 3);
    for (let i = 0; i < 600; i++) {
      const u = Math.random() * Math.PI * 2;
      const v = Math.random() * 0.45 * Math.PI;
      p.set([Math.cos(u) * Math.cos(v) * 600, Math.sin(v) * 600 + 20, Math.sin(u) * Math.cos(v) * 600], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    return g;
  }, []);
  const camera = useThree((s) => s.camera);
  const ref = useRef<THREE.Group>(null);
  useFrame(() => ref.current?.position.copy(camera.position));
  return (
    <group ref={ref}>
      <points geometry={stars}>
        <pointsMaterial color="#ffffff" size={2} sizeAttenuation={false} fog={false} />
      </points>
    </group>
  );
}

const DROPS = 2500;
const BOX = 40;
/** 雨粒の長さ（m） */
const STREAK = 0.45;

/** カメラの周りに雨・雪を降らせる。雨は細い線、雪は丸い粒 */
function Precipitation({ snow }: { snow: boolean }) {
  const camera = useThree((s) => s.camera);
  const per = snow ? 1 : 2;
  const geo = useMemo(() => {
    const p = new Float32Array(DROPS * per * 3);
    for (let i = 0; i < DROPS; i++) {
      const x = (Math.random() - 0.5) * BOX, y = (Math.random() - 0.5) * BOX, z = (Math.random() - 0.5) * BOX;
      for (let k = 0; k < per; k++) p.set([x + k * 0.05, y + k * STREAK, z], (i * per + k) * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    return g;
  }, [per]);
  const ref = useRef<THREE.Group>(null);
  useFrame((state, dt) => {
    const obj = ref.current;
    if (!obj) return;
    obj.position.copy(camera.position);
    const a = geo.attributes.position as THREE.BufferAttribute;
    const arr = a.array as Float32Array;
    const fall = (snow ? 2 : 18) * Math.min(dt, 0.1);
    const t = state.clock.elapsedTime;
    for (let i = 0; i < DROPS * per; i++) {
      arr[i * 3 + 1] -= fall;
      if (snow) arr[i * 3] += Math.sin(t + i) * 0.01;
    }
    for (let i = 0; i < DROPS; i++) {
      const j = i * per * 3 + 1;
      if (arr[j] < -BOX / 2) for (let k = 0; k < per; k++) arr[j + k * 3] += BOX;
    }
    a.needsUpdate = true;
  });
  if (!snow) {
    return (
      <group ref={ref}>
        <lineSegments geometry={geo} frustumCulled={false}>
          <lineBasicMaterial color="#c4d2e0" transparent opacity={0.35} depthWrite={false} />
        </lineSegments>
      </group>
    );
  }
  return (
    <group ref={ref}>
      <points geometry={geo} frustumCulled={false}>
        <pointsMaterial color="#ffffff" map={flake()} alphaTest={0.3} size={0.14} transparent opacity={0.95} depthWrite={false} />
      </points>
    </group>
  );
}

let flakeTex: THREE.Texture | null = null;
/** 雪の粒を丸く見せる小さなテクスチャ */
function flake(): THREE.Texture {
  if (flakeTex) return flakeTex;
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d')!;
  const r = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  r.addColorStop(0, 'rgba(255,255,255,1)');
  r.addColorStop(0.6, 'rgba(255,255,255,0.8)');
  r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, 32, 32);
  return (flakeTex = new THREE.CanvasTexture(c));
}
