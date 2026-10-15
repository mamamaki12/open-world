// 町：大通りと、その沿いに並ぶ区画（ほかの持っている土地の家・売り土地の看板）とカジノ。
// いま建てている土地はいつも原点にあるので、ほかのものは区画の番号の差だけ横にずらして描く
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { GRID, LOT_D, LOT_W } from '../building/dimensions';
import type { House } from '../building/types';
import { getLocation, landPrice } from '../economy/market';
import { yen } from '../economy/money';
import { CASINO_PLOT, FIRST_PLOT, LAST_PLOT, PLOT_PITCH, districtOf, plotX } from '../economy/town';
import { lotHouse, useCurrentPlot, useEconomy } from '../state/economy';
import { CasinoBuilding } from './CasinoBuilding';
import { EstateBuilding } from './EstateBuilding';
import { HouseParts } from './HouseView';
import { grassTexture } from './textures';

const lotW = LOT_W * GRID;
const lotD = LOT_D * GRID;
const ROAD_Z = lotD + 3.2;
/** 草地を並べる1枚の幅（草の模様の大きさを変えないよう、同じ大きさの板を並べる） */
const TILE = 240;
const WEST = plotX(FIRST_PLOT) - 80;
const EAST = plotX(LAST_PLOT) + lotW + 80;

export function Town() {
  const here = useCurrentPlot();
  const lots = useEconomy((s) => s.lots);
  const currentLotId = useEconomy((s) => s.currentLotId);
  const offers = useEconomy((s) => s.offers);
  const market = useEconomy((s) => s.market);
  const shift = -plotX(here);
  const tiles = useMemo(() => {
    const out: number[] = [];
    for (let x = WEST; x < EAST; x += TILE) out.push(x + TILE / 2);
    return out;
  }, []);

  return (
    <group>
      {/* 地面と大通りは町の座標で描き、いまの区画のぶんだけずらす */}
      <group position={[shift, 0, 0]}>
        {tiles.map((x) => (
          <mesh key={x} rotation-x={-Math.PI / 2} position={[x, -0.02, lotD / 2]} receiveShadow>
            <planeGeometry args={[TILE, TILE]} />
            <meshStandardMaterial map={grassTexture()} roughness={1} />
          </mesh>
        ))}
        <mesh rotation-x={-Math.PI / 2} position={[(WEST + EAST) / 2, -0.01, ROAD_Z]} receiveShadow>
          <planeGeometry args={[EAST - WEST, 6]} />
          <meshStandardMaterial color="#55585c" roughness={0.95} />
        </mesh>
        <mesh rotation-x={-Math.PI / 2} position={[(WEST + EAST) / 2, -0.005, ROAD_Z]}>
          <planeGeometry args={[EAST - WEST, 0.12]} />
          <meshStandardMaterial color="#e8e6df" roughness={0.9} />
        </mesh>
        <group position={[plotX(CASINO_PLOT), 0, 0]}>
          <CasinoBuilding />
          <EstateBuilding />
        </group>
        {/* 地区の境目の看板 */}
        {[FIRST_PLOT, ...[3, 9].filter((p) => p <= LAST_PLOT)].map((p) => (
          <DistrictSign key={p} plot={p} />
        ))}
      </group>

      <group name="neighbors">
        {lots.map((l) => {
          if (typeof l.plot !== 'number') return null;
          const house = lotHouse(l);
          const x = plotX(l.plot) + shift;
          const current = l.id === currentLotId;
          return (
            <group key={l.id} position={[x, 0, 0]}>
              {!current && (
                <mesh rotation-x={-Math.PI / 2} position={[lotW / 2, 0.002, lotD / 2]} receiveShadow>
                  <planeGeometry args={[lotW, lotD]} />
                  <meshStandardMaterial color="#b9b2a3" roughness={1} />
                </mesh>
              )}
              {!current && house && <StaticHouse house={house} />}
              <Signboard
                lines={[current ? 'いまの土地' : 'あなたの土地', l.name.replace(/（.*）$/, ''), l.construction ? '工事中' : l.rented ? '貸し出し中' : '']}
                tone="owned"
              />
            </group>
          );
        })}
        {offers.map((o) => {
          if (typeof o.plot !== 'number') return null;
          return (
            <group key={o.id} position={[plotX(o.plot) + shift, 0, 0]}>
              <SaleRope />
              <Signboard lines={['売地', o.name, yen(landPrice(o.location, o.variance, market))]} tone="sale" />
            </group>
          );
        })}
      </group>
    </group>
  );
}

