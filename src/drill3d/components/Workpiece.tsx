import { forwardRef } from 'react';
import * as THREE from 'three';
import { useDrillStore } from '../store';
import { MATERIAL_PRESETS } from '../constants';

// External object the drill bit interacts with. Deliberately outside the
// drill's own Object3D hierarchy: per the collision protocol, the drill's
// internal mechanics never touch this via physics — the central loop only
// raycasts against it and feeds the resulting hardness back up as
// appliedResistance.
export const Workpiece = forwardRef<THREE.Mesh>(function Workpiece(_props, ref) {
  const materialId = useDrillStore((s) => s.materialId);
  const preset = MATERIAL_PRESETS.find((m) => m.id === materialId) ?? MATERIAL_PRESETS[0];

  return (
    <mesh ref={ref} position={[0, 0.02, 0.32]}>
      <boxGeometry args={[0.16, 0.16, 0.05]} />
      <meshStandardMaterial color={preset.color} roughness={0.85} />
    </mesh>
  );
});
