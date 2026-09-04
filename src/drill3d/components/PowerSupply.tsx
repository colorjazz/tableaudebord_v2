import { useDrillStore } from '../store';
import { primeAudio } from '../audio';

// Power Source (Battery/Cable), at the base of the handle. Clicking the pack
// / plug toggles isPowered; the small yellow tab swaps which style is
// mounted, since a given drill is either cordless or corded, not both.
export function PowerSupply() {
  const powerSource = useDrillStore((s) => s.powerSource);
  const isPowered = useDrillStore((s) => s.isPowered);
  const togglePower = useDrillStore((s) => s.togglePower);
  const setPowerSource = useDrillStore((s) => s.setPowerSource);

  const handleTogglePower = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    primeAudio();
    togglePower();
  };

  return (
    <group position={[0, -0.125, 0]}>
      {powerSource === 'battery' ? (
        <mesh position={[0, -0.024, 0]} onClick={handleTogglePower}>
          <boxGeometry args={[0.05, 0.05, 0.035]} />
          <meshStandardMaterial
            color={isPowered ? '#2f855a' : '#4a5568'}
            emissive={isPowered ? '#22543d' : '#000000'}
            emissiveIntensity={isPowered ? 0.4 : 0}
          />
        </mesh>
      ) : (
        <group>
          <mesh position={[0, -0.075, 0]}>
            <cylinderGeometry args={[0.006, 0.006, 0.12, 12]} />
            <meshStandardMaterial color="#1a1a1a" />
          </mesh>
          <mesh position={[0, -0.015, 0]} onClick={handleTogglePower}>
            <boxGeometry args={[0.03, 0.02, 0.03]} />
            <meshStandardMaterial
              color={isPowered ? '#2f855a' : '#4a5568'}
              emissive={isPowered ? '#22543d' : '#000000'}
              emissiveIntensity={isPowered ? 0.4 : 0}
            />
          </mesh>
        </group>
      )}

      <mesh
        position={[0.036, 0.012, 0]}
        onClick={(e) => {
          e.stopPropagation();
          setPowerSource(powerSource === 'battery' ? 'cable' : 'battery');
        }}
      >
        <boxGeometry args={[0.012, 0.008, 0.012]} />
        <meshStandardMaterial color="#ecc94b" />
      </mesh>
    </group>
  );
}
