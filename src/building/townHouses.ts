// 町に最初から建っている家（ほかの住人の家）。どれもプレイヤーが建築モードで使える部品と家具だけで組んである。
// 地区の性格に合わせて、住宅地には一軒家、駅近にはアパート、都心にはマンションを建てる。
// 実在の家の作りを参考にした（大手ハウスメーカーの鉄骨・木造住宅、和風住宅、平屋、北欧住宅、
// 木造アパート、鉄骨のALCアパート、分譲マンション、打ち放しのデザイナーズマンションなど）
import { MAX_LEVEL } from './dimensions';
import { TOWN_HOUSE_PLOTS } from '../economy/town';
import { HouseKit, fin } from './townHouseKit';
import type { Box } from './townHouseKit';
import type { Finish, House } from './types';

export interface TownHouseDesign {
  id: string;
  /** 地図や説明に出す名前 */
  name: string;
  /** 参考にした実在の建物の種類 */
  model: string;
  kind: 'house' | 'apartment' | 'mansion';
  build: () => House;
}

const WHITE = '#efedea';
const inner = fin('wallpaper', '#f7f5f0');
const wood = fin('oak', '#a77b52');

// ---------------------------------------------------------------------------
// 一軒家（総二階の4LDK）。大手ハウスメーカーの家によくある間取り：
// 1階 = 広いLDK・玄関ホール（階段）・洗面・浴室・トイレ、2階 = 主寝室・子ども部屋2つ・ファミリーホール・バルコニー
// 建物は x4〜18、z4〜13（12.7m × 8.2m）。道路は +Z 側
// ---------------------------------------------------------------------------
interface FamilyHouseStyle {
  key: string;
  exterior: Finish;
  /** 2階の外壁（省略は1階と同じ） */
  upper?: Finish;
  roof: { type: 'gable' | 'hip' | 'flat' | 'shed'; finish: Finish; pitch: number; axis?: 'x' | 'z'; overhang?: number };
  floor: Finish;
  sash: { sashColor: string; panelColor: string; sash?: string };
  /** 居間の掃き出し窓の代わりに大きなFIX窓を使う */
  living: string[];
  bedroomWindow: string;
  balcony: Finish | null;
  carport: boolean;
  family: string;
  sofa: string;
  accent?: string;
}

function familyHouse(st: FamilyHouseStyle): House {
  const k = new HouseKit(st.key);
  k.style = st.sash;
  const ext = st.exterior;
  const up = st.upper ?? ext;
  const door = { panelColor: WHITE };

  // ---- 1階 ----
  const f1 = k.box(0, 4, 4, 18, 13, ext, inner, st.floor);
  k.wall(0, 14, 4, 14, 9, inner); // LDK | 水まわり
  const hallWet = k.wall(0, 14, 9, 18, 9, inner);
  k.open(hallWet, 'door', 0.5, door); // 洗面所
  k.open(hallWet, 'door', 3, door); // トイレ
  const ldkHall = k.wall(0, 14, 9, 14, 13, inner);
  k.open(ldkHall, 'door', 2.5, { panelColor: st.accent ?? WHITE });
  const bath = k.wall(0, 14, 6, 16, 6, fin('wall-tile', '#e9eef0'), inner);
  k.open(bath, 'door', 1, door);
  k.wall(0, 16, 6, 18, 6, inner);
  k.wall(0, 16, 6, 16, 9, inner);
  k.stair(0, 12, 11, 2, wood);
  // 窓
  st.living.forEach((t, i) => k.open(f1.s, t, [2.5, 5, 7.5][i]));
  k.open(f1.s, 'entrance', 12, { panelColor: st.sash.panelColor });
  k.open(f1.w, st.bedroomWindow, 2);
  k.open(f1.w, 'casement-tall', 8);
  k.open(f1.n, 'sliding-small', 1);
  k.open(f1.n, 'sliding', 6);
  k.open(f1.n, 'high', 12);
  k.open(f1.e, 'sliding-small', 3.5);
  k.open(f1.e, 'fix', 7.5);
  // 玄関ポーチ
  k.floor(0, 15, 13, 17, 14, fin('terrace-tile', '#b9b2a3'), 'terrace');

  // ---- 2階 ----
  const f2 = k.box(1, 4, 4, 18, 13, up, inner, st.floor);
  const rooms = k.wall(1, 4, 8, 18, 8, inner);
  k.windows(rooms, 'door', [3, 8.5, 11, 13], door);
  k.wall(1, 10, 4, 10, 8, inner);
  k.wall(1, 14, 4, 14, 8, inner);
  k.wall(1, 16, 4, 16, 8, inner);
  const bed2a = k.wall(1, 14, 10, 14, 13, inner);
  k.open(bed2a, 'door', 1.5, door);
  k.wall(1, 14, 10, 18, 10, inner);
  k.open(f2.s, st.bedroomWindow, 2);
  k.open(f2.s, st.balcony ? 'patio' : st.bedroomWindow, 6);
  k.open(f2.s, st.bedroomWindow, 12);
  k.open(f2.n, st.bedroomWindow, 3);
  k.open(f2.n, st.bedroomWindow, 8);
  k.open(f2.n, 'sliding-small', 13);
  k.open(f2.w, st.bedroomWindow, 2);
  k.open(f2.w, 'fix', 7);
  k.open(f2.e, 'casement', 2);
  k.open(f2.e, st.bedroomWindow, 7.5);
  if (st.balcony) {
    k.floor(1, 7, 13, 13, 15, st.balcony, 'terrace');
    k.wall(1, 7, 13, 7, 15, up, up, 'half');
    k.wall(1, 7, 15, 13, 15, up, up, 'half');
    k.wall(1, 13, 13, 13, 15, up, up, 'half');
    k.item(1, 'flowerpot', 8, 14.3);
    k.item(1, 'flowerpot', 12, 14.3, 0, '#f2c230');
  }
  const r = st.roof;
  k.roof(1, 4, 4, 18, 13, r.type, r.finish, up, { pitch: r.pitch, axis: r.axis ?? 'x', overhang: r.overhang ?? 0.6 });

  // ---- 家具：1階 ----
  k.item(0, 'kitchen-island', 9, 5.9, 0);
  k.item(0, 'cupboard', 7, 4.33, 0);
  k.item(0, 'fridge', 12.3, 4.47, 0);
  k.item(0, 'dining', 9, 8, 0, '#c8a57a');
  for (const [x, z, rot] of [[8.5, 7.4, 0], [9.5, 7.4, 0], [8.5, 8.6, 180], [9.5, 8.6, 180]]) k.item(0, 'chair', x, z, rot, '#2f3133');
  k.item(0, 'tv', 4.31, 10.2, 90, '#4e3626');
  k.item(0, 'rug', 6.3, 10.2, 90, '#b9ab97');
  k.item(0, 'low-table', 6.3, 10.2, 90);
  k.item(0, st.sofa, 8.1, 10.2, 270);
  k.item(0, 'plant', 13.3, 12.3);
  k.item(0, 'floor-lamp', 4.6, 12.4);
  k.item(0, 'aircon', 4.22, 6.5, 90);
  for (const x of [6.5, 9]) k.item(0, 'curtain', x, 12.86, 180);
  k.item(0, 'shoe-cabinet', 17.7, 11.8, 270);
  k.item(0, 'plant', 14.6, 12.4, 0, '#6c8f4e');
  k.item(0, 'washbasin', 14.38, 7.5, 90);
  k.item(0, 'washer', 15.6, 8.58, 180);
  k.item(0, 'toilet', 17, 6.45, 0);
  k.item(0, 'bath', 16, 4.52, 0);
  // ---- 家具：2階 ----
  k.item(1, 'bed-double', 7, 5.21, 0);
  k.item(1, 'wardrobe', 4.41, 6, 90);
  k.item(1, 'curtain', 7, 4.12, 0);
  k.item(1, 'aircon', 8.8, 4.2, 0);
  k.item(1, 'bed-single', 11, 5.21, 0, '#9aa7b3');
  k.item(1, 'desk', 13, 4.42, 0);
  k.item(1, 'chair', 13, 5.0, 180);
  k.item(1, 'wardrobe', 15, 4.41, 0);
  k.item(1, 'toilet', 17, 4.45, 0);
  k.item(1, 'sofa', 4.58, 10.5, 90, '#7d8a96');
  k.item(1, 'low-table', 6, 10.5, 90);
  k.item(1, 'shelf', 8, 8.25, 0);
  k.item(1, 'plant', 12.5, 12.3);
  k.item(1, 'bed-single', 15.2, 11.3, 90, '#c9b8a4');
  for (const x of [6, 10, 16]) k.item(1, 'curtain', x, 12.86, 180);

  // ---- 外まわり：庭木・生垣・表札・カーポート ----
  if (st.carport) k.item(0, 'garage-carport', 21, 16.4, 0);
  k.item(0, 'tree', 1.6, 15);
  k.item(0, 'tree', 2.2, 18.4, 0, '#6c8f4e');
  k.item(0, 'tree', 9, 18.6, 0, '#3d5e3a');
  for (const x of [1, 3, 5, 7, 11, 13]) k.item(0, 'hedge', x, 19.45);
  k.item(0, 'flowerbed', 12.5, 14.4);
  k.item(0, 'nameplate-post', 15, 19.3, 0, '#f2efe8', st.family);
  return k.finish();
}

