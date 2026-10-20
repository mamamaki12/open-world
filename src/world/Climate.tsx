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

/** 今の気候を返す（毎フレーム再描画しない） */
export function useClimate(): Climate {
  const [c, setC] = useState(() => climateAt(now()));
  useEffect(() => {
    // 再描画はゲーム内10分（実10秒）ごと、または天気・季節が変わったときだけ
    const id = setInterval(() => {
      const n = climateAt(now());
      setC((o) => (Math.floor(o.hour * 6) === Math.floor(n.hour * 6) && o.weather === n.weather && o.season === n.season ? o : n));
    }, 1000);
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
  const fog = useMemo(() => new THREE.Fog('#dfeaff', 900, 2000), []);
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
    // 霧は付けたり外したりしない（外すと全部の材質のシェーダーを作り直して重くなる）。晴れの日は遠くへ追いやる
    fog.color.copy(fogColor);
    fog.near = wet ? 25 : c.weather === 'cloudy' ? 60 : 900;
    fog.far = wet ? 160 : c.weather === 'cloudy' ? 320 : 2000;
  }, [c.night, c.season, c.weather, day, dim, wet, scene, fog]);

  return (
    <>
      <primitive attach="fog" object={fog} />
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

/** 上から見た「覆い（屋根・車など）」の高さを測る範囲と解像度 */
const COVER_RES = 128;
const COVER_UP = 30;
const COVER_FAR = 80;

/** 屋根や車の下では雨・雪の粒を描かない（上から見た深度で判定する）。 */
function shelterShader(mat: THREE.Material, cover: { tex: THREE.Texture; cam: THREE.OrthographicCamera }) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.coverTex = { value: cover.tex };
    sh.uniforms.coverCam = { value: cover.cam.position };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vCoverWorld;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvCoverWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
varying vec3 vCoverWorld;
uniform sampler2D coverTex;
uniform vec3 coverCam;`,
      )
      .replace(
        'void main() {',
        `void main() {
  vec2 cuv = (vCoverWorld.xz - coverCam.xz) / ${BOX.toFixed(1)} + 0.5;
  cuv.y = 1.0 - cuv.y;
  if (cuv.x > 0.0 && cuv.x < 1.0 && cuv.y > 0.0 && cuv.y < 1.0) {
    float coverY = coverCam.y - texture2D(coverTex, cuv).r * ${COVER_FAR.toFixed(1)};
    if (vCoverWorld.y < coverY - 0.05) discard;
  }`,
      );
  };
}

/** カメラの周りに雨・雪を降らせる。雨は細い線、雪は丸い粒。屋根・車の下には降らない */
function Precipitation({ snow }: { snow: boolean }) {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
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
  // 真上から見下ろすカメラで、いちばん上にある物（屋根・車の屋根・木など）の高さを測る
  const cover = useMemo(() => {
    const target = new THREE.WebGLRenderTarget(COVER_RES, COVER_RES, { depthBuffer: true });
    target.depthTexture = new THREE.DepthTexture(COVER_RES, COVER_RES);
    const h = BOX / 2;
    const cam = new THREE.OrthographicCamera(-h, h, h, -h, 0, COVER_FAR);
    cam.rotation.x = -Math.PI / 2;
    return { target, cam, tex: target.depthTexture as THREE.Texture, blank: new THREE.MeshBasicMaterial({ colorWrite: false }) };
  }, []);
  useEffect(() => () => { cover.target.dispose(); cover.blank.dispose(); }, [cover]);
  const mat = useMemo(() => {
    const m = snow
      ? new THREE.PointsMaterial({ color: '#ffffff', map: flake(), alphaTest: 0.3, size: 0.14, transparent: true, opacity: 0.95, depthWrite: false })
      : new THREE.LineBasicMaterial({ color: '#c4d2e0', transparent: true, opacity: 0.35, depthWrite: false });
    shelterShader(m, cover);
    return m;
  }, [snow, cover]);
  useEffect(() => () => mat.dispose(), [mat]);
  const ref = useRef<THREE.Group>(null);
  const frame = useRef(0);
  useFrame((state, dt) => {
    const obj = ref.current;
    if (!obj) return;
    obj.position.copy(camera.position);
    // 覆いの高さは数フレームごとに測り直す（車が動くので）
    if (frame.current++ % 3 === 0) {
      cover.cam.position.set(camera.position.x, camera.position.y + COVER_UP, camera.position.z);
      cover.cam.updateMatrixWorld();
      const prevTarget = gl.getRenderTarget(), prevOverride = scene.overrideMaterial, prevShadow = gl.shadowMap.autoUpdate, prevFog = scene.fog;
      obj.visible = false;
      scene.overrideMaterial = cover.blank;
      gl.shadowMap.autoUpdate = false;
      gl.setRenderTarget(cover.target);
      gl.clear();
      gl.render(scene, cover.cam);
      gl.setRenderTarget(prevTarget);
      gl.shadowMap.autoUpdate = prevShadow;
      scene.overrideMaterial = prevOverride;
      scene.fog = prevFog;
      obj.visible = true;
    }
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
  return (
    <group ref={ref}>
      {snow ? (
        <points geometry={geo} material={mat} frustumCulled={false} />
      ) : (
        <lineSegments geometry={geo} material={mat} frustumCulled={false} />
      )}
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
