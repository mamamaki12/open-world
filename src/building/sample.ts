// 動作確認用のサンプルの家（2階建て・切妻屋根）
import { newId } from './rules';
import type { Finish, House, OpeningPart, WallPart } from './types';

const ext: Finish = { material: 'siding', color: '#f2efe8' };
const accent: Finish = { material: 'woodboard', color: '#7a5535' };
const inner: Finish = { material: 'wallpaper', color: '#f7f5f0' };

export function sampleHouse(): House {
  const walls: WallPart[] = [];
  const openings: OpeningPart[] = [];
  const wall = (level: number, x0: number, z0: number, x1: number, z1: number, exterior: Finish = ext) => {
    const w: WallPart = { id: newId('wall'), level, x0, z0, x1, z1, exterior, interior: inner };
    walls.push(w);
    return w.id;
  };
  const open = (wallId: string, kind: 'door' | 'window', type: string, offset: number, panelColor = '#5a3e2b') => {
    openings.push({ id: newId('opening'), wallId, kind, type, offset, sashColor: '#3a3c3f', panelColor });
  };

  // 1階：外周
  const f1Front = wall(0, 6, 14, 16, 14);
  const f1Back = wall(0, 6, 6, 16, 6);
  const f1Left = wall(0, 6, 6, 6, 14);
  const f1Right = wall(0, 16, 6, 16, 14);
  // 1階：LDKとホールの間仕切り
  const f1Inner = wall(0, 12, 6, 12, 14);
  open(f1Front, 'window', 'patio', 1.365);
  open(f1Front, 'window', 'patio', 3.64);
  open(f1Front, 'door', 'entrance', 7.735);
  open(f1Back, 'window', 'sliding-small', 2.73);
  open(f1Back, 'window', 'high', 4.55);
  open(f1Left, 'window', 'sliding', 3.64);
  open(f1Right, 'window', 'casement', 5.46);
  open(f1Inner, 'door', 'door', 6.37, '#efedea');

  // 2階
  const f2Front = wall(1, 6, 14, 16, 14);
  const f2Back = wall(1, 6, 6, 16, 6);
  const f2Left = wall(1, 6, 6, 6, 14);
  const f2Right = wall(1, 16, 6, 16, 14, accent);
  const f2Inner = wall(1, 11, 6, 11, 14);
  open(f2Front, 'window', 'sliding', 2.275);
  open(f2Front, 'window', 'sliding', 6.825);
  open(f2Back, 'window', 'sliding-small', 1.82);
  open(f2Back, 'window', 'sliding-small', 7.28);
  open(f2Left, 'window', 'fix', 3.64);
  open(f2Right, 'window', 'casement', 2.73);
  open(f2Right, 'window', 'casement', 4.55);
  open(f2Inner, 'door', 'door', 6.37, '#efedea');

  return {
    version: 1,
    floors: [
      { id: newId('floor'), level: 0, x0: 6, z0: 6, x1: 16, z1: 14, finish: { material: 'flooring', color: '#c8a57a' } },
      { id: newId('floor'), level: 1, x0: 6, z0: 6, x1: 16, z1: 14, finish: { material: 'flooring', color: '#a77b52' } },
    ],
    walls,
    openings,
    stairs: [{ id: newId('stair'), level: 0, x: 14, z: 7, rot: 0, finish: { material: 'oak', color: '#a77b52' } }],
    roofs: [
      {
        id: newId('roof'),
        level: 1,
        x0: 6,
        z0: 6,
        x1: 16,
        z1: 14,
        type: 'gable',
        axis: 'x',
        flip: false,
        pitch: 4,
        overhang: 0.6,
        finish: { material: 'slate', color: '#2f3133' },
        gableFinish: ext,
      },
    ],
    furniture: [
      { id: newId('furniture'), level: 0, type: 'tv', x: 5.75, z: 11.0, rotation: 90, color: '#4e3626' },
      { id: newId('furniture'), level: 0, type: 'rug', x: 7.0, z: 11.0, rotation: 90, color: '#b9ab97' },
      { id: newId('furniture'), level: 0, type: 'sofa', x: 8.3, z: 11.0, rotation: 270, color: '#7d8a96' },
      { id: newId('furniture'), level: 0, type: 'dining', x: 8.6, z: 8.0, rotation: 0, color: '#c8a57a' },
      { id: newId('furniture'), level: 0, type: 'chair', x: 8.2, z: 7.45, rotation: 0, color: '#2f3133' },
      { id: newId('furniture'), level: 0, type: 'chair', x: 9.0, z: 7.45, rotation: 0, color: '#2f3133' },
      { id: newId('furniture'), level: 0, type: 'chair', x: 8.2, z: 8.55, rotation: 180, color: '#2f3133' },
      { id: newId('furniture'), level: 0, type: 'chair', x: 9.0, z: 8.55, rotation: 180, color: '#2f3133' },
      { id: newId('furniture'), level: 0, type: 'kitchen', x: 8.6, z: 5.85, rotation: 0, color: '#efedea' },
      { id: newId('furniture'), level: 0, type: 'fridge', x: 10.4, z: 6.0, rotation: 0, color: '#e8e8e6' },
      { id: newId('furniture'), level: 0, type: 'plant', x: 10.4, z: 12.3, rotation: 0, color: '#4f7a45' },
      { id: newId('furniture'), level: 1, type: 'bed-double', x: 7.8, z: 7.0, rotation: 0, color: '#e9e4da' },
      { id: newId('furniture'), level: 1, type: 'shelf', x: 9.6, z: 5.75, rotation: 0, color: '#efedea' },
      { id: newId('furniture'), level: 1, type: 'desk', x: 12.0, z: 12.4, rotation: 180, color: '#c8a57a' },
      { id: newId('furniture'), level: 1, type: 'plant', x: 6.0, z: 12.4, rotation: 0, color: '#6c8f4e' },
    ],
  };
}
