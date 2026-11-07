import { describe, expect, it } from 'vitest';
import { checkQuest, questAt, questBoard, questDone, missingText } from './quests';
import { emptyHouse } from '../building/types';

const fin = { material: 'flooring', color: '#fff' };
describe('quests', () => {
  it('board has 3 distinct quests and is deterministic', () => {
    const b = questBoard(0);
    expect(new Set(b.map((q) => q.title)).size).toBe(3);
    expect(questBoard(0)).toEqual(b);
  });
  it('checks conditions against a house', () => {
    const q = questAt(0); // 10畳・ベッド・キッチン・風呂・トイレ
    const h = emptyHouse();
    expect(questDone(checkQuest(q, h, 'rural'))).toBe(false);
    h.floors.push({ id: 'f', level: 0, x0: 0, z0: 0, x1: 4, z1: 5, finish: fin });
    for (const type of ['bed-single', 'kitchen', 'bath', 'toilet']) h.furniture.push({ id: type, level: 0, type, x: 1, z: 1, rotation: 0, color: '#fff' });
    const c = checkQuest(q, h, 'rural');
    expect(questDone(c)).toBe(true);
    expect(missingText(c)).toContain('条件クリア');
  });
  it('location and levels', () => {
    const q = questAt(5);
    const c = checkQuest(q, emptyHouse(), 'town');
    expect(c.find((x) => x.label.startsWith('立地'))?.ok).toBe(false);
    expect(missingText(c)).toContain('あと：');
  });
});
