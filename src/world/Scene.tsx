import { BuildingDetailProvider } from './BuildingDetail';
import { RemotePlayers } from '../session/RemotePlayers';
import { Canvas } from '@react-three/fiber';
import { Environment, Grid, Lightformer, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { GRID, LOT_D, LOT_W, floorY } from '../building/dimensions';
import { useGame } from '../state/store';
import { useTouchDevice } from '../ui/useTouchDevice';
import { useInteraction } from '../state/interaction';
import { BuildCamera } from './BuildCamera';
import { DebugBridge } from './DebugBridge';
import { HouseView } from './HouseView';
import { PlacementController } from './PlacementController';
import { AimBuilder } from './AimBuilder';
import { TouchFurnitureEdit } from './TouchFurnitureEdit';
import { Player } from './Player';
import { VenueInteriors } from './VenueInteriors';
import { CarFleet } from './CarFleet';
import { Town } from './Town';
import { ClimateLights } from './Climate.tsx';
import { useLotCells } from '../state/economy';

const CENTER: [number, number, number] = [(LOT_W * GRID) / 2, 0, (LOT_D * GRID) / 2];

export function Scene() {
  const touch=useTouchDevice();
  const shadowSize=touch?1024:2048;
  const tool = useGame((s) => s.tool);
  const mode = useGame((s) => s.mode);
  const select = useGame((s) => s.select);
  const dragging = useInteraction((s) => s.furnitureDrag !== null || s.buildingDrag !== null);
  // カジノ・不動産のメニューを開いている間は、後ろの世界の描画を止めて軽くする
  const paused = useGame((s) => s.overlay !== null);
  const walking = mode === 'walk';
  /** 置くツールか削除ツールを持っている（歩きモードでも建てられる）。削除ツールの左ドラッグは範囲選択に使う */
  const placing = tool !== 'select';
  const building = !walking && placing;

  return (
    <Canvas
      shadows
      dpr={touch ? [1,1.5] : [1,2]}
      frameloop={paused ? 'never' : 'always'}
      camera={{ position: [CENTER[0] + 13, 15, CENTER[2] + 19], fov: 45, near: 0.1, far: 700 }}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.0;
        gl.shadowMap.type = THREE.PCFSoftShadowMap;
      }}
      onPointerMissed={(e) => {
        if (e.button === 0 && useGame.getState().tool === 'select' && Date.now() >= useInteraction.getState().ignorePartClickUntil) select(null);
      }}
    >
      <Environment resolution={touch?128:256}>
        <Lightformer intensity={1.6} position={[0, 10, 0]} rotation-x={Math.PI / 2} scale={[40, 40, 1]} color="#dfe9f5" />
        <Lightformer intensity={0.8} position={[-20, 4, 0]} rotation-y={Math.PI / 2} scale={[40, 8, 1]} color="#f7efe2" />
        <Lightformer intensity={0.6} position={[20, 4, 0]} rotation-y={-Math.PI / 2} scale={[40, 8, 1]} color="#e3ecf7" />
        <Lightformer intensity={0.5} position={[0, -2, 0]} rotation-x={-Math.PI / 2} scale={[40, 40, 1]} color="#c9c3b4" />
      </Environment>
      <ClimateLights center={CENTER} shadowSize={shadowSize} />

      <BuildingDetailProvider>
      <Ground />
      <Town />
      <CarFleet />
      <RemotePlayers />
      <VenueInteriors />
      {placing && <LevelGrid />}
      <HouseView />
      {walking && <Player />}
      <PlacementController />
      <AimBuilder />
      <TouchFurnitureEdit />
      {import.meta.env.DEV && <DebugBridge />}

      {/* 歩きモード中も消さずに止めておく（戻ったときに見ていた場所を保つ） */}
      <OrbitControls
        makeDefault
        target={CENTER}
        enabled={!walking && !dragging}
        enableDamping={!placing && !dragging}
        dampingFactor={0.12}
        minDistance={1.2}
        maxDistance={320}
        maxPolarAngle={Math.PI / 2 - 0.02}
        // 移動は地面と平行に。ズームはマウスのある場所へ寄る
        screenSpacePanning={false}
        zoomToCursor
        panSpeed={1.2}
        mouseButtons={{
          LEFT: building ? (-1 as THREE.MOUSE) : THREE.MOUSE.ROTATE,
          MIDDLE: THREE.MOUSE.PAN,
          RIGHT: building ? THREE.MOUSE.ROTATE : THREE.MOUSE.PAN,
        }}
        // 指：1本でなぞると回転（建てるツールを持っているときは1本指が「置く」なので使わない）、2本で移動・つまんでズーム
        touches={{
          ONE: THREE.TOUCH.ROTATE,
          TWO: THREE.TOUCH.DOLLY_PAN,
        }}
      />
      <BuildCamera />
      </BuildingDetailProvider>
    </Canvas>
  );
}

/** いま建てている土地（砂利敷き）。草地・道路・ほかの区画は Town が描く */
function Ground() {
  const cells = useLotCells();
  const lotW = cells.w * GRID;
  const lotD = cells.d * GRID;
  return (
    <mesh name="ground" rotation-x={-Math.PI / 2} position={[lotW / 2, 0, lotD / 2]} receiveShadow>
      <planeGeometry args={[lotW, lotD]} />
      <meshStandardMaterial color="#b9b2a3" roughness={1} />
    </mesh>
  );
}

function LevelGrid() {
  const level = useGame((s) => s.activeLevel);
  const cells = useLotCells();
  const lotW = cells.w * GRID;
  const lotD = cells.d * GRID;
  return (
    <Grid
      position={[lotW / 2, floorY(level) + 0.012, lotD / 2]}
      args={[lotW, lotD]}
      cellSize={GRID}
      cellThickness={0.6}
      cellColor="#6f6a60"
      sectionSize={GRID * 2}
      sectionThickness={1.1}
      sectionColor="#3f5f8f"
      fadeDistance={200}
      followCamera={false}
      infiniteGrid={false}
    />
  );
}

