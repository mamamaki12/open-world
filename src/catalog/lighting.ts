import type { FurnitureDef } from './index';

const colors = ['#2c3035', '#f0ece4', '#b18b54'];
/** Local +Z faces away from the wall; wall fixtures share the established nameplate mount pivot. */
export const LIGHTING: FurnitureDef[] = [
  { id: 'wall-sconce', name: '壁付けブラケットライト', category: 'lighting', colors,
    mount: { width: .28, height: .54, back: .025 },
    light: { position: [0, 1.6, .23], color: '#ffd6a0', intensity: 2.8, distance: 4.5 },
    parts: [
      { shape: 'box', size: [.16,.4,.05], pos: [0,1.6,0], paint: 'main' },
      { shape: 'box', size: [.2,.08,.2], pos: [0,1.81,.09], paint: 'main' },
      { shape: 'box', size: [.2,.08,.2], pos: [0,1.39,.09], paint: 'main' },
      { shape: 'box', size: [.16,.34,.15], pos: [0,1.6,.1], paint: 'white', glow: true },
    ] },
  { id: 'wall-light-bar', name: '壁付け間接バーライト', category: 'lighting', colors,
    mount: { width: .9, height: .2, back: .025 },
    light: { position: [0,1.65,.16], color: '#ffe2b9', intensity: 2.5, distance: 4 },
    parts: [
      { shape: 'box', size: [.84,.12,.05], pos: [0,1.6,0], paint: 'main' },
      { shape: 'box', size: [.84,.04,.15], pos: [0,1.62,.05], paint: 'main' },
      { shape: 'box', size: [.76,.02,.08], pos: [0,1.65,.07], paint: 'white', glow: true },
    ] },
  { id: 'indirect-floor-light', name: '置き型間接照明', category: 'lighting', colors,
    light: { position: [0,.24,0], color: '#ffd6a0', intensity: 2.6, distance: 4.2 },
    parts: [
      { shape: 'cylinder', size: [.32,.035,.32], pos: [0,.0175,0], paint: 'main' },
      { shape: 'cylinder', size: [.24,.26,.24], pos: [0,.165,0], paint: 'white', glow: true },
      { shape: 'cylinder', size: [.28,.035,.28], pos: [0,.315,0], paint: 'main' },
    ] },
  { id: 'garden-bollard-light', name: '庭の間接ポールライト', category: 'lighting', colors,
    light: { position: [0,.58,0], color: '#ffe0ab', intensity: 2.7, distance: 4.5 },
    parts: [
      { shape: 'cylinder', size: [.24,.05,.24], pos: [0,.025,0], paint: 'main' },
      { shape: 'box', size: [.12,.45,.12], pos: [0,.265,0], paint: 'main' },
      { shape: 'box', size: [.16,.16,.16], pos: [0,.57,0], paint: 'white', glow: true },
      { shape: 'box', size: [.22,.04,.22], pos: [0,.67,0], paint: 'main' },
    ] },
];