// ---------------------------------------------------------------------------
// 和風の家：焼杉の1階と漆喰の2階、いぶし瓦の寄棟。1階の東と前に下屋（片流れの小屋根）が付く
// ---------------------------------------------------------------------------
function japaneseHouse(): House {
  const k = new HouseKit('wafu');
  k.style = { sashColor: '#5a4636', panelColor: '#3b2c22' };
  const lower = fin('yakisugi', '#2a2826');
  const upper = fin('shikkui', '#f1ede3');
  const tatami = fin('tatami', '#c9c08a');
  const floor = fin('hinoki-floor', '#d8b98f');
  const kawara = fin('kawara', '#4a4f55');
  const shoji = { panelColor: '#efe6d2' };

  // 1階（x4〜18、z5〜14）
  const f1 = k.box(0, 4, 5, 18, 14, lower, fin('plaster', '#e8dfcf'));
  k.floor(0, 9, 5, 18, 14, floor);
  k.floor(0, 4, 11, 9, 14, floor);
  // 和室（x4〜9、z5〜11）と仏間・床の間に見立てた奥
  const washitsu = k.wall(0, 9, 5, 9, 11, fin('plaster', '#e8dfcf'));
  k.open(washitsu, 'slide-door', 4, shoji);
  k.wall(0, 4, 11, 9, 11, fin('plaster', '#e8dfcf'));
  k.floor(0, 4, 5, 9, 11, tatami);
  // 水まわり（x14〜18、z5〜9）
  const wet = k.wall(0, 14, 5, 14, 9, inner);
  k.open(wet, 'door', 3, { panelColor: WHITE });
  k.wall(0, 14, 9, 18, 9, inner);
  const bathW = k.wall(0, 16, 5, 16, 9, inner);
  k.open(bathW, 'door', 3, { panelColor: WHITE });
  // 玄関土間（x14〜18、z11〜14）
  const genkan = k.wall(0, 14, 11, 18, 11, inner);
  k.open(genkan, 'slide-door', 2, shoji);
  k.wall(0, 14, 11, 14, 14, inner);
  k.stair(0, 15, 10, 3, fin('hinoki', '#d8b98f'));
  // 窓：縁側の掃き出し窓が並ぶ
  k.open(f1.s, 'patio', 1.5);
  k.open(f1.s, 'patio', 3.5);
  k.open(f1.s, 'patio', 7);
  k.open(f1.s, 'patio', 9);
  k.open(f1.s, 'slide-door', 12, { panelColor: '#5a4636' }); // 格子の引き戸の玄関
  k.open(f1.w, 'sliding', 3);
  k.open(f1.n, 'sliding', 2.5);
  k.open(f1.n, 'sliding-small', 7.5);
  k.open(f1.n, 'high', 11);
  k.open(f1.e, 'sliding-small', 1);
  k.open(f1.e, 'sliding-small', 3);
  // 縁側（ウッドデッキ）
  k.floor(0, 4, 14, 11, 15, fin('deck', '#8a6240'), 'terrace');

  // 2階：階段室を含む総二階にして、上り切った先にも床と外壁を確保する
  const f2 = k.box(1, 4, 5, 18, 14, upper, inner, floor);
  const room = k.wall(1, 8, 5, 8, 11, inner);
  k.open(room, 'door', 4, { panelColor: WHITE });
  k.open(f2.s, 'sliding', 2);
  k.open(f2.s, 'sliding', 6.5);
  k.open(f2.n, 'sliding', 2);
  k.open(f2.n, 'sliding', 6.5);
  k.open(f2.w, 'sliding-small', 3);
  k.open(f2.e, 'sliding', 3);
  // 階段室まで一体の寄棟屋根
  k.roof(1, 4, 5, 18, 14, 'hip', kawara, upper, { pitch: 4.5, overhang: 0.75 });

  // 家具
  k.item(0, 'zataku', 6.5, 8, 0);
  k.item(0, 'shelf', 4.3, 6.5, 90, '#7c5534');
  k.item(0, 'kitchen', 11.5, 5.44, 0, '#c8a57a');
  k.item(0, 'fridge', 13.4, 5.47, 0);
  k.item(0, 'dining', 11.5, 8.3, 90, '#7c5534');
  for (const [x, z, r] of [[10.9, 7.9, 90], [10.9, 8.7, 90], [12.1, 7.9, 270], [12.1, 8.7, 270]]) k.item(0, 'chair', x, z, r, '#7c5534');
  k.item(0, 'tv', 4.31, 12.5, 90, '#4e3626');
  k.item(0, 'sofa', 8, 12.5, 270, '#4f5b52');
  k.item(0, 'low-table', 6.2, 12.5, 90, '#7c5534');
  k.item(0, 'washbasin', 15, 8.6, 180);
  k.item(0, 'washer', 14.45, 6, 90);
  k.item(0, 'bath', 17, 6.0, 90);
  k.item(0, 'toilet', 15.5, 5.45, 0);
  k.item(0, 'shoe-cabinet', 17.7, 12.5, 270, '#7c5534');
  k.item(1, 'bed-double', 6, 6.21, 0, '#c9b8a4');
  k.item(1, 'wardrobe', 4.41, 9, 90, '#c8a57a');
  k.item(1, 'desk', 9.5, 5.42, 0, '#7c5534');
  k.item(1, 'bed-single', 12.4, 7, 0, '#e9e4da');
  // 庭：松の代わりの庭木、生垣、板塀
  for (const x of [1, 3, 5, 7, 9]) k.item(0, 'hedge', x, 19.45, 0, '#3d5e3a');
  k.item(0, 'tree', 2, 16, 0, '#3d5e3a');
  k.item(0, 'tree', 20.5, 7, 0, '#4f7a45');
  k.item(0, 'flowerpot', 13.5, 15.2, 0, '#f08fb3');
  k.wall(0, 0, 0, 24, 0, fin('cedar', '#8a6240'), fin('cedar', '#8a6240'), 'privacyFence');
  k.wall(0, 0, 0, 0, 14, fin('cedar', '#8a6240'), fin('cedar', '#8a6240'), 'privacyFence');
  k.wall(0, 24, 0, 24, 14, fin('cedar', '#8a6240'), fin('cedar', '#8a6240'), 'privacyFence');
  k.item(0, 'nameplate-post', 16, 19.3, 0, '#2f2a26', '山本');
  return k.finish();
}

