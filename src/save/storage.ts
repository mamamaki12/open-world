// ブラウザ内へのセーブとロード（localStorage）
import type { House } from '../building/types';

const AUTOSAVE_KEY = 'open-world:autosave:v1';
const SLOT_KEY = (slot: number) => `open-world:slot${slot}:v1`;
export const SLOT_COUNT = 3;

export interface SlotInfo {
  slot: number;
  savedAt: number | null;
}

interface SaveFile {
  savedAt: number;
  house: House;
}

function read(key: string): SaveFile | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const data = JSON.parse(raw) as SaveFile;
    return isHouse(data?.house) ? data : null;
  } catch {
    return null;
  }
}

function write(key: string, house: House): boolean {
  try {
    const data: SaveFile = { savedAt: Date.now(), house };
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function isHouse(h: unknown): h is House {
  if (!h || typeof h !== 'object') return false;
  const o = h as Record<string, unknown>;
  return (
    o.version === 1 &&
    ['floors', 'walls', 'openings', 'stairs', 'roofs', 'furniture'].every((k) => Array.isArray(o[k]))
  );
}

export const autosave = (house: House) => write(AUTOSAVE_KEY, house);
export const loadAutosave = () => read(AUTOSAVE_KEY)?.house ?? null;
export const saveSlot = (slot: number, house: House) => write(SLOT_KEY(slot), house);
export const loadSlot = (slot: number) => read(SLOT_KEY(slot))?.house ?? null;
export function slotInfos(): SlotInfo[] {
  return Array.from({ length: SLOT_COUNT }, (_, i) => ({ slot: i + 1, savedAt: read(SLOT_KEY(i + 1))?.savedAt ?? null }));
}
