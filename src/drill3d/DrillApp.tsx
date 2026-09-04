import { useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type * as THREE from 'three';
import { PowerDrill } from './PowerDrill';
import { Workpiece } from './components/Workpiece';
import { ControlPanel } from './ControlPanel';
import { useDrillStore } from './store';

export default function DrillApp() {
  const workpieceRef = useRef<THREE.Mesh>(null);
  const isDragging = useDrillStore((s) => s.isDragging);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-slate-950">
      <Canvas camera={{ position: [-0.32, 0.22, -0.38], fov: 42 }} shadows={false}>
        <color attach="background" args={['#0f172a']} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[-1.5, 2, -1]} intensity={1.3} />
        <directionalLight position={[1.5, -0.5, 1]} intensity={0.3} />

        <PowerDrill workpieceRef={workpieceRef} />
        <Workpiece ref={workpieceRef} />

        <gridHelper args={[1.2, 12, '#334155', '#1e293b']} position={[0, -0.16, 0.1]} />

        <OrbitControls
          enabled={!isDragging}
          target={[0, -0.02, 0.05]}
          minDistance={0.25}
          maxDistance={1.2}
        />
      </Canvas>

      <ControlPanel />
    </div>
  );
}
