import { useState } from "react";
import ControlsBar from "./components/ControlsBar";
import DriverDetailPanel from "./components/DriverDetailPanel";
import Leaderboard from "./components/Leaderboard";
import TrackCanvas from "./components/TrackCanvas";
import { useDriverDetail } from "./hooks/useDriverDetail";
import { useLiveEngine } from "./hooks/useLiveEngine";
import { useReplayEngine } from "./hooks/useReplayEngine";
import { useSessionSelection } from "./hooks/useSessionSelection";

export default function App() {
  const { mode, setMode, year, setYear, country, setCountry, reload, session, drivers, status, errorMessage } =
    useSessionSelection();
  const [selectedDriver, setSelectedDriver] = useState<number | null>(null);

  const liveEngine = useLiveEngine(mode === "live" ? session : null);
  const replayEngine = useReplayEngine(mode === "replay" ? session : null);
  const engine = mode === "live" ? liveEngine : replayEngine;

  const detail = useDriverDetail({
    mode,
    session,
    driverNumber: selectedDriver,
    windowStart: mode === "replay" ? replayEngine.controls.windowStart : null,
    windowSeconds: mode === "replay" ? replayEngine.controls.windowSeconds : 0,
    virtualOffsetMs: mode === "replay" ? replayEngine.controls.virtualOffsetMs : 0,
  });

  const selectedDriverInfo = drivers.find((d) => d.driver_number === selectedDriver) ?? null;

  return (
    <div className="min-h-screen p-4 flex flex-col gap-4 max-w-[1400px] mx-auto">
      <header>
        <h1 className="text-2xl font-bold">F1 Live Tracker</h1>
        <p className="text-sm text-neutral-500">Alimenté par l'API publique OpenF1</p>
      </header>

      <ControlsBar
        mode={mode}
        setMode={setMode}
        year={year}
        setYear={setYear}
        country={country}
        setCountry={setCountry}
        onReload={reload}
        session={session}
        replayControls={mode === "replay" ? replayEngine.controls : undefined}
      />

      {status === "loading" && <div className="text-neutral-400">Chargement de la session…</div>}
      {status === "no-data" && (
        <div className="text-amber-400 bg-amber-950/40 border border-amber-800 rounded-lg p-4">
          Aucune session disponible pour ces critères
          {mode === "live" ? " (pas de session live en ce moment)." : "."}
        </div>
      )}
      {status === "error" && (
        <div className="text-red-400 bg-red-950/40 border border-red-800 rounded-lg p-4">
          Erreur : {errorMessage}
        </div>
      )}
      {engine.message && (
        <div className="text-amber-400 bg-amber-950/40 border border-amber-800 rounded-lg p-3 text-sm">
          {engine.message}
        </div>
      )}

      {status === "ready" && (
        <div className="flex gap-4">
          <div className="flex-1 min-w-0">
            {engine.ready ? (
              <TrackCanvas
                trackPath={engine.trackPath}
                drivers={drivers}
                positions={engine.positions}
                selectedDriver={selectedDriver}
                onSelectDriver={setSelectedDriver}
              />
            ) : (
              <div className="aspect-[960/620] w-full flex items-center justify-center bg-black border border-neutral-800 rounded-lg text-neutral-500">
                Chargement du tracé…
              </div>
            )}
          </div>
          <div className="w-[420px] shrink-0">
            <Leaderboard
              drivers={drivers}
              intervals={engine.intervals}
              selectedDriver={selectedDriver}
              onSelectDriver={setSelectedDriver}
            />
          </div>
        </div>
      )}

      <DriverDetailPanel
        driver={selectedDriverInfo}
        data={detail.data}
        loading={detail.loading}
        onClose={() => setSelectedDriver(null)}
      />
    </div>
  );
}
