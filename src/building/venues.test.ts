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
    // 店の奥へ入る・外で離れると自動ドアのセンサーから外れる
    expect(venueDoorAt(d.x,b.z0+2.5)).toBeNull();expect(venueDoorAt(d.x,b.z0-3)).toBeNull();
    expect(venueAt(d.x,b.z0-1)).toBeNull();expect(venueAt(d.x,b.z0+1)).toBe(kind);
    expect(throughDoorway(kind,{x:d.x+d.width/2-.1,z:b.z0+.1})?.x).toBeCloseTo(d.x+d.width/2-.25);
    expect(throughDoorway(kind,{x:d.x+d.width/2+.3,z:b.z0+.1})).toBeNull();
    expect(throughDoorway(kind,{x:d.x,z:b.z0+3})).toBeNull();
  }
});
it('keeps every shop and the dealer parking lot off the roads and facing the front road',async()=>{
  const { TOWN_ROADS, CIVIC_SITE } = await import('../economy/town');
  const { DEALER_LOT } = await import('./dealer');
  const front = TOWN_ROADS.filter(r => r.x1 - r.x0 > 100).sort((a, b) => b.z1 - a.z1)[0];
  for (const b of [VENUES.casino, VENUES.estate, VENUES.dealer, DEALER_LOT]) {
    const g = { x0: b.x0 + CIVIC_SITE.x, x1: b.x1 + CIVIC_SITE.x, z0: b.z0 + CIVIC_SITE.z, z1: b.z1 + CIVIC_SITE.z };
    for (const r of TOWN_ROADS) expect(g.x0 < r.x1 && g.x1 > r.x0 && g.z0 < r.z1 && g.z1 > r.z0).toBe(false);
    expect(g.x0).toBeGreaterThanOrEqual(front.x0);expect(g.x1).toBeLessThanOrEqual(front.x1);expect(g.z0 - front.z1).toBeLessThan(4);
  }
});
