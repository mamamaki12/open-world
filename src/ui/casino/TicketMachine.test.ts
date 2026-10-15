import { describe, expect, it } from 'vitest';
import { BET_SHAPE, RACES, makeRace } from '../../economy/race';
import type { RaceKind } from '../../economy/race';
import { machineCombos, methodsOf } from './TicketMachine';

// 券売機：どの競技・式別・方式でも、ふつうに選べば買い目ができること
describe('券売機の買い目', () => {
  for (const kind of ['horse', 'keirin', 'boat'] as RaceKind[]) {
    for (const seed of [1, 2, 3, 4, 5]) {
      const race = makeRace(kind, 1, seed * 7919);
      for (const type of RACES[kind].bets) {
        const { k } = BET_SHAPE[type];
        const ids = type === 'bracket' ? [...new Set(race.runners.map((r) => r.frame))].sort((a, b) => a - b) : race.runners.map((r) => r.index);
        for (const method of methodsOf(type)) {
          it(`${kind} ${race.runners.length}頭 ${type} ${method}`, () => {
            let cols: number[][];
            if (k === 1) cols = [[ids[0]]];
            else if (method === 'nagashi') cols = [[ids[0]], ids.slice(1, k + 1)];
            else if (method === 'box') cols = [ids.slice(0, k + 1)];
            else if (method === 'formation') cols = Array.from({ length: k }, (_, i) => ids.slice(i, i + 2));
            else if (type === 'bracket') cols = [[ids[0]], [ids[1]]];
            else if (!BET_SHAPE[type].ordered) cols = [ids.slice(0, k)];
            else cols = Array.from({ length: k }, (_, i) => [ids[i]]);
            expect(machineCombos(race, type, method, cols).length).toBeGreaterThan(0);
          });
        }
      }
    }
  }

  it('枠連のゾロ目は2人以上いる枠だけ買える', () => {
    const race = makeRace('keirin', 1, 42);
    const size = (f: number) => race.runners.filter((r) => r.frame === f).length;
    const frames = [...new Set(race.runners.map((r) => r.frame))];
    for (const f of frames) expect(machineCombos(race, 'bracket', 'normal', [[f], [f]]).length).toBe(size(f) >= 2 ? 1 : 0);
  });
});
