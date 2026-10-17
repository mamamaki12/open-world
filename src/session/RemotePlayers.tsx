import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSession } from './session';
import type { RemotePose } from './session';
import { AvatarModel, poseRig, useRig, useSmooth } from '../world/Avatar';
import { sanitizeLooks } from '../catalog/looks';
import { CarModel } from '../world/CarModel';
import { getCar } from '../catalog/cars';
import { useEconomy, currentPlotOf } from '../state/economy';
import { plotX, plotZ } from '../economy/town';

function RemotePlayer({ id, pose }: { id: string; pose: RemotePose }) {
  const root = useRef<THREE.Group>(null), rig = useRig(), smooth = useSmooth();
  const old = useRef({ x: pose.x, z: pose.z, speed: 0 });
  useFrame(({ clock }, dt) => {
    if (!root.current) return;
    const p = useSession.getState().poses[id] ?? pose, plot = currentPlotOf(useEconomy.getState());
    const target = new THREE.Vector3(p.x - plotX(plot), p.y, p.z - plotZ(plot));
    const speed = Math.min(8, Math.hypot(p.x - old.current.x, p.z - old.current.z) / Math.max(dt, .01));
    old.current.speed = THREE.MathUtils.lerp(old.current.speed, speed, 1 - Math.exp(-dt * 8));
    root.current.position.lerp(target, 1 - Math.exp(-dt * 14));
    root.current.rotation.y += THREE.MathUtils.euclideanModulo(p.yaw - root.current.rotation.y + Math.PI, 2 * Math.PI) - Math.PI;
    poseRig(rig.current, smooth.current, { dt, time: clock.elapsedTime, speed: old.current.speed, running: old.current.speed > 3,
      crouch: 0, air: false, velY: 0, turnRate: 0, lookYaw: 0, lookPitch: 0, hands: null, tuck: 0, perch: 0 });
    old.current.x = p.x; old.current.z = p.z;
  });
  const plot = currentPlotOf(useEconomy.getState());
  return <group name={'remote-player-' + id} ref={root} position={[pose.x - plotX(plot), pose.y, pose.z - plotZ(plot)]}><AvatarModel rig={rig} outfit={pose.outfit} looks={sanitizeLooks(pose.looks)}/></group>;
}
function RemoteCars({ pose }: { pose: RemotePose }) {
  const root = useRef<THREE.Group>(null);
  useFrame(() => { const p = currentPlotOf(useEconomy.getState()); root.current?.position.set(-plotX(p), 0, -plotZ(p)); });
  return <group ref={root}>{pose.cars.map(car => <group key={car.id} position={[car.x, 0, car.z]} rotation-y={car.yaw}><CarModel def={getCar(car.model)!} color={car.color} mods={car.mods} pose={car}/></group>)}</group>;
}
export function RemotePlayers() {
  const poses = useSession(s => s.poses);
  return <group name="remote-players">{Object.entries(poses).map(([id, pose]) => <group key={id}>{!pose.driving && <RemotePlayer id={id} pose={pose}/>}<RemoteCars pose={pose}/></group>)}</group>;
}
