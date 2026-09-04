import { createContext, useContext } from 'react';
import type { RefObject } from 'react';
import type { Group, Object3D } from 'three';

// The drill is built as one Object3D hierarchy (see PowerDrill.tsx); these are
// the only nodes whose transforms are written imperatively, once per frame,
// by the single deterministic update loop in PowerDrill.tsx. Every other
// moving part (commutator, armature, cooling fan, clutch driving plate,
// chuck jaws, drill bit) is a plain child of one of these and gets its
// motion for free through normal parent-child transform inheritance.
export interface DrillRig {
  /** Motor output shaft. rotation.z is incremented every frame by currentSpeed * deltaTime. */
  motorShaft: RefObject<Group | null>;
  /** Gearbox reduction (driven) gear. rotation.z is *set* each frame from the gear-ratio formula. */
  reductionGear: RefObject<Group | null>;
  /**
   * Clutch driven plate, which doubles as the gearbox's final output shaft.
   * The chuck housing/jaws/bit are children of this group, so it carries all
   * of them at once. Its rotation.z only advances while the clutch is
   * engaged; while slipping it also receives the sine micro-stutter offset.
   */
  chuckOutput: RefObject<Group | null>;
  /** Empty marker at the very tip of the drill bit; source of the drilling raycast. */
  drillBitTip: RefObject<Object3D | null>;
}

export const DrillRigContext = createContext<DrillRig | null>(null);

export function useDrillRig(): DrillRig {
  const rig = useContext(DrillRigContext);
  if (!rig) throw new Error('useDrillRig must be used within <PowerDrill>');
  return rig;
}