// ---------------------------------------------------------------------------
// 平屋：L字の平屋。ガルバリウムの立平葺きの切妻、杉板と白い塗り壁。中庭側にウッドデッキ
// ---------------------------------------------------------------------------
function singleStoryHouse(): House {
  const k = new HouseKit('hiraya');
  k.style = { sashColor: '#26282b', panelColor: '#2a2b2d', sash: 'alu-resin' };
  const wall = fin('stucco', '#f4f1ea');
  const cedar = fin('cedar', '#a77b52');
  const floor = fin('solid-oak', '#c8a57a');
  const roof = fin('standing', '#2c2e31');
  // 東西に長い棟（x3〜21、z4〜10）と、東側から道路へ出る棟（x15〜21、z10〜16）
  k.floor(0, 3, 4, 21, 10, floor);
  k.floor(0, 15, 10, 21, 16, floor);
  const back = k.wall(0, 3, 4, 21, 4, wall, inner);
  const west = k.wall(0, 3, 4, 3, 10, cedar, inner);
  const frontA = k.wall(0, 3, 10, 15, 10, cedar, inner);
  const inside = k.wall(0, 15, 10, 15, 16, cedar, inner);
  const frontB = k.wall(0, 15, 16, 21, 16, wall, inner);
  const east = k.wall(0, 21, 4, 21, 16, wall, inner);
  // 間仕切り：寝室（x3〜8）、LDK（x8〜15）、水まわりと玄関（x15〜21）
  const bedroom = k.wall(0, 8, 4, 8, 10, inner);
  k.open(bedroom, 'door', 5, { panelColor: WHITE });
  const wet = k.wall(0, 15, 4, 15, 10, inner);
  k.open(wet, 'door', 5, { panelColor: WHITE });
  const wetHall = k.wall(0, 15, 7, 21, 7, inner);
  k.windows(wetHall, 'door', [1.5, 4.5], { panelColor: WHITE });
  k.wall(0, 18, 4, 18, 7, inner);
  const studyWall = k.wall(0, 15, 12, 21, 12, inner);
  k.open(studyWall, 'door', 1, { panelColor: WHITE });
  const study = k.wall(0, 18, 12, 18, 16, inner);
  k.open(study, 'door', 2, { panelColor: WHITE });
  k.windows(frontA, 'patio', [2.5, 6.5, 11]);
  k.open(frontA, 'big-fix', 8.75);
  k.open(west, 'sliding', 3);
  k.windows(back, 'high', [2.5, 8.5]);
  k.open(back, 'sliding-small', 13.5);
  k.open(back, 'sliding-small', 16.5);
  k.open(inside, 'casement-tall', 3);
  k.open(frontB, 'entrance', 1.5, { panelColor: '#7b4f2f' });
  k.open(frontB, 'sliding', 4.5);
  k.open(east, 'casement', 4.5);
  k.open(east, 'sliding', 10);
  k.roof(0, 3, 4, 15, 10, 'gable', roof, cedar, { axis: 'x', pitch: 3, overhang: 0.9 });
  k.roof(0, 15, 4, 21, 16, 'gable', roof, wall, { axis: 'z', pitch: 3, overhang: 0.9 });
  k.floor(0, 4, 10, 15, 13, fin('deck', '#8a6240'), 'terrace');
  // 家具
  k.item(0, 'bed-double', 5.5, 5.21, 0, '#e9e4da');
  k.item(0, 'wardrobe', 3.41, 8.9, 90);
  k.item(0, 'curtain', 5.5, 9.86, 180);
  k.item(0, 'kitchen-island', 11.5, 5.9, 0, '#2f3133');
  k.item(0, 'cupboard', 11.5, 4.33, 0, '#c8a57a');
  k.item(0, 'fridge', 13.8, 4.47, 0);
  k.item(0, 'dining', 11.5, 8.6, 0, '#7c5534');
  for (const [x, z, r] of [[11, 8.0, 0], [12, 8.0, 0], [11, 9.2, 180], [12, 9.2, 180]]) k.item(0, 'chair', x, z, r, '#7c5534');
  k.item(0, 'sofa', 8.58, 7.2, 90, '#e9e4da');
  k.item(0, 'low-table', 9.9, 7.2, 90, '#c8a57a');
  k.item(0, 'tv', 14.69, 7.2, 270, '#c8a57a');
  k.item(0, 'plant', 8.6, 9.4);
  k.item(0, 'bath', 19.5, 5.0, 0);
  k.item(0, 'toilet', 16.5, 4.45, 0);
  k.item(0, 'washbasin', 20.62, 8.5, 270);
  k.item(0, 'washer', 19.3, 9.6, 180);
  k.item(0, 'shoe-cabinet', 15.31, 14.5, 90, '#c8a57a');
  k.item(0, 'desk', 19.5, 15.58, 180);
  k.item(0, 'shelf', 20.75, 13.8, 270);
  k.item(0, 'low-table', 9, 11.5, 0, '#c8a57a');
  k.item(0, 'garage-carport', 3.5, 16.5, 0);
  k.item(0, 'tree', 13, 15.5, 0, '#8a9a3e');
  k.item(0, 'tree', 22.6, 18.5, 0, '#4f7a45');
  k.item(0, 'flowerbed', 10, 14, 0, '#f2c230');
  k.item(0, 'nameplate-post', 15, 19.2, 0, '#f2efe8', '高橋');
  return k.finish();
}

