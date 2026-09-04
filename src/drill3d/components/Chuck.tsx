import { useRef } from 'react';
import * as THREE from 'three';
import { useDrillRig } from '../rig';
import { useDrillStore } from '../store';
import { useRotaryDrag } from '../hooks/useAxisDrag';
import { COLLAR_FULL_TURN, JAW_CLOSED_RADIUS, JAW_OPEN_RADIUS } from '../constants';

const JAW_ANGLES = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3];

// Chuck & Drill Bit. Everything here is a child of rig.chuckOutput (mounted
// by the caller via ClutchDrivenAssembly), so it all inherits the final
// reduced — and possibly slipping — rotation automatically. The only local
// transform unique to this component is the jaws' radial translation, which
// is driven by the collar's rotation rather than by the drivetrain.
export function Chuck() {
  const rig = useDrillRig();
  const collarAngle = useDrillStore((s) => s.collarAngle);
  const setCollarAngle = useDrillStore((s) => s.setCollarAngle);
  const collarPivot = useRef<THREE.Group>(null);

  const jawClosure = THREE.MathUtils.clamp(collarAngle / COLLAR_FULL_TURN, 0, 1);
  const jawRadius = THREE.MathUtils.lerp(JAW_OPEN_RADIUS, JAW_CLOSED_RADIUS, jawClosure);

  const { onPointerDown, onPointerMove, onPointerUp } = useRotaryDrag({
    getPivot: () => collarPivot.current,
    value: collarAngle,
    onChange: (angle) => setCollarAngle(THREE.MathUtils.clamp(angle, 0, COLLAR_FULL_TURN)),
  });

  return (
    <group position={[0, 0, 0.02]}>
      {/* chuck housing */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.015, 0.02, 0.03, 16]} />
        <meshStandardMaterial color="#2d3748" />
      </mesh>

      {/* collar: the user drags this to tighten/loosen the jaws */}
      <group
        ref={collarPivot}
        position={[0, 0, 0.012]}
        rotation={[0, 0, collarAngle]}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.021, 0.021, 0.016, 16]} />
          <meshStandardMaterial color="#718096" />
        </mesh>
        {Array.from({ length: 8 }).map((_, i) => (
          <mesh key={i} position={[0.02, 0, 0]} rotation={[0, 0, (i * Math.PI) / 4]}>
            <boxGeometry args={[0.003, 0.014, 0.014]} />
            <meshStandardMaterial color="#4a5568" />
          </mesh>
        ))}
      </group>

      {/* three jaws, translating radially inward on the collar's local X/Y as it tightens */}
      {JAW_ANGLES.map((theta, i) => (
        <mesh
          key={i}
          position={[Math.cos(theta) * jawRadius, Math.sin(theta) * jawRadius, 0.026]}
          rotation={[0, 0, theta]}
        >
          <boxGeometry args={[0.006, 0.006, 0.022]} />
          <meshStandardMaterial color="#a0aec0" metalness={0.7} roughness={0.3} />
        </mesh>
      ))}

      {/* drill bit, wrapped in a simplified cylindrical collider for raycast/contact purposes */}
      <group position={[0, 0, 0.037]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.0035, 0.0035, 0.05, 12]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.005, 0.005, 0.05, 8]} />
          <meshBasicMaterial color="#38bdf8" wireframe transparent opacity={0.35} />
        </mesh>
        <object3D ref={rig.drillBitTip} position={[0, 0, 0.025]} />
      </group>
    </group>
  );
}
