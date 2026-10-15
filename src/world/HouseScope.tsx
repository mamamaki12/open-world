import { createContext, useContext } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import type { House, PartRef } from '../building/types';
import { useGame } from '../state/store';

export type ActivateHouse = (event: ThreeEvent<PointerEvent>, part: PartRef) => void;
export const HouseScope = createContext<{ house: House | null; activate?: ActivateHouse }>({ house: null });
export function useHouseData() {
  const current = useGame(s => s.house);
  return useContext(HouseScope).house ?? current;
}