// ---------------------------------------------------------------------------
// 都市型の3階建て（狭小住宅）：間口の狭い土地に建つ縦長の家。1階はビルトインガレージ
// ---------------------------------------------------------------------------
function narrowTownhouse(): House {
  const k = new HouseKit('narrow');
  k.style = { sashColor: '#26282b', panelColor: '#2a2b2d', sash: 'alu-resin' };
  const ext = fin('metal-v', '#e1e3e4');
  const accent = fin('woodboard', '#7a5535');
  const floor = fin('flooring', '#a77b52');
  const door = { panelColor: WHITE };
  const x0 = 8, x1 = 15, z0 = 4, z1 = 16;
  // 1階：前半分はビルトインガレージ（道路側の壁はシャッターのところだけ開けておく）、奥に浴室・洗面・トイレと玄関ホール
  k.floor(0, x0, z0, x1, z1, fin('mortar', '#9a9a96'));
  const back = k.wall(0, x0, z0, x1, z0, ext, inner);
  const west = k.wall(0, x0, z0, x0, z1, ext, inner);
  const east = k.wall(0, x1, z0, x1, z1, ext, inner);
  k.wall(0, x0, z1, 9, z1, ext, inner);
  k.wall(0, 13, z1, x1, z1, ext, inner);
  const garage = k.wall(0, x0, 10, x1, 10, inner);
  k.open(garage, 'door', 5.5, door);
  k.open(garage, 'slide-door', 2, door);
  const wet = k.wall(0, x0, 7, x1, 7, inner);
  k.windows(wet, 'door', [1.5, 4, 6], door);
  k.wall(0, 11, z0, 11, 7, inner);
  k.wall(0, 13, z0, 13, 7, inner);
  k.open(east, 'entrance', 4.5, { panelColor: '#7b4f2f' });
  k.open(back, 'sliding-small', 2);
  k.open(west, 'high', 1.5);
  k.item(0, 'garage-shutter', 11, z1 - 0.2, 0);
  k.item(0, 'bath', 9.5, 4.52, 0);
  k.item(0, 'washbasin', 12, 6.62, 180);
  k.item(0, 'washer', 12, 4.42, 0);
  k.item(0, 'toilet', 14, 4.45, 0);
  k.item(0, 'shoe-cabinet', 14.7, 9.3, 270);
  k.stair(0, 9, 10, 0, wood, 'u');
  // 2階：LDK（外壁は木の羽目板）
  const f2 = k.box(1, x0, z0, x1, z1, accent, inner, floor);
  k.windows(f2.s, 'big-fix', [1.5, 5.5]);
  k.open(f2.w, 'sliding', 6);
  k.open(f2.e, 'sliding', 3);
  k.open(f2.e, 'sliding', 9);
  k.item(1, 'kitchen', 11.5, 4.44, 0);
  k.item(1, 'fridge', 9, 4.47, 0);
  k.item(1, 'dining', 11.5, 6.4, 0, '#c8a57a');
  for (const [x, z, r] of [[11, 5.8, 0], [12, 5.8, 0], [11, 7.0, 180], [12, 7.0, 180]]) k.item(1, 'chair', x, z, r);
  k.item(1, 'sofa', 11.5, 15.4, 180, '#4f5b52');
  k.item(1, 'low-table', 11.5, 14, 0);
  k.item(1, 'tv', 14.65, 13, 270, '#2f3133');
  k.item(1, 'plant', 8.6, 15.4);
  for (const x of [9.5, 13.5]) k.item(1, 'curtain', x, z1 - 0.13, 180, '#9aa7b3');
  k.stair(1, 9, 10, 0, wood, 'u');
  // 3階：寝室が3つ
  const f3 = k.box(2, x0, z0, x1, z1, ext, inner, floor);
  const rooms = k.wall(2, x0, 9, x1, 9, inner);
  k.windows(rooms, 'door', [1, 6.5], door);
  k.wall(2, 11, z0, 11, 9, inner);
  k.windows(f3.s, 'sliding', [2, 5]);
  k.open(f3.n, 'sliding-small', 1.5);
  k.open(f3.n, 'sliding', 5);
  k.open(f3.w, 'sliding', 9);
  k.item(2, 'bed-double', 11.5, 14.8, 180, '#9aa7b3');
  k.item(2, 'wardrobe', 14.59, 12.5, 270);
  k.item(2, 'bed-single', 13, 5.21, 0, '#e9e4da');
  k.item(2, 'desk', 9.5, 4.42, 0);
  k.item(2, 'bed-single', 9.5, 7.6, 90, '#c9b8a4');
  k.roof(2, x0, z0, x1, z1, 'shed', fin('standing', '#5d6166'), ext, { axis: 'x', pitch: 2, overhang: 0.4 });
  k.item(0, 'flowerpot', 7.4, 17);
  k.item(0, 'nameplate-post', 16, 17.5, 0, '#2f2a26', '中村');
  return k.finish();
}

