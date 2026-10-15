import {expect,it} from 'vitest';
import {reservesTouch} from './gestures';
it('allows look swipes with tap tools and ordinary erase, but keeps intentional drawing',()=>{
  for(const tool of ['furniture','stair','door','window','erase','select'] as const)expect(reservesTouch(tool,'build',false,true)).toBe(false);
  for(const tool of ['floor','wall','roof'] as const){expect(reservesTouch(tool,'build',false,true)).toBe(true);expect(reservesTouch(tool,'build',false,false)).toBe(false);}
  expect(reservesTouch('erase','build',true,true)).toBe(true);
  expect(reservesTouch('erase','walk',true,true)).toBe(false);
});
