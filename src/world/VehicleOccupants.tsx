import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AvatarModel, poseRig, useRig, useSmooth } from './Avatar';
import { assignVehicleSeats, vehicleSeat } from './vehicleSeats';
import { getCar } from '../catalog/cars';
import { sanitizeLooks } from '../catalog/looks';
import type { CarDef } from '../catalog/cars';
import type { OwnedCar } from '../state/vehicles';
import type { RemotePose } from '../session/session';
import { useSession } from '../session/session';
import { sessionGate } from '../session/gate';
import { useVehicles } from '../state/vehicles';
import { useGame } from '../state/store';
import { useWardrobe } from '../state/wardrobe';
import { useLooks } from '../state/looks';

function SeatLabel({ text, seat }: { text: string; seat: number }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 64;
    const ctx = canvas.getContext('2d')!; ctx.fillStyle = seat === 0 ? '#16346de8' : '#17543de8';
    ctx.fillRect(0, 0, 640, 64); ctx.font = 'bold 28px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff'; ctx.fillText(text, 320, 33, 620);
    const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.SRGBColorSpace; return t;
  }, [text, seat]);
  useEffect(() => () => texture.dispose(), [texture]);
  return <sprite name="vehicle-seat-label" scale={[2, .22, 1]} renderOrder={10}><spriteMaterial map={texture} depthTest={false} depthWrite={false}/></sprite>;
}
function SeatedPerson({ id, name, seat, def, pose, hidden }: { id: string; name: string; seat: number; def: CarDef; pose?: RemotePose; hidden: boolean }) {
  const rig = useRig(), smooth = useSmooth(), ownOutfit = useWardrobe(s => s.outfit), ownLooks = useLooks(s => s.looks);
  const at = vehicleSeat(def, seat);
  const appearance = JSON.stringify([pose?.outfit ?? ownOutfit, pose?.looks ?? ownLooks]);
  const avatar = useMemo(() => <AvatarModel rig={rig} outfit={pose?.outfit ?? ownOutfit} looks={sanitizeLooks(pose?.looks ?? ownLooks)}/>, [appearance]);
  useFrame(({ clock }, dt) => {
    if (hidden || !rig.current.root) return;
    poseRig(rig.current, smooth.current, { dt, time: clock.elapsedTime, speed: 0, running: false, crouch: 0, air: false,
      velY: 0, turnRate: 0, lookYaw: 0, lookPitch: 0, hands: null, tuck: 0, perch: 0, seated: at.y });
    for (let i = 0; i < 2; i++) {
      rig.current.shoulder[i]?.rotation.set(seat === 0 ? 1.0 : .25, 0, i === 0 ? -.08 : .08);
      rig.current.elbow[i]?.rotation.set(seat === 0 ? -.65 : -.9, 0, 0);
    }
  });
  return <group name={'vehicle-occupant-' + id} userData={{ occupant: id, seat, seatName: at.label, occupantName: name }}>
    <group position={[at.x, 0, at.z]} visible={!hidden}>{avatar}</group>
    <group position={[at.x * 1.3, def.height + .25 + seat * .28, at.z]}>
      <SeatLabel text={`${at.label}：${name}`} seat={seat}/>
    </group>
  </group>;
}
export function VehicleOccupants({ owner, car }: { owner: string; car: OwnedCar }) {
  const root = useRef<THREE.Group>(null), world = useMemo(() => new THREE.Vector3(), []);
  const poses = useSession(s => s.poses); useSession(s => s.members);
  useVehicles(s => `${s.driving}|${s.riding?.owner}|${s.riding?.car}|${s.riding?.seat}`);
  const view = useGame(s => s.view), me = sessionGate.selfId(), def = getCar(car.model)!;
  const people = assignVehicleSeats(owner || me, car.id, def.seats, sessionGate.vehicleOccupants());
  const wheel = def.wheel * (1 + (car.mods?.wheelSize ?? 0) * .03) * (car.mods?.wheel === 'offroad' ? 1.06 : 1);
  const lift = (car.mods?.rideHeight ?? 0) / 100 + wheel - def.wheel;
  useFrame(({ camera }) => {
    if (!root.current) return;
    root.current.getWorldPosition(world);
    root.current.visible = camera.position.distanceToSquared(world) < 45 * 45;
  });
  return <group ref={root} name="vehicle-occupants" position-y={lift}>
    {people.map(({ person, seat }) => <SeatedPerson key={person.id} id={person.id} name={person.name} seat={seat} def={def}
      pose={person.id === me ? undefined : poses[person.id]} hidden={person.id === me && view === 'first'}/>)}
  </group>;
}