// ---------------------------------------------------------------------------
// 集合住宅（アパート・マンション）。どの階も同じ間取りの部屋を横に並べる。
// 道路側（+Z）にバルコニー、奥に共用廊下、東の端に外階段（廊下に沿った直階段を上下の階で交互に）。
// 1階の真ん中をエントランスホールにすることもできる
// ---------------------------------------------------------------------------
interface ApartmentStyle {
  key: string;
  name: string;
  floors: number;
  units: number;
  x0: number;
  x1: number;
  /** 奥の壁（共用廊下側）と道路側の壁の z */
  zBack: number;
  zFront: number;
  exterior: Finish;
  /** バルコニーの手すり壁 */
  railing: Finish;
  roof: { type: 'flat' | 'gable' | 'hip'; finish: Finish; pitch?: number };
  frontWindows: string[];
  sash: { sashColor: string; panelColor: string; sash?: string };
  floor: Finish;
  lobby: boolean;
}

function apartment(st: ApartmentStyle): House {
  const k = new HouseKit(st.key);
  k.style = st.sash;
  const { x0, x1, zBack: c, zFront: zf } = st;
  const W = (x1 - x0) / st.units;
  const lobbyUnit = st.lobby ? Math.floor(st.units / 2) : -1;
  const corridor = fin('terrace-tile', '#a9a49b');
  const stairFinish = fin('mortar', '#9a9a96');
  for (let level = 0; level < st.floors; level++) {
    const box = k.box(level, x0, c, x1, zf, st.exterior, inner, level === 0 && st.lobby ? undefined : st.floor);
    for (let u = 0; u < st.units; u++) {
      const ux = x0 + u * W;
      const rel = u * W;
      if (u > 0) k.wall(level, ux, c, ux, zf, inner);
      if (level === 0 && st.lobby && u !== lobbyUnit) k.floor(0, ux, c, ux + W, zf, st.floor);
      if (level === 0 && u === lobbyUnit) {
        lobby(k, st, box, ux, rel, W);
        continue;
      }
      unit(k, st, box, level, ux, rel, W);
    }
    // 妻側の窓
    k.open(box.w, 'sliding', zf - c - 3);
    k.open(box.e, 'sliding', zf - c - 3);
    if (level > 0) {
      // 共用廊下とバルコニー（どちらも手すり壁で囲む）
      k.floor(level, x0, c - 2, x1, c, corridor, 'terrace');
      k.floor(level, x1, c - 2, x1 + 2, c, corridor, 'terrace');
      k.wall(level, x0, c - 2, x1 + 2, c - 2, st.railing, st.railing, 'half');
      k.wall(level, x0, c - 2, x0, c, st.railing, st.railing, 'half');
      k.floor(level, x0, zf, x1, zf + 2, fin('terrace-tile', '#c9c5bb'), 'terrace');
      k.wall(level, x0, zf + 2, x1, zf + 2, st.railing, st.railing, 'half');
      for (let u = 0; u <= st.units; u++) k.wall(level, x0 + u * W, zf, x0 + u * W, zf + 2, st.railing, st.railing, 'half');
    }
    if (level < st.floors - 1) {
      // 各階で同じ階段室を使い、2マス幅の踊り場から折り返す。
      k.stair(level, x1, c, 0, stairFinish, 'u');
      k.wall(level, x1 + 2, c - 2, x1 + 2, c + 3, st.railing, st.railing);
    }
  }
  // 1階：共用廊下と、専用庭の柵
  k.floor(0, x0, c - 2, x1 + 2, c, corridor, 'terrace');
  for (let u = 0; u < st.units; u++) {
    if (u === lobbyUnit) continue;
    const ux = x0 + u * W;
    k.floor(0, ux, zf, ux + W, zf + 2, fin('deck', '#8a6240'), 'terrace');
    k.wall(0, ux, zf + 2, ux + W, zf + 2, fin('galvalume', '#5d6166'), fin('galvalume', '#5d6166'), 'fence');
  }
  const top = st.floors - 1;
  const r = st.roof;
  if (r.type === 'flat') k.roof(top, x0, c, x1, zf, 'flat', r.finish, st.exterior, { overhang: 0.3 });
  else k.roof(top, x0, c, x1, zf, r.type, r.finish, st.exterior, { pitch: r.pitch ?? 3, overhang: 0.6 });
  // 外まわり
  k.item(0, 'mailbox', x1 + 1, Math.min(19.5, zf + 3.2), 0);
  k.item(0, 'tree', 1.2, Math.min(18.8, zf + 3.5));
  k.item(0, 'tree', 22.8, Math.min(18.8, zf + 3.5), 0, '#6c8f4e');
  k.item(0, 'nameplate-post', (x0 + x1) / 2 + 3, 19.3, 0, '#2f2a26', st.name);
  return k.finish();
}

