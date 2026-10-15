import { Canvas } from '@react-three/fiber';
import { Environment, Grid, Lightformer, OrbitControls, Sky } from '@react-three/drei';
import * as THREE from 'three';
import { GRID, LOT_D, LOT_W, floorY } from '../building/dimensions';
import { useGame } from '../state/store';
import { useInteraction } from '../state/interaction';
import { DebugBridge } from './DebugBridge';
import { HouseView } from './HouseView';
import { PlacementController } from './PlacementController';
import { grassTexture } from './textures';

const CENTER: [number, number, number] = [(LOT_W * GRID) / 2, 0, (LOT_D * GRID) / 2];
const SUN: [number, number, number] = [CENTER[0] + 14, 26, CENTER[2] + 12];

export function Scene() {
  const tool = useGame((s) => s.tool);
  const select = useGame((s) => s.select);
  const dragging = useInteraction((s) => s.furnitureDrag !== null);
  const building = tool !== 'select' && tool !== 'erase';

  return (
    <Canvas
      shadows
      camera={{ position: [CENTER[0] + 13, 15, CENTER[2] + 19], fov: 45, near: 0.1, far: 500 }}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.0;
        gl.shadowMap.type = THREE.PCFSoftShadowMap;
      }}
      onPointerMissed={(e) => {
        if (e.button === 0 && useGame.getState().tool === 'select') select(null);
      }}
    >
      <Sky sunPosition={SUN} turbidity={4} rayleigh={1.2} mieCoefficient={0.004} mieDirectionalG={0.85} />
      <Environment resolution={256}>
        <Lightformer intensity={1.6} position={[0, 10, 0]} rotation-x={Math.PI / 2} scale={[40, 40, 1]} color="#dfe9f5" />
        <Lightformer intensity={0.8} position={[-20, 4, 0]} rotation-y={Math.PI / 2} scale={[40, 8, 1]} color="#f7efe2" />
        <Lightformer intensity={0.6} position={[20, 4, 0]} rotation-y={-Math.PI / 2} scale={[40, 8, 1]} color="#e3ecf7" />
        <Lightformer intensity={0.4} position={[0, -2, 0]} rotation-x={-Math.PI / 2} scale={[40, 40, 1]} color="#8a9a6a" />
      </Environment>
      <hemisphereLight args={['#dfeaff', '#7d8c5c', 0.45]} />
      <directionalLight
        position={SUN}
        intensity={2.6}
        color="#fff3e2"
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-camera-left={-22}
        shadow-camera-right={22}
        shadow-camera-top={22}
        shadow-camera-bottom={-22}
        shadow-camera-near={1}
        shadow-camera-far={80}
      >
        <object3D attach="target" position={CENTER} />
      </directionalLight>

      <Ground />
      {building && <LevelGrid />}
      <HouseView />
      <PlacementController />
      {import.meta.env.DEV && <DebugBridge />}

      <OrbitControls
        makeDefault
        target={CENTER}
        enabled={!dragging}
        enableDamping
        dampingFactor={0.12}
        minDistance={3}
        maxDistance={90}
        maxPolarAngle={Math.PI / 2 - 0.04}
        mouseButtons={{
          LEFT: building ? (-1 as THREE.MOUSE) : THREE.MOUSE.ROTATE,
          MIDDLE: THREE.MOUSE.PAN,
          RIGHT: building ? THREE.MOUSE.ROTATE : THREE.MOUSE.PAN,
        }}
      />
    </Canvas>
  );
}

function Ground() {
  const lotW = LOT_W * GRID;
  const lotD = LOT_D * GRID;
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[CENTER[0], -0.02, CENTER[2]]} receiveShadow>
        <planeGeometry args={[240, 240]} />
        <meshStandardMaterial map={grassTexture()} roughness={1} />
      </mesh>
      {/* 土地（砂利敷き） */}
      <mesh rotation-x={-Math.PI / 2} position={[lotW / 2, 0, lotD / 2]} receiveShadow>
        <planeGeometry args={[lotW, lotD]} />
        <meshStandardMaterial color="#b9b2a3" roughness={1} />
      </mesh>
      {/* 前面道路 */}
      <mesh rotation-x={-Math.PI / 2} position={[lotW / 2, -0.01, lotD + 3.2]} receiveShadow>
        <planeGeometry args={[240, 6]} />
        <meshStandardMaterial color="#55585c" roughness={0.95} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[lotW / 2, -0.005, lotD + 3.2]}>
        <planeGeometry args={[240, 0.12]} />
        <meshStandardMaterial color="#e8e6df" roughness={0.9} />
      </mesh>
    </group>
  );
}

function LevelGrid() {
  const level = useGame((s) => s.activeLevel);
  const lotW = LOT_W * GRID;
  const lotD = LOT_D * GRID;
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
