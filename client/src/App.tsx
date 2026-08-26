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
  const {
    mode,
    setMode,
    year,
    setYear,
    meetings,
    meetingKey,
    setMeetingKey,
    sessionsForMeeting,
    sessionKey,
    setSessionKey,
    session,
    drivers,
    status,
    errorMessage,
  } = useSessionSelection();
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
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="mx-auto max-w-[1400px] p-3 sm:p-4 flex flex-col gap-4">
        <header className="flex items-baseline gap-3">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            🏎️ F1 <span className="text-red-500">Live</span> Tracker
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 hidden sm:block">Alimenté par l'API publique OpenF1</p>
        </header>

        <ControlsBar
          mode={mode}
          setMode={setMode}
          year={year}
          setYear={setYear}
          meetings={meetings}
          meetingKey={meetingKey}
          setMeetingKey={setMeetingKey}
          sessionsForMeeting={sessionsForMeeting}
          sessionKey={sessionKey}
          setSessionKey={setSessionKey}
          session={session}
          replayControls={mode === "replay" ? replayEngine.controls : undefined}
        />

        {status === "loading" && (
          <div className="text-neutral-400 text-sm px-1">Chargement de la session…</div>
        )}
        {status === "no-data" && (
          <div className="text-amber-400 bg-amber-950/40 border border-amber-800 rounded-lg p-4 text-sm">
            Aucune session disponible pour ces critères
            {mode === "live" ? " (pas de session live en ce moment — essayez le mode Replay)." : "."}
          </div>
        )}
        {status === "error" && (
          <div className="text-red-400 bg-red-950/40 border border-red-800 rounded-lg p-4 text-sm">
            Erreur : {errorMessage}
          </div>
        )}
        {engine.message && (
          <div className="text-amber-400 bg-amber-950/40 border border-amber-800 rounded-lg p-3 text-sm">
            {engine.message}
          </div>
        )}

        {status === "ready" && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4 items-start">
            <div className="min-w-0">
              {engine.ready ? (
                <TrackCanvas
                  trackPath={engine.trackPath}
                  drivers={drivers}
                  positions={engine.positions}
                  selectedDriver={selectedDriver}
                  onSelectDriver={setSelectedDriver}
                />
              ) : (
                <div className="aspect-[960/620] w-full flex items-center justify-center bg-black border border-neutral-800 rounded-lg text-neutral-500 text-sm">
                  Chargement du tracé…
                </div>
              )}
            </div>
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-2 lg:self-start">
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
    </div>
  );
}
