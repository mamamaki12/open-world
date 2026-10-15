// 3Dのカードテーブル：山札からカードが滑ってきて、めくれる。めくった札は横に並ぶ
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { cardBackTexture, cardFaceTexture, feltTexture, woodTexture } from './textures';

export interface Card3D {
  rank: number;
  suit: string;
  id: number;
}

const CW = 0.63;
const CH = 0.88;
const DECK: [number, number, number] = [-1.05, 0, -0.1];
const CENTER: [number, number, number] = [0, 0, 0];
const SLIDE = 0.25;
const FLIP = 0.38;

const CARD_GEO = new THREE.PlaneGeometry(CW, CH);

/** 1枚のカード（表と裏の2枚の板を背中合わせに） */
function CardMesh({ card }: { card: Card3D | null }) {
  const face = useMemo(() => (card ? cardFaceTexture(card.rank, card.suit) : null), [card]);
  const back = useMemo(cardBackTexture, []);
  return (
    <group>
      {face && (
        <mesh geometry={CARD_GEO} rotation-x={-Math.PI / 2} castShadow receiveShadow>
          <meshPhysicalMaterial map={face} roughness={0.35} clearcoat={0.4} />
        </mesh>
      )}
      <mesh geometry={CARD_GEO} rotation-x={Math.PI / 2} castShadow>
        <meshPhysicalMaterial map={back} roughness={0.35} clearcoat={0.4} />
      </mesh>
    </group>
  );
}

/** 山札から滑ってきてめくれるカード。始まった時刻からの経過で動かす */
function IncomingCard({ card }: { card: Card3D }) {
  const group = useRef<THREE.Group>(null);
  const t0 = useRef<number | null>(null);
  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    if (t0.current === null) t0.current = clock.elapsedTime;
    const t = clock.elapsedTime - t0.current;
    const s = Math.min(1, t / SLIDE);
    const e = 1 - (1 - s) ** 3;
    const f = Math.min(1, Math.max(0, (t - SLIDE * 0.9) / FLIP));
    const ef = f < 0.5 ? 2 * f * f : 1 - (-2 * f + 2) ** 2 / 2;
    g.position.set(DECK[0] + (CENTER[0] - DECK[0]) * e, 0.03 + Math.sin(ef * Math.PI) * 0.25 + 0.01, DECK[2] + (CENTER[2] - DECK[2]) * e);
    // 裏向き（π）から表向き（0）へ、長い辺を軸にめくる
    g.rotation.set(0, (1 - e) * 0.25, Math.PI * (1 - ef));
  });
  return (
    <group ref={group} position={[DECK[0], 0.03, DECK[2]]} rotation={[0, 0.25, Math.PI]}>
      <CardMesh card={card} />
    </group>
  );
}

export function CardTable3D({ current, incoming, past }: { current: Card3D; incoming: Card3D | null; past: Card3D[] }) {
  const felt = useMemo(feltTexture, []);
  const wood = useMemo(woodTexture, []);
  const rail = useMemo(() => {
    // 手前の丸いひじ掛け（革）
    const shape = new THREE.Shape();
    shape.absarc(0, 0, 0.09, 0, Math.PI * 2, false);
    const path = new THREE.CatmullRomCurve3([new THREE.Vector3(-3, 0, 1.25), new THREE.Vector3(3, 0, 1.25)]);
    return new THREE.ExtrudeGeometry(shape, { steps: 1, extrudePath: path, bevelEnabled: false, curveSegments: 24 });
  }, []);
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[7, 4]} />
        <meshStandardMaterial map={felt} roughness={0.95} />
      </mesh>
      {/* テーブルに描かれた金の線と文字の枠 */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.002, 0]}>
        <ringGeometry args={[0.72, 0.735, 96]} />
        <meshStandardMaterial color="#d8ac48" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[DECK[0], 0.002, DECK[2]]}>
        <ringGeometry args={[0.5, 0.512, 64]} />
        <meshStandardMaterial color="#d8ac48" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh geometry={rail} position={[0, 0.05, 0]} castShadow receiveShadow>
        <meshPhysicalMaterial color="#2a120c" roughness={0.45} clearcoat={0.7} />
      </mesh>
      <mesh position={[0, -0.03, 1.12]} receiveShadow>
        <boxGeometry args={[6, 0.08, 0.12]} />
        <meshPhysicalMaterial map={wood} color="#7a4523" roughness={0.3} clearcoat={0.8} />
      </mesh>

      {/* 山札（カードの厚みぶん積む） */}
      <group position={[DECK[0], 0, DECK[2]]} rotation-y={0.25}>
        <mesh position={[0, 0.03, 0]} castShadow receiveShadow>
          <boxGeometry args={[CW, 0.06, CH]} />
          <meshStandardMaterial color="#f3efe4" roughness={0.8} />
        </mesh>
        <group position={[0, 0.0605, 0]} rotation-z={Math.PI}>
          <CardMesh card={null} />
        </group>
      </group>

      {/* いまのカード */}
      <group position={[CENTER[0], 0.004, CENTER[2]]}>
        <CardMesh card={current} />
      </group>
      {incoming && <IncomingCard key={incoming.id} card={incoming} />}

      {/* これまでの札（右に少しずつずらして並べる） */}
      {past.slice(0, 7).map((c, i) => (
        <group key={c.id} position={[0.95 + i * 0.26, 0.002 + i * 0.002, 0.15 + (i % 2) * 0.03]} rotation-y={-0.12 + (i % 3) * 0.08} scale={0.72}>
          <CardMesh card={c} />
        </group>
      ))}
    </group>
  );
}
