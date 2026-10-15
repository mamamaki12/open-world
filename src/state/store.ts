// ゲーム状態（Zustand）。3D側とメニュー側の両方から使う。
import { create } from 'zustand';
import { removePart } from '../building/rules';
import { emptyHouse } from '../building/types';
import type { Finish, House, FloorKind, PartRef, RoofType, StairRail, WallHeight } from '../building/types';

/** build：建築モード（俯瞰で建てる） / walk：歩きモード（プレイヤーを動かす） */
export type Mode = 'build' | 'walk';
export type View = 'third' | 'first';

/** 画面いっぱいに開くメニュー（開いている間はゲームのキー操作を止める） */
export type Overlay = 'estate' | 'casino' | null;

export type Tool = 'select' | 'floor' | 'wall' | 'door' | 'window' | 'stair' | 'roof' | 'furniture' | 'erase';

export interface Defaults {
  floor: Finish;
  /** 床ツールで張るのが部屋の床かテラスか */
  floorKind: FloorKind;
  terrace: Finish;
  wallExterior: Finish;
  wallInterior: Finish;
  doorType: string;
  windowType: string;
  sashColor: string;
  sashType: string;
  panelColor: string;
  roofType: RoofType;
  roofPitch: number;
  roofOverhang: number;
  roofFinish: Finish;
  stairFinish: Finish;
  stairRail: StairRail;
  wallHeight: WallHeight;
  furnitureType: string;
  furnitureRotation: number;
  /** 表札に書く文字 */
  nameplateText: string;
}

export const INITIAL_DEFAULTS: Defaults = {
  floor: { material: 'flooring', color: '#c8a57a' },
  floorKind: 'room',
  terrace: { material: 'deck', color: '#8a6447' },
  wallExterior: { material: 'siding', color: '#f2efe8' },
  wallInterior: { material: 'wallpaper', color: '#f7f5f0' },
  doorType: 'entrance',
  windowType: 'sliding',
  sashColor: '#b8bcc0',
  sashType: 'alu',
  panelColor: '#5a3e2b',
  roofType: 'gable',
  roofPitch: 4,
  roofOverhang: 0.6,
  roofFinish: { material: 'slate', color: '#2f3133' },
  stairFinish: { material: 'oak', color: '#a77b52' },
  stairRail: 'left',
  wallHeight: 'full',
  furnitureType: 'sofa',
  furnitureRotation: 0,
  nameplateText: '山田',
};

const HISTORY_LIMIT = 200;

interface GameState {
  house: House;
  past: House[];
  future: House[];
  /** ドラッグ中の元の状態（ドラッグ全体を1回の取り消しにまとめる） */
  dragBase: House | null;

  mode: Mode;
  view: View;
  tool: Tool;
  /** いま置こうとしている階（マウスの下の面から自動で決まる。プレビューとマス目の高さに使う） */
  activeLevel: number;
  selection: PartRef | null;
  defaults: Defaults;
  message: { text: string; at: number } | null;
  overlay: Overlay;

  /** 変更を確定して取り消し履歴に積む。coalesce が直前と同じなら1回分にまとめる（スライダーや色選び） */
  commit: (next: House, coalesce?: string) => void;
  lastCommit: { key: string; at: number } | null;
  undo: () => void;
  redo: () => void;
  beginDrag: () => void;
  dragTo: (next: House) => void;
  endDrag: () => void;
  replaceHouse: (next: House) => void;

  setMode: (mode: Mode) => void;
  toggleView: () => void;
  setTool: (tool: Tool) => void;
  setLevel: (level: number) => void;
  select: (ref: PartRef | null) => void;
  deleteSelected: () => void;
  setDefaults: (patch: Partial<Defaults>) => void;
  notify: (text: string) => void;
  setOverlay: (overlay: Overlay) => void;
}

export const useGame = create<GameState>((set, get) => ({
  house: emptyHouse(),
  past: [],
  future: [],
  dragBase: null,

  mode: 'build',
  view: 'third',
  tool: 'select',
  activeLevel: 0,
  selection: null,
  defaults: INITIAL_DEFAULTS,
  message: null,
  overlay: null,

  lastCommit: null,
  commit: (next, coalesce) => {
    const { house, past, lastCommit } = get();
    if (next === house) return;
    const now = Date.now();
    const merge = coalesce !== undefined && lastCommit?.key === coalesce && now - lastCommit.at < 1500 && past.length > 0;
    set({
      house: next,
      past: merge ? past : [...past, house].slice(-HISTORY_LIMIT),
      future: [],
      lastCommit: coalesce ? { key: coalesce, at: now } : null,
    });
  },
  undo: () => {
    const { past, house, future } = get();
    if (!past.length) return;
    set({ house: past[past.length - 1], past: past.slice(0, -1), future: [house, ...future], selection: null, lastCommit: null });
  },
  redo: () => {
    const { past, house, future } = get();
    if (!future.length) return;
    set({ house: future[0], past: [...past, house], future: future.slice(1), selection: null, lastCommit: null });
  },
  beginDrag: () => set({ dragBase: get().house }),
  dragTo: (next) => set({ house: next }),
  endDrag: () => {
    const { dragBase, house, past } = get();
    if (!dragBase) return;
    if (dragBase === house) {
      set({ dragBase: null });
      return;
    }
    set({ dragBase: null, past: [...past, dragBase].slice(-HISTORY_LIMIT), future: [] });
  },
  replaceHouse: (next) => {
    get().commit(next);
    set({ selection: null });
  },

  // 歩きモードに入るときは手ぶら（選択ツール）から始める
  setMode: (mode) => set({ mode, selection: null, tool: mode === 'walk' ? 'select' : get().tool }),
  toggleView: () => set({ view: get().view === 'third' ? 'first' : 'third' }),
  setTool: (tool) => set({ tool, selection: tool === 'select' ? get().selection : null }),
  setLevel: (level) => {
    if (get().activeLevel !== level) set({ activeLevel: level });
  },
  select: (ref) => set({ selection: ref }),
  deleteSelected: () => {
    const { selection, house, commit } = get();
    if (!selection) return;
    commit(removePart(house, selection));
    set({ selection: null });
  },
  setDefaults: (patch) => set({ defaults: { ...get().defaults, ...patch } }),
  notify: (text) => set({ message: { text, at: Date.now() } }),
  setOverlay: (overlay) => {
    // 歩きモードでマウスを固定していたら外す（メニューのボタンを押せるように）
    if (overlay && typeof document !== 'undefined' && document.pointerLockElement) document.exitPointerLock();
    set({ overlay });
  },
}));
