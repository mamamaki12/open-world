import * as THREE from 'three';
const cache=new Map<string,THREE.BufferGeometry>();

/** Rings share vertices across the joint; smooth weights distribute the bend over 12cm. */
export function tailoredLimb(leg:boolean,style:string,wide=false):THREE.BufferGeometry {
  const key=`${leg}|${style}|${wide}`;const old=cache.get(key);if(old)return old;
  const joint=leg?.43:.27,total=leg?.85:.52,radial=24;
  const bare=leg?style==='skirt':false;
  const cut=bare?-1:leg?(style==='shorts'?.29:total+.02):(style==='tee'?.16:total-.025);
  const cap=leg?.08:.045;
  const samples=new Set<number>();for(let i=0;i<=64;i++)samples.add(-cap+(total+cap+.015)*i/64);
  if(cut>0&&cut<total){samples.add(cut-.003);samples.add(cut);samples.add(cut+.003);}
  const rings=[...samples].sort((a,b)=>a-b);
  const positions:number[]=[],normals:number[]=[],uv:number[]=[],indices:number[]=[],weights:number[]=[],bones:number[]=[];
  const geometry=new THREE.BufferGeometry();
  const smooth=(a:number,b:number,x:number)=>THREE.MathUtils.smoothstep(x,a,b);
  for(let row=0;row<rings.length;row++){
    const d=rings[row],clothed=d<=cut;
    const skinRadius=leg?THREE.MathUtils.lerp(.075,.033,Math.max(0,d)/total):THREE.MathUtils.lerp(.049,.027,Math.max(0,d)/total);
    let radius=skinRadius;
    if(clothed){
      // Cloth hangs away from the muscles; straight trouser legs, roomy sleeves.
      radius=leg?THREE.MathUtils.lerp(wide?.108:.092,wide?.094:.068,Math.max(0,d)/total):THREE.MathUtils.lerp(style==='hoodie'||style==='coat'?.083:.072,.049,Math.max(0,d)/total);
      radius+=Math.sin(Math.max(0,d)*42)*.0015;
    }
    if(d<0)radius*=Math.sqrt(Math.max(.001,1-(d/cap)**2));
    if(d>total-.01)radius*=Math.sqrt(Math.max(.001,1-((d-total+.01)/.028)**2));
    for(let j=0;j<=radial;j++){
      const a=j/radial*Math.PI*2;
      // Restrained vertical fabric folds, not anatomical bulges.
      const fold=clothed?1+.018*Math.cos(a*6+d*6):1;
      positions.push(Math.sin(a)*radius*fold,-d,Math.cos(a)*radius*fold*(leg?1.05:.97));
      normals.push(Math.sin(a),0,Math.cos(a));uv.push(j/radial,row/(rings.length-1));
      const w=smooth(joint-.065,joint+.065,d);
      bones.push(0,1,0,0);weights.push(1-w,w,0,0);
    }
  }
  for(let row=0;row<rings.length-1;row++){
    const start=indices.length;
    for(let j=0;j<radial;j++){
      const a=row*(radial+1)+j,b=a+radial+1;
      indices.push(a,b,a+1,a+1,b,b+1);
    }
    const material=(rings[row]+rings[row+1])/2<=cut?0:1;
    const previous=geometry.groups[geometry.groups.length-1];
    if(previous?.materialIndex===material)previous.count+=indices.length-start;
    else geometry.addGroup(start,indices.length-start,material);
  }
  geometry.setIndex(indices);geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(bones,4));geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));geometry.computeVertexNormals();
  // Welding the duplicated UV seam normals avoids a visible line down the limb.
  const n=geometry.getAttribute('normal');for(let row=0;row<rings.length;row++){const a=row*(radial+1),b=a+radial,v=new THREE.Vector3().fromBufferAttribute(n,a).add(new THREE.Vector3().fromBufferAttribute(n,b)).normalize();n.setXYZ(a,v.x,v.y,v.z);n.setXYZ(b,v.x,v.y,v.z);}
  cache.set(key,geometry);return geometry;
}
