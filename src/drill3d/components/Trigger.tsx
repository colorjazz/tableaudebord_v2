import { useRef } from 'react';
import * as THREE from 'three';
import { useDrillStore } from '../store';
import { useLinearAxisDrag } from '../hooks/useAxisDrag';
import { TRIGGER_MAX_TRAVEL } from '../constants';
import { primeAudio } from '../audio';

const LOCAL_Z = new THREE.Vector3(0, 0, 1);

// Trigger Switch: a mesh constrained to translate along its own local Z axis
// only. Its travel distance is mapped linearly to triggerDepression (0..1),
// which is what actually drives the motor — see the useFrame loop in
// PowerDrill.tsx.
export function Trigger() {
  const pivot = useRef<THREE.Group>(null);
  const triggerDepression = useDrillStore((s) => s.triggerDepression);
  const lockOn = useDrillStore((s) => s.lockOn);
  const setTriggerDepression = useDrillStore((s) => s.setTriggerDepression);

  const { onPointerDown, onPointerMove, onPointerUp } = useLinearAxisDrag({
    axis: LOCAL_Z,
    getPivot: () => pivot.current,
    value: triggerDepression * TRIGGER_MAX_TRAVEL,
    onChange: (z) => {
      primeAudio();
      setTriggerDepression(THREE.MathUtils.clamp(z, 0, TRIGGER_MAX_TRAVEL) / TRIGGER_MAX_TRAVEL);
    },
  });

  // Lock-on overrides what the trigger *does*, and we show that on the mesh
  // too: while engaged the trigger reads as fully pulled regardless of the
  // last drag position, matching a real lock-on latch.
  const visibleDepression = lockOn ? 1 : triggerDepression;

  return (
    <group ref={pivot} position={[0, -0.045, 0.05]}>
      <mesh
        position={[0, -0.012, visibleDepression * TRIGGER_MAX_TRAVEL]}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <boxGeometry args={[0.018, 0.03, 0.014]} />
        <meshStandardMaterial color="#c53030" />
      </mesh>
    </group>
  );
}

// Lock-on Switch: only present on corded models. A boolean toggle that
// forces triggerDepression to 1.0 regardless of the trigger's own position.
export function LockOnSwitch() {
  const powerSource = useDrillStore((s) => s.powerSource);
  const lockOn = useDrillStore((s) => s.lockOn);
  const toggleLockOn = useDrillStore((s) => s.toggleLockOn);

  if (powerSource !== 'cable') return null;

  return (
    <mesh
      position={[0.015, -0.032, 0.055]}
      onClick={(e) => {
        e.stopPropagation();
        toggleLockOn();
      }}
    >
      <boxGeometry args={[0.007, 0.005, 0.012]} />
      <meshStandardMaterial
        color={lockOn ? '#dd6b20' : '#a0aec0'}
        emissive={lockOn ? '#7b341e' : '#000000'}
        emissiveIntensity={lockOn ? 0.5 : 0}
      />
    </mesh>
  );
}
