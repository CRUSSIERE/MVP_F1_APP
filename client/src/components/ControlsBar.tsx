import type { Session } from "../types/openf1";
import type { Mode } from "../hooks/useSessionSelection";
import type { ReplayControls } from "../hooks/useReplayEngine";

interface Props {
  mode: Mode;
  setMode: (mode: Mode) => void;
  year: string;
  setYear: (year: string) => void;
  country: string;
  setCountry: (country: string) => void;
  onReload: () => void;
  session: Session | null;
  replayControls?: ReplayControls;
}

const SPEED_OPTIONS = [1, 2, 5, 10, 25];

export default function ControlsBar({
  mode,
  setMode,
  year,
  setYear,
  country,
  setCountry,
  onReload,
  session,
  replayControls,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3 bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-3">
      <div className="flex rounded-md overflow-hidden border border-neutral-700">
        {(["replay", "live"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-3 py-1.5 text-sm font-medium ${
              mode === m ? "bg-red-600 text-white" : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
            }`}
          >
            {m === "live" ? "Live" : "Replay"}
          </button>
        ))}
      </div>

      {mode === "replay" && (
        <>
          <input
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder="Année"
            className="w-20 bg-neutral-800 border border-neutral-700 rounded px-2 py-1.5 text-sm"
          />
          <input
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="Pays (ex: Belgium)"
            className="w-40 bg-neutral-800 border border-neutral-700 rounded px-2 py-1.5 text-sm"
          />
          <button
            onClick={onReload}
            className="px-3 py-1.5 text-sm bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded"
          >
            Charger
          </button>
        </>
      )}

      {mode === "replay" && replayControls && (
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={replayControls.togglePlaying}
            className="px-3 py-1.5 text-sm bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded"
          >
            {replayControls.playing ? "⏸ Pause" : "▶ Lecture"}
          </button>
          <select
            value={replayControls.speed}
            onChange={(e) => replayControls.setSpeed(Number(e.target.value))}
            className="bg-neutral-800 border border-neutral-700 rounded px-2 py-1.5 text-sm"
          >
            {SPEED_OPTIONS.map((s) => (
              <option key={s} value={s}>
                x{s}
              </option>
            ))}
          </select>
        </div>
      )}

      {session && (
        <div className={`text-sm text-neutral-400 ${mode === "live" ? "ml-auto" : ""}`}>
          {session.circuit_short_name} — {session.session_name} ({session.year})
        </div>
      )}
    </div>
  );
}
