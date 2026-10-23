import { expect, it } from 'vitest';
import { initialEditingLot, confirmedPurchaseLot } from './editingTarget';
import { emptyHouse } from '../building/types';
import type { Lot } from '../state/economy';
import type { WorldSave } from './saves';
const lot=(id:string,owner:string,plot:number):Lot=>({id,owner,plot,name:id,location:'rural',variance:1,built:emptyHouse(),design:null,construction:null,rented:false,invested:0});
const a=lot('first','a',0),b=lot('mine','b',1),c=lot('mine2','b',2);
it('selects the joining player’s property instead of the server’s first property',()=>{
  expect(initialEditingLot([a,b],a.id,a.id,'b')).toBe(b.id);
  expect(initialEditingLot([a,b],null,a.id,'b')).toBe(b.id);
  expect(initialEditingLot([a,b,c],c.id,a.id,'b')).toBe(c.id);
});
it('falls back to the open lot when the player owns none',()=>{
  expect(initialEditingLot([a,b],b.id,a.id,'c')).toBe(b.id);
  expect(initialEditingLot([a],null,a.id,'c')).toBe(a.id);
  expect(initialEditingLot([],null,null,'c')).toBeNull();
});
const world:WorldSave={worldId:'world',house:emptyHouse(),doors:{},receipts:{buy:{sender:'b',cost:10}},economy:{day:1,clock:0,market:1,marketHistory:[1],lots:[a,b],currentLotId:a.id,offers:[]}};
it('focuses only the purchased lot confirmed for this player',()=>{
  expect(confirmedPurchaseLot(world,'buy',{plot:1},'b')).toBe(b.id);
  expect(confirmedPurchaseLot(world,'buy',{lot:b.id},'b')).toBe(b.id);
  expect(confirmedPurchaseLot(world,'buy',{plot:0},'b')).toBeUndefined();
  expect(confirmedPurchaseLot(world,'buy',{plot:1},'a')).toBeUndefined();
  expect(confirmedPurchaseLot(world,'missing',{plot:1},'b')).toBeUndefined();
  expect(confirmedPurchaseLot({...world,receipts:{buy:{sender:'b',cost:0,cancelled:true}}},'buy',{plot:1},'b')).toBeUndefined();
});
