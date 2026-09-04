import { useDrillStore } from './store';
import { MATERIAL_PRESETS } from './constants';
import { primeAudio } from './audio';

function StatPill({ label, value, tone }: { label: string; value: string; tone?: 'ok' | 'warn' | 'idle' }) {
  const toneClass =
    tone === 'ok'
      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
      : tone === 'warn'
        ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
        : 'bg-slate-500/15 text-slate-300 border-slate-500/30';
  return (
    <div className={`rounded-lg border px-3 py-2 ${toneClass}`}>
      <div className="text-[10px] uppercase tracking-wide opacity-70">{label}</div>
      <div className="text-sm font-bold font-mono">{value}</div>
    </div>
  );
}

export function ControlPanel() {
  const {
    powerSource,
    isPowered,
    lockOn,
    clutchThreshold,
    materialId,
    feedDistance,
    telemetry,
  } = useDrillStore();
  const togglePower = useDrillStore((s) => s.togglePower);
  const toggleLockOn = useDrillStore((s) => s.toggleLockOn);
  const setMaterialId = useDrillStore((s) => s.setMaterialId);
  const setFeedDistance = useDrillStore((s) => s.setFeedDistance);

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-4 sm:p-6 font-sans text-white">
      <div className="pointer-events-auto max-w-sm rounded-2xl border border-white/10 bg-slate-900/80 p-4 backdrop-blur-sm shadow-xl">
        <h1 className="text-lg font-bold">Perceuse électrique — 3D</h1>
        <p className="mt-1 text-xs text-slate-300 leading-relaxed">
          Tirez la gâchette rouge vers l'arrière, tournez la bague bleue du mandrin pour serrer les mors,
          et réglez la bague de l'embrayage (jaune) pour choisir le seuil de couple (1–20).
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => {
              primeAudio();
              togglePower();
            }}
            className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
              isPowered ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-700 hover:bg-slate-600'
            }`}
          >
            {isPowered ? 'Alimentée (ON)' : 'Hors tension (OFF)'}
          </button>

          <span className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-300">
            {powerSource === 'battery' ? 'Sans fil (batterie)' : 'Filaire (cordon)'}
          </span>

          {powerSource === 'cable' && (
            <button
              onClick={toggleLockOn}
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                lockOn ? 'bg-orange-600 hover:bg-orange-700' : 'bg-slate-700 hover:bg-slate-600'
              }`}
            >
              Verrouillage {lockOn ? 'actif' : 'inactif'}
            </button>
          )}
        </div>

        <div className="mt-4">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Matériau de la pièce
          </div>
          <div className="flex flex-wrap gap-2">
            {MATERIAL_PRESETS.map((m) => (
              <button
                key={m.id}
                onClick={() => setMaterialId(m.id)}
                className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                  materialId === m.id
                    ? 'border-sky-400 bg-sky-500/20 text-sky-200'
                    : 'border-white/10 bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {m.label} (dureté {m.hardness})
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            <span>Avance de la mèche</span>
            <span className="font-mono text-slate-300">{Math.round(feedDistance * 100)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={feedDistance}
            onChange={(e) => setFeedDistance(Number(e.target.value))}
            className="w-full accent-sky-500"
          />
        </div>
      </div>

      <div className="pointer-events-auto grid max-w-sm grid-cols-2 gap-2 self-end sm:self-start">
        <StatPill label="Vitesse moteur" value={`${Math.round(telemetry.currentRpm)} RPM`} />
        <StatPill
          label="Résistance / Seuil"
          value={`${telemetry.appliedResistance.toFixed(0)} / ${clutchThreshold}`}
          tone={telemetry.clutchSlipping ? 'warn' : 'ok'}
        />
        <StatPill
          label="Embrayage"
          value={telemetry.clutchSlipping ? 'Glisse' : telemetry.clutchEngaged ? 'Engagé' : 'Repos'}
          tone={telemetry.clutchSlipping ? 'warn' : telemetry.clutchEngaged ? 'ok' : 'idle'}
        />
        <StatPill label="Mors du mandrin" value={`${Math.round(telemetry.jawClosure * 100)}% fermé`} />
        <StatPill
          label="Contact pièce"
          value={telemetry.isTouchingSurface ? 'Oui' : 'Non'}
          tone={telemetry.isTouchingSurface ? 'ok' : 'idle'}
        />
      </div>
    </div>
  );
}
