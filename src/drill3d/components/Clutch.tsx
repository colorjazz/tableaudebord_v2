import { useRef } from 'react';
import type { ReactNode } from 'react';
import * as THREE from 'three';
import { useDrillRig } from '../rig';
import { useDrillStore } from '../store';
import { useRotaryDrag } from '../hooks/useAxisDrag';
import { CLUTCH_MAX, CLUTCH_MIN } from '../constants';

const RING_SWEEP = Math.PI * 1.5; // 270 degrees of travel maps to the 1..20 scale

// Clutch driving plate: rigidly keyed to the gearbox's output shaft (a plain
// child of rig.reductionGear, see Gearbox.tsx), so — like the fan on the
// motor shaft — it needs no physics of its own.
export function ClutchDrivingPlate() {
  return (
    <mesh position={[0, 0, 0.012]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[0.017, 0.017, 0.006, 24]} />
      <meshStandardMaterial color="#dd6b20" metalness={0.4} roughness={0.5} />
    </mesh>
  );
}

// Clutch driven assembly: the plate that can slip. This group *is*
// rig.chuckOutput — the gearbox's "final output shaft" that the chuck
// (passed in as children) is parented to. While torque transfer is engaged
// its rotation.z tracks the driving side; while slipping the physics loop
// freezes the net rotation and adds a sine micro-stutter translation here
// instead.
export function ClutchDrivenAssembly({ children }: { children: ReactNode }) {
  const rig = useDrillRig();
  return (
    <group position={[0, 0, 0.07]}>
      <group ref={rig.chuckOutput}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.017, 0.017, 0.006, 24]} />
          <meshStandardMaterial color="#e53e3e" metalness={0.4} roughness={0.5} />
        </mesh>
        {children}
      </group>
    </group>
  );
}

// Clutch ring: the user's torque-limit dial (1..20), mounted on the gearbox
// housing. It does not spin with the drivetrain — it is a static control the
// user rotates by hand, unrelated to the motor's rotation.
export function ClutchThresholdRing() {
  const pivot = useRef<THREE.Group>(null);
  const clutchThreshold = useDrillStore((s) => s.clutchThreshold);
  const setClutchThreshold = useDrillStore((s) => s.setClutchThreshold);

  const angleForThreshold = (t: number) =>
    ((t - CLUTCH_MIN) / (CLUTCH_MAX - CLUTCH_MIN)) * RING_SWEEP;

  const { onPointerDown, onPointerMove, onPointerUp } = useRotaryDrag({
    getPivot: () => pivot.current,
    value: angleForThreshold(clutchThreshold),
    onChange: (angle) => {
      const clamped = THREE.MathUtils.clamp(angle, 0, RING_SWEEP);
      const t = CLUTCH_MIN + (clamped / RING_SWEEP) * (CLUTCH_MAX - CLUTCH_MIN);
      setClutchThreshold(Math.round(t));
    },
  });

  return (
    <group
      ref={pivot}
      position={[0, 0.012, 0.035]}
      rotation={[0, 0, angleForThreshold(clutchThreshold)]}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.033, 0.033, 0.012, 24]} />
        <meshStandardMaterial color="#2b6cb0" />
      </mesh>
      <mesh position={[0.03, 0, 0]}>
        <boxGeometry args={[0.006, 0.004, 0.014]} />
        <meshStandardMaterial color="#ecc94b" />
      </mesh>
    </group>
  );
}
