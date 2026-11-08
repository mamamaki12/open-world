import {expect,it} from 'vitest';
import {reservesTouch} from './gestures';
it('one finger never turns the view while holding a placing tool; erase/select still look',()=>{
  for(const tool of ['erase','select'] as const)expect(reservesTouch(tool,'build',false,true)).toBe(false);
  for(const tool of ['floor','wall','roof','stair','furniture','door','window'] as const){expect(reservesTouch(tool,'build',false,true)).toBe(true);expect(reservesTouch(tool,'build',false,false)).toBe(true);}
  expect(reservesTouch('erase','build',true,true)).toBe(true);
  expect(reservesTouch('erase','build',true,false)).toBe(false);
  expect(reservesTouch('erase','walk',true,true)).toBe(false);
});
