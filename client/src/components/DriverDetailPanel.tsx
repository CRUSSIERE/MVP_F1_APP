import type { CarData, Driver } from "../types/openf1";

interface Props {
  driver: Driver | null;
  data: CarData | null;
  loading: boolean;
  onClose: () => void;
}

function Gauge({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs text-neutral-400 mb-1">
        <span>{label}</span>
        <span>{Math.round(value)}%</span>
      </div>
      <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
        <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      </div>
    </div>
  );
}

export default function DriverDetailPanel({ driver, data, loading, onClose }: Props) {
  if (!driver) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-10 sm:hidden" onClick={onClose} />
      <div className="fixed inset-x-3 bottom-3 max-h-[75vh] sm:inset-x-auto sm:bottom-4 sm:right-4 sm:top-4 sm:max-h-none sm:w-80 bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl p-4 flex flex-col gap-4 overflow-y-auto z-20">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-lg font-bold">
            #{driver.driver_number} {driver.name_acronym}
          </div>
          <div className="text-sm text-neutral-400">{driver.team_name}</div>
        </div>
        <button onClick={onClose} className="text-neutral-400 hover:text-white text-xl leading-none">
          ×
        </button>
      </div>

      {loading && !data && <div className="text-sm text-neutral-500">Chargement…</div>}

      {data ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-neutral-800 rounded-md p-3">
              <div className="text-xs text-neutral-400">Vitesse</div>
              <div className="text-2xl font-bold tabular-nums">{Math.round(data.speed)}</div>
              <div className="text-xs text-neutral-500">km/h</div>
            </div>
            <div className="bg-neutral-800 rounded-md p-3">
              <div className="text-xs text-neutral-400">Rapport</div>
              <div className="text-2xl font-bold tabular-nums">{data.n_gear || "N"}</div>
              <div className="text-xs text-neutral-500">gear</div>
            </div>
            <div className="bg-neutral-800 rounded-md p-3">
              <div className="text-xs text-neutral-400">RPM</div>
              <div className="text-2xl font-bold tabular-nums">{data.rpm.toLocaleString()}</div>
            </div>
            <div className="bg-neutral-800 rounded-md p-3">
              <div className="text-xs text-neutral-400">DRS</div>
              <div className={`text-2xl font-bold ${data.drs >= 10 ? "text-emerald-400" : "text-neutral-500"}`}>
                {data.drs >= 10 ? "OUVERT" : "fermé"}
              </div>
            </div>
          </div>

          <Gauge label="Accélérateur" value={data.throttle} />
          <Gauge label="Frein" value={data.brake} />

          <div className="text-xs text-neutral-500 mt-auto">
            Échantillon : {new Date(data.date).toLocaleTimeString()}
          </div>
        </>
      ) : (
        !loading && <div className="text-sm text-neutral-500">Pas de données disponibles pour ce pilote.</div>
      )}
      </div>
    </>
  );
}
