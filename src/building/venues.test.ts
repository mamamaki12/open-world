import { expect,it } from 'vitest';
import { VENUE_KINDS,VENUES,VENUE_ACTIONS,VENUE_DOORS,venueAction,resolveVenue,venueAt,venueDoorAt,throughDoorway,orientVenuePoint,venueEntrance,venueTurn } from './venues';
import { atDealerDoor,DEALER,DEALER_LOT } from './dealer';
import { atSaleSign } from './landSale';
import { plotX,plotZ } from '../economy/town';
import { GRID,LOT_D } from './dimensions';
it('offers every booth and showroom action only nearby',()=>{
  for(const kind of VENUE_KINDS){
    const b=VENUES[kind],cx=(b.x0+b.x1)/2,cz=(b.z0+b.z1)/2;
    for(const a of VENUE_ACTIONS[kind]){const p=orientVenuePoint(kind,{x:cx+a.x,z:cz+a.z});expect(venueAction(kind,p.x,p.z)?.id).toBe(a.id);}
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
  for(const kind of VENUE_KINDS){
    const b=VENUES[kind],d=VENUE_DOORS[kind];
    const sensor=(distance:number)=>{const p=venueEntrance(kind,distance);return venueDoorAt(p.x,p.z);};
    expect(sensor(1)).toBe(kind);expect(sensor(-1)).toBe(kind);
    // 店の奥へ入る・外で離れると自動ドアのセンサーから外れる
    expect(sensor(-2.5)).toBeNull();expect(sensor(3)).toBeNull();
    const outside=venueEntrance(kind,1),inside=venueEntrance(kind,-1);
    expect(venueAt(outside.x,outside.z)).toBeNull();expect(venueAt(inside.x,inside.z)).toBe(kind);
    const point=orientVenuePoint(kind,{x:d.x+d.width/2-.1,z:b.z0+.1});
    const expected=orientVenuePoint(kind,{x:d.x+d.width/2-.25,z:b.z0+.1});
    expect(throughDoorway(kind,point)?.x).toBeCloseTo(expected.x);
    expect(throughDoorway(kind,orientVenuePoint(kind,{x:d.x+d.width/2+.3,z:b.z0+.1}))).toBeNull();
    expect(throughDoorway(kind,venueEntrance(kind,-3))).toBeNull();
  }
});
it('keeps every shop and dealer parking off roads and residential plots',async()=>{
  const { TOWN_ROADS, CIVIC_SITE, FIRST_PLOT, LAST_PLOT } = await import('../economy/town');
  const { LOT_W } = await import('./dimensions');
  const { DEALER_LOT } = await import('./dealer');
  for (const b of [...VENUE_KINDS.map(k => VENUES[k]), DEALER_LOT]) {
    const g = { x0: b.x0 + CIVIC_SITE.x, x1: b.x1 + CIVIC_SITE.x, z0: b.z0 + CIVIC_SITE.z, z1: b.z1 + CIVIC_SITE.z };
    for (const r of TOWN_ROADS) expect(g.x0 < r.x1 && g.x1 > r.x0 && g.z0 < r.z1 && g.z1 > r.z0).toBe(false);
    for(let plot=FIRST_PLOT;plot<=LAST_PLOT;plot++)expect(g.x0<plotX(plot)+LOT_W*GRID&&g.x1>plotX(plot)&&g.z0<plotZ(plot)+LOT_D*GRID&&g.z1>plotZ(plot)).toBe(false);
  }
});
it('keeps every shop apart from other buildings and parking',()=>{
  const boxes=[...VENUE_KINDS.map(k=>({k,...VENUES[k]})),{k:'lot',...DEALER_LOT}];
  for(const a of boxes)for(const b of boxes){
    if(a===b)continue;
    expect(a.x0<b.x1&&a.x1>b.x0&&a.z0<b.z1&&a.z1>b.z0).toBe(false);
  }
});
it('distributes boutiques across north and south and mixes services between southern clothing stores',async()=>{
  const { CIVIC_SITE,TOWN_BOUNDS }=await import('../economy/town');
  for(const k of ['maison','urban'] as const)expect(VENUES[k].z1+CIVIC_SITE.z).toBeLessThan(TOWN_BOUNDS.z0);
  for(const k of ['daily','atelier'] as const)expect(VENUES[k].z0+CIVIC_SITE.z).toBeGreaterThan(TOWN_BOUNDS.z1);
  expect(VENUES.daily.x1).toBeLessThan(VENUES.estate.x0);
  expect(VENUES.estate.x1).toBeLessThan(VENUES.atelier.x0);
  expect(VENUES.atelier.x1).toBeLessThan(VENUES.exchange.x0);
  expect(VENUES.urban.x0-VENUES.maison.x1).toBeGreaterThan(80);
});
it('provides walkable approaches linked to a town road for the north stores',async()=>{
  const { SHOP_PATHS }=await import('./shopPaths');
  const { CIVIC_SITE,TOWN_ROADS,TOWN_BOUNDS }=await import('../economy/town');
  const overlaps=(a:{x0:number;x1:number;z0:number;z1:number},b:typeof a)=>a.x0<b.x1&&a.x1>b.x0&&a.z0<b.z1&&a.z1>b.z0;
  for(const k of ['maison','urban'] as const){
    const p=venueEntrance(k,1),x=p.x+CIVIC_SITE.x,z=p.z+CIVIC_SITE.z;
    const front=SHOP_PATHS.find(p=>x>p.x0&&x<p.x1&&z>p.z0&&z<p.z1)!;
    expect(front).toBeDefined();expect(front.z0).toBeGreaterThan(TOWN_BOUNDS.z0-25);
    expect(TOWN_ROADS.some(r=>overlaps(front,r))).toBe(true);
    // The entrance now directly faces the nearest road, without walking around the back.
    expect(venueEntrance(k).z+CIVIC_SITE.z).toBeLessThan(TOWN_BOUNDS.z0-10);
    expect(venueTurn(k)).toBe(-1);
    expect(venueDoorAt(VENUE_DOORS[k].x,VENUES[k].z0-1)).toBeNull();
    for(const path of SHOP_PATHS)for(const kind of VENUE_KINDS){
      const v=VENUES[kind],g={x0:v.x0+CIVIC_SITE.x,x1:v.x1+CIVIC_SITE.x,z0:v.z0+CIVIC_SITE.z,z1:v.z1+CIVIC_SITE.z};
      expect(overlaps(path,g)).toBe(false);
    }
  }
});
it('keeps the player out of the clothes shop walls except through the door',async()=>{
  const { resolveLandmarks } = await import('./landmarks');
  const b=VENUES.urban,d=VENUE_DOORS.urban;
  expect(resolveLandmarks({x:d.x+3,z:b.z0+.1}).z).toBeLessThan(b.z0);
});
it('opens the custom shop right next to the dealer',()=>{
  expect(DEALER.x0-VENUES.tuner.x1).toBeGreaterThan(0);expect(DEALER.x0-VENUES.tuner.x1).toBeLessThan(4);
});
