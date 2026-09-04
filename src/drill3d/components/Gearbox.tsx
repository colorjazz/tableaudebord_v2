import { useDrillRig } from '../rig';
import { REDUCTION_TEETH } from '../constants';
import { ClutchDrivingPlate } from './Clutch';

// Gearbox Transmission. The reduction gear never gets its own useFrame — its
// rotation is a pure function of the pinion's, recomputed by the central
// loop each frame as drivenGear.rotation.z = -(driveGear.rotation.z / ratio).
// No physics-engine collision is involved, so there is nothing here that can
// clip or jitter.
export function Gearbox() {
  const rig = useDrillRig();

  return (
    <group position={[0, 0.012, 0.05]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.026, 0.03, 0.05, 24]} />
        <meshStandardMaterial color="#1a202c" />
      </mesh>

      <group ref={rig.reductionGear} position={[0.022, 0, -0.012]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.016, 0.016, 0.014, REDUCTION_TEETH]} />
          <meshStandardMaterial color="#4a5568" />
        </mesh>
        {/* clutch driving plate is keyed to this same output shaft */}
        <ClutchDrivingPlate />
      </group>
    </group>
  );
}
