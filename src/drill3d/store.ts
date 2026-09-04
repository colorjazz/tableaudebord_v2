import { create } from 'zustand';
import { CLUTCH_MAX, CLUTCH_MIN, MATERIAL_PRESETS } from './constants';

export type PowerSource = 'battery' | 'cable';

interface Telemetry {
  currentRpm: number;
  appliedResistance: number;
  clutchEngaged: boolean;
  clutchSlipping: boolean;
  jawClosure: number; // 0 (open) .. 1 (fully closed on bit)
  isTouchingSurface: boolean;
}

interface DrillState {
  // --- Power source & input (user-controlled) ---
  powerSource: PowerSource;
  isPowered: boolean;
  triggerDepression: number; // 0..1, driven by the physical trigger mesh translation
  lockOn: boolean;

  // --- Torque regulation (user-controlled) ---
  clutchThreshold: number; // 1..20, set by rotating the clutch ring

  // --- Chuck (user-controlled) ---
  collarAngle: number; // radians, accumulated rotation of the chuck collar

  // --- Test rig / environment (not part of the drill itself) ---
  materialId: string;
  feedDistance: number; // 0 (retracted) .. 1 (bit fully advanced toward workpiece)

  // --- Live telemetry, written once per frame by the physics loop for the HUD ---
  telemetry: Telemetry;

  // True while a physical control (trigger, collar, clutch ring) is being
  // dragged, so the camera's OrbitControls can be suspended for that pointer.
  isDragging: boolean;
  setIsDragging: (dragging: boolean) => void;

  setPowerSource: (source: PowerSource) => void;
  togglePower: () => void;
  setTriggerDepression: (value: number) => void;
  toggleLockOn: () => void;
  setClutchThreshold: (value: number) => void;
  setCollarAngle: (value: number) => void;
  setMaterialId: (id: string) => void;
  setFeedDistance: (value: number) => void;
  setTelemetry: (telemetry: Telemetry) => void;
}

export const useDrillStore = create<DrillState>((set) => ({
  powerSource: 'battery',
  isPowered: false,
  triggerDepression: 0,
  lockOn: false,

  clutchThreshold: 12,

  collarAngle: 0,

  materialId: MATERIAL_PRESETS[0].id,
  feedDistance: 0,

  telemetry: {
    currentRpm: 0,
    appliedResistance: 0,
    clutchEngaged: true,
    clutchSlipping: false,
    jawClosure: 0,
    isTouchingSurface: false,
  },

  setPowerSource: (source) =>
    set((s) => ({
      powerSource: source,
      // Lock-on only exists on corded models; drop it if switching to battery.
      lockOn: source === 'battery' ? false : s.lockOn,
    })),
  togglePower: () => set((s) => ({ isPowered: !s.isPowered })),
  setTriggerDepression: (value) =>
    set({ triggerDepression: Math.min(1, Math.max(0, value)) }),
  toggleLockOn: () =>
    set((s) => (s.powerSource === 'cable' ? { lockOn: !s.lockOn } : s)),
  setClutchThreshold: (value) =>
    set({ clutchThreshold: Math.min(CLUTCH_MAX, Math.max(CLUTCH_MIN, value)) }),
  setCollarAngle: (value) => set({ collarAngle: value }),
  setMaterialId: (id) => set({ materialId: id }),
  setFeedDistance: (value) => set({ feedDistance: Math.min(1, Math.max(0, value)) }),
  setTelemetry: (telemetry) => set({ telemetry }),

  isDragging: false,
  setIsDragging: (dragging) => set({ isDragging: dragging }),
}));
