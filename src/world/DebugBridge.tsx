// 開発サーバーでだけ、自動テスト用にゲーム状態と画面座標変換を window に出す
import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useEconomy } from '../state/economy';
import { useGame } from '../state/store';
import { playerMemory, playerMotion } from './Player';

export function DebugBridge() {
  const { camera, size } = useThree();
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    (window as unknown as Record<string, unknown>).__ow = {
      game: useGame,
      economy: useEconomy,
      player: playerMemory,
      motion: playerMotion,
      project: (x: number, y: number, z: number) => {
        const v = new THREE.Vector3(x, y, z).project(camera);
        return { x: ((v.x + 1) / 2) * size.width, y: ((1 - v.y) / 2) * size.height };
      },
    };
  }, [camera, size]);
  return null;
}
