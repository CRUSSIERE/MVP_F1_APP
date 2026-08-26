import type { CarData, Driver } from "../types/openf1";
import type { LapInfo } from "../hooks/useDriverDetail";

interface Props {
  driver: Driver | null;
  data: CarData | null;
  loading: boolean;
  lapInfo: LapInfo | null;
  onClose: () => void;
}

function Gauge({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs text-neutral-400 mb-1.5">
        <span>{label}</span>
        <span className="tabular-nums font-medium text-neutral-200">{Math.round(value)}%</span>
      </div>
      <div className="h-2.5 bg-neutral-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-emerald-500 transition-[width] duration-150 ease-linear"
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}

function formatLapTime(seconds: number | null): string {
  if (seconds === null) return "—";
  const m = Math.floor(seconds / 60);
  const s = (seconds % 60).toFixed(3).padStart(6, "0");
  return `${m}:${s}`;
}

function StatTile({ label, value, unit, accent }: { label: string; value: string | number; unit?: string; accent?: boolean }) {
  return (
    <div className="bg-neutral-800/80 rounded-lg p-3">
      <div className="text-xs text-neutral-400">{label}</div>
      <div className={`text-2xl font-bold tabular-nums ${accent ? "text-emerald-400" : ""}`}>{value}</div>
      {unit && <div className="text-xs text-neutral-500">{unit}</div>}
    </div>
  );
}

export default function DriverDetailPanel({ driver, data, loading, lapInfo, onClose }: Props) {
  if (!driver) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-10 sm:hidden" onClick={onClose} />
      <div
        className="fixed inset-x-3 bottom-3 max-h-[80vh] sm:inset-x-auto sm:bottom-4 sm:right-4 sm:top-4 sm:max-h-none sm:w-96
          bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl p-4 sm:p-5 flex flex-col gap-4 overflow-y-auto z-20
          animate-[slideIn_0.2s_ease-out]"
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: driver.team_colour ? `#${driver.team_colour}` : "#666" }}
              />
              <div className="text-xl font-bold">
                #{driver.driver_number} {driver.name_acronym}
              </div>
            </div>
            <div className="text-sm text-neutral-400 mt-0.5">{driver.team_name}</div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-800 transition-colors"
          >
            ×
          </button>
        </div>

        {loading && !data && <div className="text-sm text-neutral-500">Chargement…</div>}

        {data ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <StatTile label="Vitesse" value={Math.round(data.speed)} unit="km/h" accent />
              <StatTile label="Rapport" value={data.n_gear || "N"} unit="gear" />
              <StatTile label="RPM" value={data.rpm.toLocaleString()} />
              <div className="bg-neutral-800/80 rounded-lg p-3">
                <div className="text-xs text-neutral-400">DRS</div>
                <div className={`text-2xl font-bold ${data.drs >= 10 ? "text-emerald-400" : "text-neutral-500"}`}>
                  {data.drs >= 10 ? "OUVERT" : "fermé"}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Gauge label="Accélérateur" value={data.throttle} />
              <Gauge label="Frein" value={data.brake} />
            </div>

            {lapInfo && (
              <div className="border-t border-neutral-800 pt-3 grid grid-cols-3 gap-2">
                <div>
                  <div className="text-xs text-neutral-500">Tour</div>
                  <div className="text-lg font-bold tabular-nums">{lapInfo.lapNumber ?? "—"}</div>
                </div>
                <div>
                  <div className="text-xs text-neutral-500">Dernier tour</div>
                  <div className="text-lg font-bold tabular-nums">{formatLapTime(lapInfo.lastLapDuration)}</div>
                </div>
                <div>
                  <div className="text-xs text-neutral-500">Meilleur tour</div>
                  <div className="text-lg font-bold tabular-nums text-emerald-400">
                    {formatLapTime(lapInfo.bestLapDuration)}
                  </div>
                </div>
              </div>
            )}

            <div className="text-xs text-neutral-600 mt-auto pt-2">
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
