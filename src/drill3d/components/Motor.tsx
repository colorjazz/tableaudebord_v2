import { useDrillRig } from '../rig';
import { PINION_TEETH } from '../constants';

// Motor & Cooling System. `rig.motorShaft` is the only node the physics loop
// touches (rotation.z += currentSpeed * deltaTime); everything nested inside
// it — commutator, armature, cooling fan, and the pinion gear that drives
// the gearbox — needs no physics of its own. They spin in perfect sync
// purely because they are children of the shaft.
export function Motor() {
  const rig = useDrillRig();

  return (
    <group position={[0, 0.012, -0.02]}>
      {/* stationary motor casing */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.022, 0.022, 0.09, 20]} />
        <meshStandardMaterial color="#2d3748" />
      </mesh>

      {/* the shaft's own local Z is its spin axis */}
      <group ref={rig.motorShaft}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.004, 0.004, 0.1, 12]} />
          <meshStandardMaterial color="#a0aec0" metalness={0.6} roughness={0.3} />
        </mesh>

        {/* commutator */}
        <mesh position={[0, 0, -0.03]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.009, 0.009, 0.018, 12]} />
          <meshStandardMaterial color="#d69e2e" />
        </mesh>

        {/* armature windings */}
        <mesh position={[0, 0, -0.006]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.011, 0.011, 0.03, 8]} />
          <meshStandardMaterial color="#c05621" wireframe />
        </mesh>

        {/* cooling fan: same axle, so its own local rotation stays (0,0,0) */}
        <group position={[0, 0, 0.045]}>
          {Array.from({ length: 6 }).map((_, i) => (
            <mesh key={i} position={[0.009, 0, 0]} rotation={[0, 0, (i * Math.PI) / 3]}>
              <boxGeometry args={[0.014, 0.003, 0.012]} />
              <meshStandardMaterial color="#718096" />
            </mesh>
          ))}
        </group>

        {/* pinion gear: the gearbox's drive gear, keyed straight to this shaft */}
        <mesh position={[0, 0, 0.058]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.008, 0.008, 0.012, PINION_TEETH]} />
          <meshStandardMaterial color="#4a5568" />
        </mesh>
      </group>
    </group>
  );
}
