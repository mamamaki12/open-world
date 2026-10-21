import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSession } from './session';
import { samplePose, sampleCar } from './poseBuffer';
import type { RemotePose } from './session';
import { AvatarModel, poseRig, useRig, useSmooth } from '../world/Avatar';
import { sanitizeLooks } from '../catalog/looks';
import { StableCarModel } from '../world/StableCarModel';
import { VehicleOccupants } from '../world/VehicleOccupants';
import { getCar } from '../catalog/cars';
import { useEconomy, currentPlotOf } from '../state/economy';
import { plotX, plotZ } from '../economy/town';
import { rideSmoothPose } from '../world/vehicleLogic';
import type { OwnedCar } from '../state/vehicles';

function RemotePlayer({ id, pose }: { id: string; pose: RemotePose }) {
  const root = useRef<THREE.Group>(null), rig = useRig(), smooth = useSmooth();
  const old = useRef({ x: pose.x, z: pose.z, speed: 0 });
  useFrame(({ clock }, dt) => {
    if (!root.current) return;
    // 受信した座標の間を補間した位置（poseBuffer）。歩く速さもそこから出すので足の動きもなめらか。
    const p = samplePose(id) ?? useSession.getState().poses[id] ?? pose, plot = currentPlotOf(useEconomy.getState());
    const speed = Math.min(8, Math.hypot(p.x - old.current.x, p.z - old.current.z) / Math.max(dt, .01));
    old.current.speed = THREE.MathUtils.lerp(old.current.speed, speed, 1 - Math.exp(-dt * 6));
    root.current.position.set(p.x - plotX(plot), p.y, p.z - plotZ(plot));
    root.current.rotation.y += THREE.MathUtils.euclideanModulo(p.yaw - root.current.rotation.y + Math.PI, 2 * Math.PI) - Math.PI;
    poseRig(rig.current, smooth.current, { dt, time: clock.elapsedTime, speed: old.current.speed, running: old.current.speed > 3,
      crouch: 0, air: false, velY: 0, turnRate: 0, lookYaw: 0, lookPitch: 0, hands: null, tuck: 0, perch: 0 });
    old.current.x = p.x; old.current.z = p.z;
  });
  const plot = currentPlotOf(useEconomy.getState());
  return <group name={'remote-player-' + id} ref={root} position={[pose.x - plotX(plot), pose.y, pose.z - plotZ(plot)]}><AvatarModel rig={rig} outfit={pose.outfit} looks={sanitizeLooks(pose.looks)}/></group>;
}
/** 位置は20回/秒しか届かないので、受信した座標の間を補間して描く。助手席に乗っている車はカメラと同じ値を使う。 */
function RemoteCar({ owner, car }: { owner: string; car: OwnedCar }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const g = ref.current; if (!g) return;
    const ride = rideSmoothPose(clock.elapsedTime), target = ride?.key === owner + '|' + car.id ? ride : sampleCar(owner, car.id) ?? car;
    g.position.x = target.x; g.position.z = target.z; g.rotation.y = target.yaw;
  });
  return <group ref={ref} name={'remote-vehicle-'+owner+'-'+car.id} position={[car.x, 0, car.z]} rotation-y={car.yaw}><StableCarModel car={car}/><VehicleOccupants owner={owner} car={car}/></group>;
}
function RemoteCars({ id, pose }: { id: string; pose: RemotePose }) {
  const root = useRef<THREE.Group>(null);
  useFrame(() => { const p = currentPlotOf(useEconomy.getState()); root.current?.position.set(-plotX(p), 0, -plotZ(p)); });
  return <group ref={root}>{pose.cars.filter(car => getCar(car.model)).map(car => <RemoteCar key={car.id} owner={id} car={car}/>)}</group>;
}
export function RemotePlayers() {
  const poses = useSession(s => s.poses);
  return <group name="remote-players">{Object.entries(poses).map(([id, pose]) => <group key={id}>{!pose.driving && !pose.riding && <RemotePlayer id={id} pose={pose}/>}<RemoteCars id={id} pose={pose}/></group>)}</group>;
}
