// Physical/geometric constants for the electric drill simulation.
// Angles in radians, distances in arbitrary scene units, speeds in RPM unless noted.

export const MAX_RPM = 2200;

export const PINION_TEETH = 10;
export const REDUCTION_TEETH = 30;
export const GEAR_RATIO = REDUCTION_TEETH / PINION_TEETH; // 3:1

export const TRIGGER_MAX_TRAVEL = 0.018; // meters of local-Z travel at full depression

export const CLUTCH_MIN = 1;
export const CLUTCH_MAX = 20;

// Sine micro-stutter applied to clutch plates while slipping.
export const CLUTCH_SLIP_FREQUENCY = 42; // Hz
export const CLUTCH_SLIP_AMPLITUDE = 0.0015; // meters

// Chuck jaws: fully-open radial offset vs. fully-closed (touching the bit).
export const JAW_OPEN_RADIUS = 0.02;
export const JAW_CLOSED_RADIUS = 0.004;
export const COLLAR_FULL_TURN = Math.PI * 2.5; // rotation range mapped to jaw closure 0..1

// Raycast / drilling.
export const DRILL_TIP_CONTACT_DISTANCE = 0.05; // world units considered "touching" the surface
export const RPM_TO_RAD_PER_SEC = (2 * Math.PI) / 60;

// How far the whole drill travels along its forward axis as feedDistance goes 0..1,
// sized so the bit tip approaches to just short of the workpiece's front face at
// feedDistance = 1 (it must stay outside the box: a raycast whose origin is already
// past the front face can't see that face's backside and would report no contact).
export const FEED_MAX_TRANSLATE = 0.133;

export type MaterialPreset = {
  id: string;
  label: string;
  hardness: number; // same scale as clutchThreshold (1-20+); can exceed 20 to force slip
  color: string;
};

export const MATERIAL_PRESETS: MaterialPreset[] = [
  { id: 'pine', label: 'Pin tendre (soft pine)', hardness: 3, color: '#d9b382' },
  { id: 'oak', label: "Chêne (oak)", hardness: 10, color: '#8a5a34' },
  { id: 'steel', label: 'Tôle d\'acier (steel sheet)', hardness: 22, color: '#8b96a3' },
];
