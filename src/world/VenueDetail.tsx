import type { ReactNode } from 'react';
import { BuildingDetail } from './BuildingDetail';
import type { BuildingBounds } from './buildingLod';
import { VENUES } from '../building/venues';
import type { Venue } from '../building/venues';
import { BOUTIQUE_INFO, isBoutique } from '../building/boutiques';
import { CASINO } from '../building/landmarks';
import { useVenue } from '../state/venue';
export function venueBounds(kind:Venue,centred=false):BuildingBounds {
  const b=VENUES[kind],cx=centred?(b.x0+b.x1)/2:0,cz=centred?(b.z0+b.z1)/2:0;
  return {x0:b.x0-cx,x1:b.x1-cx,y0:0,y1:isBoutique(kind)?BOUTIQUE_INFO[kind].height:kind==='casino'?CASINO.height+2:kind==='dealer'||kind==='tuner'?5.4:kind==='exchange'?7:4.5,z0:b.z0-cz,z1:b.z1-cz};
}
function DistantVenue({kind}:{kind:Venue}){
  const b=VENUES[kind],w=b.x1-b.x0,d=b.z1-b.z0,h=venueBounds(kind).y1,x=(b.x0+b.x1)/2,z=(b.z0+b.z1)/2;
  const facade=isBoutique(kind)?BOUTIQUE_INFO[kind].facade:b.wall,trim=isBoutique(kind)?BOUTIQUE_INFO[kind].sign:b.trim;
  return <group userData={{distantVenue:kind}}>
    <mesh position={[x,h/2,z]} castShadow receiveShadow><boxGeometry args={[w,h,d]}/><meshStandardMaterial color={facade} roughness={.8}/></mesh>
    <mesh position={[x,h*.48,b.z0-.02]}><boxGeometry args={[w*.82,h*.52,.04]}/><meshStandardMaterial color="#34474e" roughness={.6}/></mesh>
    <mesh position={[x,h*.86,b.z0-.04]}><boxGeometry args={[w*.92,h*.2,.08]}/><meshStandardMaterial color={trim} roughness={.7}/></mesh>
  </group>;
}
/** Exterior names remain stable so aim and camera obstruction still find the building. */
export function VenueExteriorDetail({kind,children}:{kind:Venue;children:ReactNode}){
  const inside=useVenue(s=>s.inside===kind);
  return <BuildingDetail bounds={venueBounds(kind)} forceFull={inside} name={isBoutique(kind)?'venue-'+kind:kind}>{tier=>tier==='distant'?<DistantVenue kind={kind}/>:children}</BuildingDetail>;
}
export function VenueInteriorDetail({kind,centred=false,children}:{kind:Venue;centred?:boolean;children:ReactNode}){
  const inside=useVenue(s=>s.inside===kind);
  return <BuildingDetail bounds={venueBounds(kind,centred)} forceFull={inside} name={'interior-'+kind}>{tier=>tier==='near'?children:null}</BuildingDetail>;
}