/** 1部屋ぶん（1LDK、幅が8マス以上なら寝室つきの2LDK） */
function unit(k: HouseKit, st: ApartmentStyle, box: Box, level: number, ux: number, rel: number, W: number) {
  const { zBack: c, zFront: zf } = st;
  const door = { panelColor: WHITE };
  const bedroom = W >= 8;
  const wetX1 = bedroom ? ux + 4 : ux + W;
  // 玄関ドア・浴室の高窓・寝室の窓（廊下側）
  k.open(box.n, 'entrance', rel + 1, { panelColor: st.sash.panelColor });
  k.open(box.n, 'high', rel + 3);
  if (bedroom) k.open(box.n, 'sliding', rel + 6.5);
  // バルコニー側の窓
  const ats = W >= 8 ? [1.5, 4, 6.5].slice(0, st.frontWindows.length) : [1.5, 4.5];
  ats.forEach((at, i) => k.open(box.s, st.frontWindows[i % st.frontWindows.length], rel + at));
  // 間仕切り
  const hall = k.wall(level, ux + 2, c, ux + 2, c + 4, inner);
  k.open(hall, 'door', 3.5, door);
  const bath = k.wall(level, ux + 2, c + 2, wetX1, c + 2, fin('wall-tile', '#e9eef0'), inner);
  k.open(bath, 'door', 1, door);
  if (bedroom) k.wall(level, wetX1, c, wetX1, c + 4, inner);
  const ldk = k.wall(level, ux, c + 4, ux + W, c + 4, inner);
  k.open(ldk, 'door', 1, door);
  if (bedroom) k.open(ldk, 'door', 4.5, door);
  // 家具
  k.item(level, 'shoe-cabinet', ux + 0.3, c + 2.2, 90);
  k.item(level, 'bath', (ux + 2 + wetX1) / 2, c + 0.52, 0);
  k.item(level, 'washbasin', ux + 2.38, c + 2.5, 90);
  k.item(level, 'washer', wetX1 - 0.42, c + 2.45, 270);
  k.item(level, 'toilet', wetX1 - 0.45, c + 3.45, 270);
  k.item(level, 'kitchen', ux + W - 1.6, c + 4.44, 0);
  k.item(level, 'fridge', ux + 2.5, c + 4.47, 0);
  const lz = zf - 2.2;
  k.item(level, 'sofa', ux + 0.58, lz, 90, ['#7d8a96', '#b9ab97', '#4f5b52'][(level + ux) % 3]);
  k.item(level, 'low-table', ux + 1.9, lz, 90);
  k.item(level, 'tv', ux + W - 0.31, lz, 270);
  k.item(level, 'aircon', ux + W / 2, zf - 0.22, 180);
  for (const at of ats) k.item(level, 'curtain', ux + at, zf - 0.13, 180, ['#e9e4da', '#9aa7b3', '#c9b8a4'][(level + u0(ux)) % 3]);
  if (bedroom) {
    k.item(level, 'dining', ux + W - 2.2, c + 6.6, 0, '#c8a57a');
    k.item(level, 'chair', ux + W - 2.7, c + 6.0, 0);
    k.item(level, 'chair', ux + W - 1.7, c + 6.0, 0);
    k.item(level, 'bed-double', ux + 4 + (W - 4.8) / 2, c + 1.21, 0, '#e9e4da');
    k.item(level, 'wardrobe', ux + W - 0.41, c + 2.6, 270);
  } else {
    k.item(level, 'bed-single', ux + W - 0.63, c + 6.3, 0, '#e9e4da');
  }
  if (level > 0 && (ux + level) % 2 === 0) k.item(level, 'plant', ux + W - 0.6, zf + 1);
}

const u0 = (x: number) => Math.round(x);

