import { useCallback, useRef } from 'react';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import { useDrillStore } from '../store';

// Both hooks below implement the same interaction primitive: grab a mesh,
// project subsequent pointer positions onto a plane anchored at the
// control's pivot, then read the drag off that plane. This is what lets a
// mouse/touch drag be constrained to a single physical degree of freedom
// (a translation axis or a rotation axis) instead of the screen's two.
// The two hooks need different planes, though: a translation needs a plane
// that *contains* the axis line and faces the camera (so sliding along the
// axis reads as a 1D coordinate on it), while a rotation needs the plane
// *perpendicular* to the axis — the control's own face — so an angle can be
// read off it with atan2.
//
// Assumption: every draggable part in this scene has world scale 1, so a
// world-space delta equals the corresponding local-space delta.

function buildAxisAlignedDragPlane(
  pivotWorldPos: THREE.Vector3,
  axisWorld: THREE.Vector3,
  camera: THREE.Camera,
) {
  const camDir = new THREE.Vector3();
  camera.getWorldDirection(camDir);
  let normal = new THREE.Vector3().crossVectors(axisWorld, camDir).cross(axisWorld);
  if (normal.lengthSq() < 1e-6) {
    normal = new THREE.Vector3().crossVectors(axisWorld, camera.up);
  }
  normal.normalize();
  return new THREE.Plane().setFromNormalAndCoplanarPoint(normal, pivotWorldPos);
}

function capturePointer(e: ThreeEvent<PointerEvent>) {
  e.stopPropagation();
  (e.target as Element | undefined)?.setPointerCapture?.(e.pointerId);
  // Suspend OrbitControls for the duration of the drag: it listens for
  // pointer events natively on the canvas, outside R3F's event system, so
  // stopPropagation() above does not stop it from also orbiting the camera.
  useDrillStore.getState().setIsDragging(true);
}

function releasePointer(e: ThreeEvent<PointerEvent>) {
  (e.target as Element | undefined)?.releasePointerCapture?.(e.pointerId);
  useDrillStore.getState().setIsDragging(false);
}

interface LinearDragOptions {
  /** Local-space unit axis the control is allowed to translate along, e.g. (0,0,1). */
  axis: THREE.Vector3;
  /** Object whose world transform defines the drag axis/pivot (usually the mesh's own group). */
  getPivot: () => THREE.Object3D | null;
  /** Current value in local units; used as the drag's starting point. */
  value: number;
  onChange: (nextValue: number) => void;
}

/** Drag-to-translate along a single local axis (used by the trigger). */
export function useLinearAxisDrag({ axis, getPivot, value, onChange }: LinearDragOptions) {
  const drag = useRef<{
    plane: THREE.Plane;
    axisWorld: THREE.Vector3;
    startPoint: THREE.Vector3;
    startValue: number;
  } | null>(null);

  const onPointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      const pivot = getPivot();
      if (!pivot) return;
      capturePointer(e);

      const worldPos = new THREE.Vector3();
      pivot.getWorldPosition(worldPos);
      const worldQuat = new THREE.Quaternion();
      pivot.getWorldQuaternion(worldQuat);
      const axisWorld = axis.clone().applyQuaternion(worldQuat).normalize();
      const plane = buildAxisAlignedDragPlane(worldPos, axisWorld, e.camera);

      drag.current = { plane, axisWorld, startPoint: e.ray.origin.clone(), startValue: value };
      // Use the actual plane hit (not the ray origin) as the drag start reference.
      const hit = new THREE.Vector3();
      if (e.ray.intersectPlane(plane, hit)) drag.current.startPoint = hit;
    },
    [axis, getPivot, value],
  );

  const onPointerMove = useCallback((e: ThreeEvent<PointerEvent>) => {
    const state = drag.current;
    if (!state) return;
    e.stopPropagation();
    const hit = new THREE.Vector3();
    if (!e.ray.intersectPlane(state.plane, hit)) return;
    const worldDelta = hit.clone().sub(state.startPoint).dot(state.axisWorld);
    onChange(state.startValue + worldDelta);
  }, [onChange]);

  const onPointerUp = useCallback((e: ThreeEvent<PointerEvent>) => {
    drag.current = null;
    releasePointer(e);
  }, []);

  return { onPointerDown, onPointerMove, onPointerUp };
}

function shortestAngleDelta(from: number, to: number) {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

interface RotaryDragOptions {
  /** Object whose local XY plane the ring rotates in (rotation happens around its local Z). */
  getPivot: () => THREE.Object3D | null;
  value: number;
  onChange: (nextValue: number) => void;
}

/** Drag-to-rotate around a control's local Z axis (used by the chuck collar and clutch ring). */
export function useRotaryDrag({ getPivot, value, onChange }: RotaryDragOptions) {
  const drag = useRef<{
    plane: THREE.Plane;
    invMatrix: THREE.Matrix4;
    lastAngle: number;
    accumulated: number;
  } | null>(null);

  const onPointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      const pivot = getPivot();
      if (!pivot) return;
      capturePointer(e);

      const worldPos = new THREE.Vector3();
      pivot.getWorldPosition(worldPos);
      const worldQuat = new THREE.Quaternion();
      pivot.getWorldQuaternion(worldQuat);
      const axisWorld = new THREE.Vector3(0, 0, 1).applyQuaternion(worldQuat).normalize();
      // The rotation plane is the ring's own face: perpendicular to its spin axis.
      const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(axisWorld, worldPos);
      const invMatrix = new THREE.Matrix4().copy(pivot.matrixWorld).invert();

      const hit = new THREE.Vector3();
      const lastAngle = e.ray.intersectPlane(plane, hit)
        ? Math.atan2(hit.clone().applyMatrix4(invMatrix).y, hit.clone().applyMatrix4(invMatrix).x)
        : 0;

      drag.current = { plane, invMatrix, lastAngle, accumulated: value };
    },
    [getPivot, value],
  );

  const onPointerMove = useCallback((e: ThreeEvent<PointerEvent>) => {
    const state = drag.current;
    if (!state) return;
    e.stopPropagation();
    const hit = new THREE.Vector3();
    if (!e.ray.intersectPlane(state.plane, hit)) return;
    const local = hit.applyMatrix4(state.invMatrix);
    const angle = Math.atan2(local.y, local.x);
    state.accumulated += shortestAngleDelta(state.lastAngle, angle);
    state.lastAngle = angle;
    onChange(state.accumulated);
  }, [onChange]);

  const onPointerUp = useCallback((e: ThreeEvent<PointerEvent>) => {
    drag.current = null;
    releasePointer(e);
  }, []);

  return { onPointerDown, onPointerMove, onPointerUp };
}
