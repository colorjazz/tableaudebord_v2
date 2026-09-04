import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Group, Object3D } from 'three';
import { DrillRigContext, type DrillRig } from './rig';
import { useDrillStore } from './store';
import { PowerSupply } from './components/PowerSupply';
import { Trigger, LockOnSwitch } from './components/Trigger';
import { Motor } from './components/Motor';
import { Gearbox } from './components/Gearbox';
import { ClutchDrivenAssembly, ClutchThresholdRing } from './components/Clutch';
import { Chuck } from './components/Chuck';
import { playClutchClick } from './audio';
import {
  CLUTCH_SLIP_AMPLITUDE,
  CLUTCH_SLIP_FREQUENCY,
  COLLAR_FULL_TURN,
  DRILL_TIP_CONTACT_DISTANCE,
  FEED_MAX_TRANSLATE,
  GEAR_RATIO,
  MATERIAL_PRESETS,
  MAX_RPM,
  RPM_TO_RAD_PER_SEC,
} from './constants';

const CLICK_INTERVAL = 1 / 8; // audible clutch clicks per second while slipping, independent of visual jitter rate

interface PowerDrillProps {
  workpieceRef: React.RefObject<THREE.Object3D | null>;
}

// The main housing: root Object3D of the whole DAG. Every other part is
// mounted, directly or indirectly, under this single group.
export function PowerDrill({ workpieceRef }: PowerDrillProps) {
  const motorShaft = useRef<Group>(null);
  const reductionGear = useRef<Group>(null);
  const chuckOutput = useRef<Group>(null);
  const drillBitTip = useRef<Object3D>(null);

  const rig = useMemo<DrillRig>(
    () => ({ motorShaft, reductionGear, chuckOutput, drillBitTip }),
    [],
  );

  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const tipPosition = useMemo(() => new THREE.Vector3(), []);
  const tipDirection = useMemo(() => new THREE.Vector3(), []);
  const clickAccumulator = useRef(0);
  const telemetryAccumulator = useRef(0);
  const feedDistance = useDrillStore((s) => s.feedDistance);

  // --- The single deterministic update loop driving every moving part ---
  useFrame((state, delta) => {
    const shaft = motorShaft.current;
    const driven = reductionGear.current;
    const output = chuckOutput.current;
    const tip = drillBitTip.current;
    if (!shaft || !driven || !output || !tip) return;

    const { isPowered, triggerDepression, lockOn, clutchThreshold, materialId } =
      useDrillStore.getState();

    // 1. Power source & trigger: everything downstream evaluates to 0 when unpowered.
    const effectiveDepression = lockOn ? 1 : triggerDepression;
    const currentRpm = isPowered ? MAX_RPM * effectiveDepression : 0;
    const angularVelocity = currentRpm * RPM_TO_RAD_PER_SEC;

    // 2. Motor shaft: continuous rotation about its own local Z axis.
    shaft.rotation.z += angularVelocity * delta;

    // 3. Gearbox: driven gear's angle is a pure function of the drive gear's
    // angle (gear ratio math), never a physics collision.
    driven.rotation.z = -(shaft.rotation.z / GEAR_RATIO);
    const outputAngularVelocity = angularVelocity / GEAR_RATIO;

    // 4. Raycast from the bit's tip along its forward axis to find what it's
    // pushing against, and translate that into a resistance value.
    tip.getWorldPosition(tipPosition);
    tip.getWorldDirection(tipDirection);
    raycaster.set(tipPosition, tipDirection);
    const workpiece = workpieceRef.current;
    const hit = workpiece ? raycaster.intersectObject(workpiece, false)[0] : undefined;
    const isTouchingSurface = !!hit && hit.distance <= DRILL_TIP_CONTACT_DISTANCE;

    const preset = MATERIAL_PRESETS.find((m) => m.id === materialId) ?? MATERIAL_PRESETS[0];
    const appliedResistance = isTouchingSurface && currentRpm > 0 ? preset.hardness : 0;

    // 5. Clutch: disengage torque transfer once resistance exceeds the
    // user-set threshold, instead of letting the motor stall.
    const clutchEngaged = appliedResistance <= clutchThreshold;
    const clutchSlipping = !clutchEngaged && currentRpm > 0;

    if (clutchSlipping) {
      const t = state.clock.elapsedTime;
      const offset = Math.sin(t * CLUTCH_SLIP_FREQUENCY * Math.PI * 2) * CLUTCH_SLIP_AMPLITUDE;
      output.position.set(offset, 0, 0);

      clickAccumulator.current += delta;
      if (clickAccumulator.current >= CLICK_INTERVAL) {
        clickAccumulator.current = 0;
        playClutchClick();
      }
    } else {
      output.position.set(0, 0, 0);
      clickAccumulator.current = 0;
      // 6. Chuck output shaft only advances while the clutch is engaged.
      output.rotation.z += outputAngularVelocity * delta;
    }

    // 7. Publish throttled telemetry for the HUD without re-rendering at 60fps.
    telemetryAccumulator.current += delta;
    if (telemetryAccumulator.current >= 0.1) {
      telemetryAccumulator.current = 0;
      const { collarAngle } = useDrillStore.getState();
      useDrillStore.getState().setTelemetry({
        currentRpm,
        appliedResistance,
        clutchEngaged,
        clutchSlipping,
        jawClosure: THREE.MathUtils.clamp(collarAngle / COLLAR_FULL_TURN, 0, 1),
        isTouchingSurface,
      });
    }
  });

  return (
    <DrillRigContext.Provider value={rig}>
      <group position={[0, 0, feedDistance * FEED_MAX_TRANSLATE]}>
        {/* main housing shell (handle + body) */}
        <mesh position={[0, -0.06, 0]}>
          <boxGeometry args={[0.035, 0.13, 0.05]} />
          <meshStandardMaterial color="#1a202c" />
        </mesh>
        <mesh position={[0, 0.012, -0.02]}>
          <boxGeometry args={[0.06, 0.05, 0.14]} />
          <meshStandardMaterial color="#2b3648" />
        </mesh>

        <PowerSupply />
        <Trigger />
        <LockOnSwitch />

        <Motor />
        <Gearbox />
        <ClutchThresholdRing />

        <ClutchDrivenAssembly>
          <Chuck />
        </ClutchDrivenAssembly>
      </group>
    </DrillRigContext.Provider>
  );
}