/** エントランスホール（1階の真ん中の区画） */
function lobby(k: HouseKit, st: ApartmentStyle, box: Box, ux: number, rel: number, W: number) {
  const { zBack: c, zFront: zf } = st;
  k.floor(0, ux, c, ux + W, zf, fin('marble', '#e8e4dc'));
  const mid = W / 2;
  k.open(box.s, 'entrance-wide', rel + mid, { panelColor: '#26282b' });
  k.open(box.s, 'big-fix', rel + mid - 2);
  k.open(box.s, 'big-fix', rel + mid + 2);
  k.open(box.n, 'entrance-wide', rel + mid, { panelColor: '#26282b' });
  k.item(0, 'mailbox', ux + 0.3, c + 5, 90);
  k.item(0, 'sofa', ux + W - 0.58, c + 6, 270, '#4f5b52');
  k.item(0, 'rug', ux + W / 2, c + 6, 0, '#7d8a96');
  k.item(0, 'plant', ux + 0.6, zf - 0.6);
  k.item(0, 'plant', ux + W - 0.6, zf - 0.6);
  k.item(0, 'floor-lamp', ux + W - 0.6, c + 8.2);
  k.floor(0, ux, zf, ux + W, zf + 2, fin('terrace-tile', '#b9b2a3'), 'terrace');
}

// ---------------------------------------------------------------------------
// 一覧
// ---------------------------------------------------------------------------
const sash = (sashColor: string, panelColor: string, s?: string) => ({ sashColor, panelColor, ...(s ? { sash: s } : {}) });

export const TOWN_HOUSE_DESIGNS: TownHouseDesign[] = [
  {
    id: 'steel-family', name: '鉄骨2階建ての家', model: '大手ハウスメーカーの鉄骨住宅（彫りの深いコンクリート外壁・低い寄棟）', kind: 'house',
    build: () => familyHouse({
      key: 'steel', exterior: fin('deep-concrete', '#cbbfa8'), floor: fin('flooring', '#c8a57a'),
      roof: { type: 'hip', finish: fin('slate', '#3b3d40'), pitch: 3 }, sash: sash('#6f7377', '#3b2c22', 'alu-resin'),
      living: ['patio', 'patio', 'big-fix'], bedroomWindow: 'sliding', balcony: fin('terrace-tile', '#c9c5bb'), carport: true,
      family: '佐藤', sofa: 'sofa-l',
    }),
  },
  {
    id: 'wood-ceramic', name: '陶版外壁の木造住宅', model: '大手ハウスメーカーの木造住宅（陶版外壁・平板瓦の切妻）', kind: 'house',
    build: () => familyHouse({
      key: 'ceramic', exterior: fin('ceramic-wall', '#9b8670'), upper: fin('ceramic-wall', '#ece6da'), floor: fin('walnut-floor', '#6b4a33'),
      roof: { type: 'gable', finish: fin('kawara-flat', '#3a3c3f'), pitch: 4, axis: 'x', overhang: 0.75 },
      sash: sash('#3b2c22', '#5a3e2b', 'wood'), living: ['patio', 'patio', 'patio'], bedroomWindow: 'sliding',
      balcony: fin('deck', '#8a6240'), carport: true, family: '鈴木', sofa: 'sofa', accent: '#5a3e2b',
    }),
  },
  {
    id: 'provence', name: '南欧風の家', model: '南欧（プロヴァンス）風の注文住宅（塗り壁・S形瓦の寄棟）', kind: 'house',
    build: () => familyHouse({
      key: 'nanou', exterior: fin('stucco', '#f1e3c8'), floor: fin('cushion-floor', '#c8a57a'),
      roof: { type: 'hip', finish: fin('kawara-s', '#b8613f'), pitch: 4, overhang: 0.5 }, sash: sash('#f1f1ef', '#8a5236'),
      living: ['patio', 'patio', 'sliding'], bedroomWindow: 'casement-tall', balcony: null, carport: false,
      family: '伊藤', sofa: 'sofa',
    }),
  },
  {
    id: 'nordic', name: '北欧風の木の家', model: '北欧住宅（白い板張り・木製トリプルガラス窓・急勾配の切妻）', kind: 'house',
    build: () => familyHouse({
      key: 'nordic', exterior: fin('cedar', '#e8dcc6'), floor: fin('hinoki-floor', '#d8b98f'),
      roof: { type: 'gable', finish: fin('shingle', '#3b3d40'), pitch: 7, axis: 'x', overhang: 0.45 },
      sash: sash('#f1f1ef', '#2d3b52', 'resin-triple'), living: ['patio', 'big-fix', 'patio'], bedroomWindow: 'casement-tall',
      balcony: null, carport: false, family: '渡辺', sofa: 'sofa',
    }),
  },
  {
    id: 'cube', name: 'キューブ型のモダン住宅', model: '箱型のシンプルモダン住宅（ガルバリウム外壁・陸屋根）', kind: 'house',
    build: () => familyHouse({
      key: 'cube', exterior: fin('galvalume', '#2c2e31'), upper: fin('woodboard', '#a0754d'), floor: fin('big-tile', '#d9d6cf'),
      roof: { type: 'flat', finish: fin('sheet', '#6e6a64'), pitch: 0, overhang: 0.3 }, sash: sash('#26282b', '#2a2b2d', 'resin'),
      living: ['big-fix', 'patio', 'big-fix'], bedroomWindow: 'sliding', balcony: fin('terrace-tile', '#8d8c88'), carport: true,
      family: '小林', sofa: 'sofa-l',
    }),
  },
  { id: 'japanese', name: '和風の家', model: '瓦屋根の日本家屋（焼杉と漆喰・いぶし瓦・縁側）', kind: 'house', build: japaneseHouse },
  { id: 'hiraya', name: '平屋の家', model: 'L字の平屋（ガルバリウム立平葺き・ウッドデッキ）', kind: 'house', build: singleStoryHouse },
  { id: 'narrow', name: '3階建ての家', model: '都市型の狭小3階建て（ビルトインガレージ）', kind: 'house', build: narrowTownhouse },
  {
    id: 'wood-apartment', name: 'ハイツ・コーポ（木造アパート）', model: '2階建ての木造アパート（外廊下・外階段）', kind: 'apartment',
    build: () => apartment({
      key: 'wapt', name: 'コーポ桜', floors: 2, units: 3, x0: 3, x1: 21, zBack: 4, zFront: 15,
      exterior: fin('siding', '#d9d2c3'), railing: fin('siding', '#6e6a64'),
      roof: { type: 'gable', finish: fin('slate', '#3a4a5c'), pitch: 3 }, frontWindows: ['patio'], sash: sash('#b8bcc0', '#a69d92'),
      floor: fin('cushion-floor', '#c8a57a'), lobby: false,
    }),
  },
  {
    id: 'steel-apartment', name: 'ALCの鉄骨アパート', model: '3階建ての鉄骨アパート（ALCパネル・陸屋根）', kind: 'apartment',
    build: () => apartment({
      key: 'sapt', name: 'メゾン青葉', floors: 3, units: 3, x0: 3, x1: 21, zBack: 4, zFront: 15,
      exterior: fin('alc', '#e9e6df'), railing: fin('alc', '#7a7772'),
      roof: { type: 'flat', finish: fin('sheet', '#7d7a74') }, frontWindows: ['patio'], sash: sash('#b8bcc0', '#2d3b52', 'alu-resin'),
      floor: fin('flooring', '#c8a57a'), lobby: false,
    }),
  },
  {
    id: 'mansion', name: '分譲マンション', model: '5階建ての分譲マンション（タイル張り・エントランスホール）', kind: 'mansion',
    build: () => apartment({
      key: 'mansion', name: 'パークハイム', floors: 5, units: 3, x0: 3, x1: 21, zBack: 3, zFront: 15,
      exterior: fin('border-tile', '#b8a68c'), railing: fin('concrete', '#d2d0ca'),
      roof: { type: 'flat', finish: fin('sheet', '#7d7a74') }, frontWindows: ['patio'], sash: sash('#6f7377', '#3b2c22', 'alu-resin'),
      floor: fin('flooring', '#a77b52'), lobby: true,
    }),
  },
  {
    id: 'designers', name: 'デザイナーズマンション', model: 'コンクリート打ち放しの4階建てマンション（大開口のFIX窓）', kind: 'mansion',
    build: () => apartment({
      key: 'designers', name: 'RC SQUARE', floors: 4, units: 2, x0: 3, x1: 21, zBack: 3, zFront: 14,
      exterior: fin('concrete', '#bdbcb8'), railing: fin('concrete', '#a5a49f'),
      roof: { type: 'flat', finish: fin('sheet', '#8d8c88') }, frontWindows: ['big-fix', 'patio', 'big-fix'], sash: sash('#26282b', '#2a2b2d', 'resin'),
      floor: fin('mortar', '#a9a6a0'), lobby: true,
    }),
  },
  {
    id: 'tower', name: 'タワーマンション', model: '9階建ての都心のマンション（白いタイル・ガラスの手すり壁風）', kind: 'mansion',
    build: () => apartment({
      key: 'tower', name: 'ザ・タワー', floors: 9, units: 2, x0: 4, x1: 20, zBack: 3, zFront: 14,
      exterior: fin('tile', '#e8e2d6'), railing: fin('alc', '#cfc9bd'),
      roof: { type: 'flat', finish: fin('sheet', '#7d7a74') }, frontWindows: ['patio', 'big-fix', 'patio'], sash: sash('#8e9296', '#26282b', 'alu-resin'),
      floor: fin('herringbone', '#a77b52'), lobby: true,
    }),
  },
  {
    id: 'residence', name: '低層の高級レジデンス', model: '3階建ての低層高級マンション（天然石張り・屋上緑化）', kind: 'mansion',
    build: () => apartment({
      key: 'residence', name: 'グランレジデンス', floors: 3, units: 2, x0: 3, x1: 21, zBack: 3, zFront: 14,
      exterior: fin('natural-stone', '#cfc8bb'), railing: fin('natural-stone', '#8c7d6a'),
      roof: { type: 'flat', finish: fin('green-roof', '#6c8f4e') }, frontWindows: ['patio', 'patio', 'patio'], sash: sash('#5a4636', '#3b2c22', 'alu-resin'),
      floor: fin('walnut-floor', '#6b4a33'), lobby: true,
    }),
  },
];

