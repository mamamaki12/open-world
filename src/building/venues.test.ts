import { expect,it } from 'vitest';
import { VENUES,VENUE_ACTIONS,VENUE_DOORS,venueAction,resolveVenue,venueAt,venueDoorAt,throughDoorway } from './venues';
import { atDealerDoor,DEALER } from './dealer';
import { atSaleSign } from './landSale';
import { plotX,plotZ } from '../economy/town';
import { GRID,LOT_D } from './dimensions';
it('offers every booth and showroom action only nearby',()=>{
  for(const kind of ['casino','estate','dealer'] as const){
    const b=VENUES[kind],cx=(b.x0+b.x1)/2,cz=(b.z0+b.z1)/2;
    for(const a of VENUE_ACTIONS[kind])expect(venueAction(kind,cx+a.x,cz+a.z)?.id).toBe(a.id);
    expect(venueAction(kind,-1000,-1000)).toBeNull();
    const q=resolveVenue(kind,{x:b.x0-10,z:b.z0-10});expect(q.x).toBeGreaterThan(b.x0);expect(q.z).toBeGreaterThan(b.z0);
  }
});
it('requires ground level and the front of the dealer or sale sign',()=>{
  const x=(DEALER.x0+DEALER.x1)/2;
  expect(atDealerDoor(x,DEALER.z0-1)).toBe(true);expect(atDealerDoor(x,DEALER.z0-1,3)).toBe(false);
  for(const plot of [-9,0,22]){
    const sx=plotX(plot)-1.1,sz=plotZ(plot)+LOT_D*GRID-.4;
    expect(atSaleSign(plot,sx,sz+1)).toBe(true);
    expect(atSaleSign(plot,sx,sz-1)).toBe(false);expect(atSaleSign(plot,sx,sz+1,3)).toBe(false);
  }
});
it('lets the player walk through an open shop door without changing space',()=>{
  for(const kind of ['casino','estate','dealer'] as const){
    const b=VENUES[kind],d=VENUE_DOORS[kind];
    expect(venueDoorAt(d.x,b.z0-1)).toBe(kind);expect(venueDoorAt(d.x,b.z0+1)).toBe(kind);
    expect(venueAt(d.x,b.z0-1)).toBeNull();expect(venueAt(d.x,b.z0+1)).toBe(kind);
    expect(throughDoorway(kind,{x:d.x+d.width/2-.1,z:b.z0+.1})?.x).toBeCloseTo(d.x+d.width/2-.25);
    expect(throughDoorway(kind,{x:d.x+d.width/2+.3,z:b.z0+.1})).toBeNull();
    expect(throughDoorway(kind,{x:d.x,z:b.z0+3})).toBeNull();
  }
});