/** ほかの土地に建っている家。触れないように（選んだり置いたりできないように）当たり判定を外す */
function StaticHouse({ house }: { house: House }) {
  const ref = useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    ref.current?.traverse((o) => {
      o.raycast = () => undefined;
    });
  });
  return (
    <group ref={ref}>
      <HouseParts house={house} />
    </group>
  );
}

/** 売り土地の四隅の杭とロープ */
function SaleRope() {
  const posts: [number, number][] = [
    [0, 0],
    [lotW, 0],
    [lotW, lotD],
    [0, lotD],
  ];
  const sides: { x: number; z: number; len: number; rot: number }[] = [
    { x: lotW / 2, z: 0, len: lotW, rot: 0 },
    { x: lotW / 2, z: lotD, len: lotW, rot: 0 },
    { x: 0, z: lotD / 2, len: lotD, rot: Math.PI / 2 },
    { x: lotW, z: lotD / 2, len: lotD, rot: Math.PI / 2 },
  ];
  return (
    <group>
      {posts.map(([x, z]) => (
        <mesh key={`${x},${z}`} position={[x, 0.35, z]} castShadow>
          <boxGeometry args={[0.08, 0.7, 0.08]} />
          <meshStandardMaterial color="#d9cbb0" roughness={0.9} />
        </mesh>
      ))}
      {sides.map((s) => (
        <mesh key={`${s.x},${s.z}`} position={[s.x, 0.6, s.z]} rotation-y={s.rot}>
          <boxGeometry args={[s.len, 0.025, 0.025]} />
          <meshStandardMaterial color="#f4f1e8" roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

function boardTexture(lines: string[], tone: 'owned' | 'sale' | 'district') {
  const w = 512;
  const h = 288;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  const bg = tone === 'sale' ? '#fffdf6' : tone === 'owned' ? '#1f4e8c' : '#3d5a3a';
  const fg = tone === 'sale' ? '#b3261e' : '#ffffff';
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  g.strokeStyle = tone === 'sale' ? '#b3261e' : 'rgba(255,255,255,0.75)';
  g.lineWidth = 12;
  g.strokeRect(6, 6, w - 12, h - 12);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const shown = lines.filter(Boolean);
  const sizes = shown.map((_, i) => (i === 0 ? 76 : 50));
  const total = sizes.reduce((a, b) => a + b * 1.2, 0);
  let y = h / 2 - total / 2;
  shown.forEach((t, i) => {
    const size = sizes[i];
    g.font = `bold ${size}px "Hiragino Sans", "Noto Sans JP", "Yu Gothic", sans-serif`;
    g.fillStyle = i === 0 ? fg : tone === 'sale' ? '#333' : '#ffffff';
    y += (size * 1.2) / 2;
    g.fillText(t, w / 2, y, w - 40);
    y += (size * 1.2) / 2;
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** 区画の前（道路側・左の角の外）に立てる看板。道路から読めるよう +Z を向く */
function Signboard({ lines, tone }: { lines: string[]; tone: 'owned' | 'sale' }) {
  const key = lines.join('\n');
  const tex = useMemo(() => boardTexture(lines, tone), [key, tone]);
  useLayoutEffect(() => () => tex.dispose(), [tex]);
  return (
    <group position={[-1.1, 0, lotD - 0.4]}>
      <mesh position={[0, 0.8, -0.03]} castShadow>
        <boxGeometry args={[0.07, 1.6, 0.07]} />
        <meshStandardMaterial color="#6b6b6b" metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh position={[0, 1.65, 0.01]} castShadow>
        <boxGeometry args={[1.5, 0.84, 0.03]} />
        <meshStandardMaterial color="#888" />
      </mesh>
      <mesh position={[0, 1.65, 0.027]}>
        <planeGeometry args={[1.44, 0.8]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** 地区の入口の看板（道路の向かい側に立つ） */
function DistrictSign({ plot }: { plot: number }) {
  const d = districtOf(plot);
  const name = d ? getLocation(d.location).name : '';
  const tex = useMemo(() => boardTexture([name, 'ここから'], 'district'), [name]);
  return (
    <group position={[plotX(plot) - (PLOT_PITCH - lotW) / 2, 0, ROAD_Z + 4]} rotation-y={Math.PI}>
      <mesh position={[0, 1.1, 0.03]} castShadow>
        <boxGeometry args={[0.1, 2.2, 0.1]} />
        <meshStandardMaterial color="#5b5b5b" />
      </mesh>
      <mesh position={[0, 2.3, 0]}>
        <planeGeometry args={[1.9, 1.07]} />
        <meshBasicMaterial map={tex} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

