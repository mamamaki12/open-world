import {expect,it} from 'vitest';
import {cycleTool,QUICK_TOOLS} from './controls';
it('scrolls in both directions and wraps at the ends of the hotbar',()=>{
  expect(cycleTool('select',-1)).toBe('erase');expect(cycleTool('erase',1)).toBe('select');
  for(let i=0;i<QUICK_TOOLS.length;i++)expect(cycleTool(QUICK_TOOLS[i],1)).toBe(QUICK_TOOLS[(i+1)%QUICK_TOOLS.length]);
});
