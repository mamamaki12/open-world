import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { tailoredLimb } from './avatarGeometry';

describe('continuous tailored limbs',()=>{
  for(const [leg,style] of [[false,'tee'],[false,'coat'],[true,'pants'],[true,'shorts'],[true,'skirt']] as const){
    it(`${style} keeps a finite, connected surface when the joint bends`,()=>{
      const geometry=tailoredLimb(leg,style),upper=new THREE.Bone(),lower=new THREE.Bone();
      lower.position.y=leg?-.43:-.27;upper.add(lower);
      const mesh=new THREE.SkinnedMesh(geometry);mesh.add(upper);mesh.bind(new THREE.Skeleton([upper,lower]));
      lower.rotation.x=1.5;mesh.updateMatrixWorld(true);mesh.skeleton.update();
      const weights=geometry.getAttribute('skinWeight'),positions=geometry.getAttribute('position');
      let blended=0;
      for(let i=0;i<positions.count;i++){
        expect(weights.getX(i)+weights.getY(i)).toBeCloseTo(1);
        if(weights.getX(i)>0&&weights.getY(i)>0)blended++;
        const p=mesh.applyBoneTransform(i,new THREE.Vector3().fromBufferAttribute(positions,i));
        expect([p.x,p.y,p.z].every(Number.isFinite)).toBe(true);
        // Both sides of the duplicated texture seam deform to exactly the same position.
        if(i%25===0){const q=mesh.applyBoneTransform(i+24,new THREE.Vector3().fromBufferAttribute(positions,i+24));expect(p.distanceTo(q)).toBeLessThan(1e-6);}
      }
      expect(blended).toBeGreaterThan(100);
      expect(geometry.groups.length).toBeLessThanOrEqual(2);
      const normals=geometry.getAttribute('normal');
      const middle=25*20+6;
      expect(normals.getX(middle)*positions.getX(middle)+normals.getZ(middle)*positions.getZ(middle)).toBeGreaterThan(0);
      mesh.skeleton.dispose();
    });
  }
  it('trouser cloth hangs beyond the bare leg and wide trousers have a different silhouette',()=>{
    const skin=tailoredLimb(true,'skirt').getAttribute('position'),pants=tailoredLimb(true,'pants').getAttribute('position'),wide=tailoredLimb(true,'pants',true).getAttribute('position');
    const i=25*20+6;
    expect(Math.abs(pants.getX(i))).toBeGreaterThan(Math.abs(skin.getX(i))+.015);
    expect(Math.abs(wide.getX(i))).toBeGreaterThan(Math.abs(pants.getX(i))+.01);
  });
});
