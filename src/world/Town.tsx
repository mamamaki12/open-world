// 町：大通りと、その沿いに並ぶ区画（ほかの持っている土地の家・売り土地の看板）とカジノ。
// いま建てている土地はいつも原点にあるので、ほかのものは区画の番号の差だけ横にずらして描く
import { useLayoutEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { PartRef } from '../building/types';
import { useGame } from '../state/store';
import { useInteraction } from '../state/interaction';
import { activateOwnedHouse } from '../state/ownedEditing';
import { beginPartDrag } from './partDrag';
import { playerMemory } from './Player';
import { GRID, LOT_D, LOT_W } from '../building/dimensions';
import { getLocation, landPrice } from '../economy/market';
import { yen } from '../economy/money';
import { FIRST_PLOT, LAST_PLOT, PLOT_PITCH, TOWN_BOUNDS, TOWN_ROADS, CIVIC_SITE, districtOf, plotX, plotZ } from '../economy/town';
import { lotCells, lotHouse, originShift, useCurrentPlot, useEconomy } from '../state/economy';
import { CasinoBuilding } from './CasinoBuilding';
import { Streetscape } from './Streetscape';
import { DealerBuilding } from './DealerBuilding';
import { BoutiqueBuildings } from './BoutiqueBuildings';
import { EstateBuilding } from './EstateBuilding';
import { HouseParts } from './HouseView';
import { grassTexture } from './textures';

const lotW = LOT_W * GRID;
const lotD = LOT_D * GRID;
const ROAD_Z = lotD + 3.2;
/** 草地を並べる1枚の幅（草の模様の大きさを変えないよう、同じ大きさの板を並べる） */
const TILE = 240;
const WEST = TOWN_BOUNDS.x0 - 80;
const EAST = TOWN_BOUNDS.x1 + 80;

export function Town() {
  const { camera, controls } = useThree();
  const showRoofs = useGame(s => s.mode === 'walk' || ['select', 'erase', 'roof'].includes(s.tool));
  const here = useCurrentPlot();
  const lots = useEconomy((s) => s.lots);
  const currentLotId = useEconomy((s) => s.currentLotId);
  const offers = useEconomy((s) => s.offers);
  const market = useEconomy((s) => s.market);
  const shift = -plotX(here), shiftZ = -plotZ(here);
  const tiles = useMemo(() => {
    const out: { x: number; z: number }[] = [];
    for (let x = WEST; x < EAST; x += TILE) for (let z = TOWN_BOUNDS.z0 - 80; z < TOWN_BOUNDS.z1 + 80; z += TILE) out.push({ x: x + TILE / 2, z: z + TILE / 2 });
    return out;
  }, []);

  // 土地をつなげて原点が西の区画に移ったら、見えている場所が変わらないようカメラと人をずらす
  useLayoutEffect(() => {
    originShift.listener = (dx, dz) => {
      camera.position.x += dx; camera.position.z += dz;
      const orbit = controls as unknown as OrbitControlsImpl | undefined;
      if (orbit) { orbit.target.x += dx; orbit.target.z += dz; orbit.update(); }
      camera.updateMatrixWorld();
      playerMemory.x += dx; playerMemory.z += dz;
    };
    return () => { originShift.listener = null; };
  }, [camera, controls]);

  const activate = (id: string, e: ThreeEvent<PointerEvent>, ref?: PartRef) => {
    if (useGame.getState().mode !== 'build' || e.button !== 0) return;
    e.stopPropagation();
    const offset = activateOwnedHouse(id);
    if (offset === null) return;
    camera.position.x -= offset.x; camera.position.z -= offset.z;
    const orbit = controls as unknown as OrbitControlsImpl | undefined;
    if (orbit) { orbit.target.x -= offset.x; orbit.target.z -= offset.z; orbit.update(); }
    camera.updateMatrixWorld();
    playerMemory.x -= offset.x; playerMemory.z -= offset.z;
    useInteraction.setState({ ignorePartClickUntil: Date.now() + 100 });
    if (!ref) return;
    const game = useGame.getState();
    if (game.tool === 'erase') {
      useInteraction.setState({ pendingErase: { ref, x: e.clientX, y: e.clientY } });
    } else if (game.tool === 'select') {
      const ray = e.ray.clone(); ray.origin.x -= offset.x; ray.origin.z -= offset.z;
      beginPartDrag(ref, ray, e.clientX, e.clientY);
    }
  };

  return (
    <group>
      {/* 地面と大通りは町の座標で描き、いまの区画のぶんだけずらす */}
      <group position={[shift, 0, shiftZ]}>
        {tiles.map(({ x, z }) => (
          <mesh key={`${x},${z}`} rotation-x={-Math.PI / 2} position={[x, -0.02, z]} receiveShadow>
            <planeGeometry args={[TILE, TILE]} />
            <meshStandardMaterial map={grassTexture()} roughness={1} />
          </mesh>
        ))}
        {TOWN_ROADS.map((road, i) => {
          const width = road.x1 - road.x0, depth = road.z1 - road.z0;
          const horizontal = width > depth;
          return <group key={i}>
            <mesh rotation-x={-Math.PI / 2} position={[(road.x0 + road.x1) / 2, -0.008, (road.z0 + road.z1) / 2]} receiveShadow>
              <planeGeometry args={[width, depth]} /><meshStandardMaterial color="#555b60" roughness={0.95} />
            </mesh>
            <mesh rotation-x={-Math.PI / 2} position={[(road.x0 + road.x1) / 2, -0.003, (road.z0 + road.z1) / 2]}>
              <planeGeometry args={[horizontal ? width : 0.1, horizontal ? 0.1 : depth]} /><meshStandardMaterial color="#d6cfac" />
            </mesh>
          </group>;
        })}
        <Streetscape />
        <group position={[CIVIC_SITE.x, 0, CIVIC_SITE.z]}><CasinoBuilding /><EstateBuilding /><DealerBuilding /><BoutiqueBuildings /></group>
        {/* 地区の境目の看板 */}
        {[FIRST_PLOT, ...[3, 9].filter((p) => p <= LAST_PLOT)].map((p) => (
          <DistrictSign key={p} plot={p} />
        ))}
      </group>

      <group name="neighbors">
        {lots.map((l) => {
          if (typeof l.plot !== 'number') return null;
          const house = lotHouse(l);
          const padW = lotCells(l).w * GRID;
          const x = plotX(l.plot) + shift;
          const current = l.id === currentLotId;
          return (
            <group key={l.id} position={[x, 0, plotZ(l.plot) + shiftZ]}>
              {!current && (
                <mesh rotation-x={-Math.PI / 2} position={[padW / 2, 0.002, lotD / 2]} receiveShadow onPointerDown={(e) => activate(l.id, e)}>
                  <planeGeometry args={[padW, lotD]} />
                  <meshStandardMaterial color="#b9b2a3" roughness={1} />
                </mesh>
              )}
              {!current && house && <HouseParts house={house} showRoofs={showRoofs} activate={(e, ref) => activate(l.id, e, ref)} />}
              <Signboard
                lines={['あなたの土地', l.name.replace(/（.*）$/, ''), l.construction ? '工事中' : l.rented ? '貸し出し中' : typeof l.joined === 'number' ? '2区画つなげた土地' : '']}
                tone="owned"
              />
            </group>
          );
        })}
        {offers.map((o) => {
          if (typeof o.plot !== 'number') return null;
          return (
            <group key={o.id} position={[plotX(o.plot) + shift, 0, plotZ(o.plot) + shiftZ]}>
              <SaleRope />
              <Signboard lines={['売地', o.name, yen(landPrice(o.location, o.variance, market))]} tone="sale" />
            </group>
          );
        })}
      </group>
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
    <group position={[plotX(plot) - (PLOT_PITCH - lotW) / 2, 0, plotZ(plot) + ROAD_Z + 4]} rotation-y={Math.PI}>
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

