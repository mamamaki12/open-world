import { create } from 'zustand';
import type { nearestSeat } from '../building/seating';

type Seat = NonNullable<ReturnType<typeof nearestSeat>>;
export const useSeating = create<{
  target: Seat | null;
  seated: Seat | null;
  returnTo: { x: number; y: number; z: number } | null;
  /** 近くのクローゼット収納（家具のid） */
  wardrobe: string | null;
}>(() => ({ target: null, seated: null, returnTo: null, wardrobe: null }));
