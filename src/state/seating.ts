import { create } from 'zustand';
import type { nearestSeat } from '../building/seating';

type Seat = NonNullable<ReturnType<typeof nearestSeat>>;
export const useSeating = create<{
  target: Seat | null;
  seated: Seat | null;
  returnTo: { x: number; y: number; z: number } | null;
}>(() => ({ target: null, seated: null, returnTo: null }));
