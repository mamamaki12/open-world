import { create } from 'zustand';
import { useEconomy } from './economy';
import { useGame } from './store';
import { useInteraction } from './interaction';

export const useBuildView = create<{ focusVersion: number }>(() => ({ focusVersion: 0 }));

/** 所有する家を編集対象に切り替え、以前の土地の設計はswitchLotで保持する。 */
export function selectLotForEditing(id: string): boolean {
  const economy = useEconomy.getState();
  if (!economy.lots.some(lot => lot.id === id)) return false;
  useGame.getState().endDrag();
  economy.switchLot(id);
  useInteraction.setState({ preview: null, furnitureDrag: null, buildingDrag: null });
  useGame.setState({ mode: 'build', tool: 'select', selection: null, marked: [], activeLevel: 0 });
  useBuildView.setState(s => ({ focusVersion: s.focusVersion + 1 }));
  return true;
}