const cache = new Map<number, House>();
export function townHouseDesign(id: string): TownHouseDesign | undefined {
  return TOWN_HOUSE_DESIGNS.find((d) => d.id === id);
}
/** その区画に建っている家（なければ null）。同じデザインでも区画ごとに部品の ID を分ける（ドアの開け閉めが別々になるように） */
export function townHouseAt(plot: number): House | null {
  const id = TOWN_HOUSE_PLOTS[plot];
  const design = id ? townHouseDesign(id) : undefined;
  if (!design) return null;
  let house = cache.get(plot);
  if (!house) {
    const h = design.build();
    const tag = (pid: string) => `${pid}@${plot}`;
    house = {
      ...h,
      floors: h.floors.map((f) => ({ ...f, id: tag(f.id) })),
      walls: h.walls.map((w) => ({ ...w, id: tag(w.id) })),
      openings: h.openings.map((o) => ({ ...o, id: tag(o.id), wallId: tag(o.wallId) })),
      stairs: h.stairs.map((st) => ({ ...st, id: tag(st.id) })),
      roofs: h.roofs.map((r) => ({ ...r, id: tag(r.id) })),
      furniture: h.furniture.map((f) => ({ ...f, id: tag(f.id), ...(f.wallMount ? { wallMount: { ...f.wallMount, wallId: tag(f.wallMount.wallId) } } : {}) })),
    };
    cache.set(plot, house);
  }
  return house;
}

/** プレイヤーの建築の上限（2階）を超える階を使っているか */
export function exceedsPlayerLevels(house: House): boolean {
  return house.walls.some((w) => w.level > MAX_LEVEL) || house.floors.some((f) => f.level > MAX_LEVEL);
}

export { TOWN_HOUSE_PLOTS };
