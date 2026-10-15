// カジノのゲームを3Dで見せる舞台。暖かい色の天井の照明と、台に落ちる影
import { Canvas } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import type { ReactNode } from 'react';

export function Stage({ children, camera, height, label, target = [0, 0, 0] }: {
  children: ReactNode;
  camera: { position: [number, number, number]; fov: number };
  height: number;
  label: string;
  target?: [number, number, number];
}) {
  return (
    <div className="casino-stage" style={{ height }} role="img" aria-label={label}>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: camera.position, fov: camera.fov, near: 0.05, far: 50 }}
        gl={{ antialias: true, alpha: true }}
        onCreated={({ gl, camera: cam }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
          cam.lookAt(...target);
        }}
      >
        {/* 映り込み用の明かり（天井のシャンデリアと、まわりの赤い壁） */}
        <Environment resolution={128}>
          <Lightformer intensity={2.2} position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[6, 6, 1]} color="#ffe2b0" />
          <Lightformer intensity={0.7} position={[-6, 2, 0]} rotation-y={Math.PI / 2} scale={[10, 4, 1]} color="#ff7a5a" />
          <Lightformer intensity={0.7} position={[6, 2, 0]} rotation-y={-Math.PI / 2} scale={[10, 4, 1]} color="#ffb070" />
          <Lightformer intensity={0.4} position={[0, 2, 6]} scale={[10, 4, 1]} color="#fff0d8" />
        </Environment>
        <ambientLight intensity={0.25} color="#ffe6c8" />
        <spotLight
          position={[1.5, 5, 2.5]}
          angle={0.55}
          penumbra={0.6}
          intensity={60}
          color="#fff1d6"
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-bias={-0.0004}
        />
        <pointLight position={[-2.5, 2.2, 1.5]} intensity={6} color="#ffb070" />
        {children}
      </Canvas>
    </div>
  );
}
