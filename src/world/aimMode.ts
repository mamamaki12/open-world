import { buildMenuOpen, useControls } from '../state/controls';
import { useGame } from '../state/store';
import { useVehicles } from '../state/vehicles';
export function aimBuilding() {
  const g = useGame.getState();
  return g.mode === 'walk' && g.view === 'first' && useControls.getState().aimBuild && !useVehicles.getState().driving && !g.overlay && !buildMenuOpen.current && g.tool !== 'select';
}
