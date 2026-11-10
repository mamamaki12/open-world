// 家具の部品の塗り（main 以外）。3D（world/parts/Furniture.tsx）と、建築メニューの家具の絵（ui/thumbnails.ts）で共通に使う
import type { Paint } from './index';

export const PAINT: Record<Exclude<Paint, 'main'>, { color: string; roughness?: number; metalness?: number }> = {
  wood: { color: '#7a5535', roughness: 0.6 },
  white: { color: '#f2f0eb', roughness: 0.8 },
  black: { color: '#18191b', roughness: 0.3 },
  dark: { color: '#333436', roughness: 0.8 },
  accent: { color: '#7b4b3a', roughness: 0.8 },
  counter: { color: '#e6e3dc', roughness: 0.25 },
  steel: { color: '#b5b9bd', roughness: 0.3, metalness: 0.8 },
  water: { color: '#4cb4dc', roughness: 0.08, metalness: 0.1 },
  green: { color: '#4f7a45', roughness: 0.9 },
  soil: { color: '#5a4232', roughness: 1 },
  stone: { color: '#c9c5bb', roughness: 0.9 },
  terracotta: { color: '#b8613f', roughness: 0.85 },
};
