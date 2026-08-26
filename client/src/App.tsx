import { useMemo, useState } from "react";
import ControlsBar from "./components/ControlsBar";
import DriverDetailPanel from "./components/DriverDetailPanel";
import Leaderboard from "./components/Leaderboard";
import TrackCanvas from "./components/TrackCanvas";
import { useDriverDetail } from "./hooks/useDriverDetail";
import { useLiveEngine } from "./hooks/useLiveEngine";
import { useReplayEngine } from "./hooks/useReplayEngine";
import { useSessionSelection } from "./hooks/useSessionSelection";
import { useSmoothPositions } from "./hooks/useSmoothPositions";

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
  const smoothPositions = useSmoothPositions(engine.positions);

  const detail = useDriverDetail({
    mode,
    session,
    driverNumber: selectedDriver,
    windowStart: mode === "replay" ? replayEngine.controls.windowStart : null,
    windowSeconds: mode === "replay" ? replayEngine.controls.windowSeconds : 0,
    virtualOffsetMs: mode === "replay" ? replayEngine.controls.virtualOffsetMs : 0,
  });

  const selectedDriverInfo = drivers.find((d) => d.driver_number === selectedDriver) ?? null;

  const leaderName = useMemo(() => {
    let best: { name: string; gap: number } | null = null;
    for (const d of drivers) {
      const gap = engine.intervals[d.driver_number]?.gap_to_leader;
      const n = typeof gap === "number" ? gap : gap === "0" ? 0 : null;
      if (n !== null && (best === null || n < best.gap)) {
        best = { name: d.name_acronym ?? d.broadcast_name, gap: n };
      }
    }
    return best?.name ?? null;
  }, [drivers, engine.intervals]);

  const carsOnTrack = Object.keys(smoothPositions).length;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="mx-auto max-w-[1680px] p-3 sm:p-5 flex flex-col gap-4">
        <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            🏎️ F1 <span className="text-[#e10600]">Live</span> Tracker
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500">Alimenté par l'API publique OpenF1</p>
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

        {status === "loading" && <div className="text-neutral-400 text-sm px-1">Chargement de la session…</div>}
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

        {status === "ready" && engine.ready && (
          <div className="flex flex-wrap gap-3 text-sm">
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 flex items-center gap-2">
              <span className="text-neutral-500">Leader</span>
              <span className="font-bold text-neutral-100">{leaderName ?? "—"}</span>
            </div>
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 flex items-center gap-2">
              <span className="text-neutral-500">Voitures suivies</span>
              <span className="font-bold text-neutral-100 tabular-nums">
                {carsOnTrack}/{drivers.length}
              </span>
            </div>
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${mode === "live" ? "bg-red-500 animate-pulse" : "bg-emerald-500"}`} />
              <span className="text-neutral-300">{mode === "live" ? "En direct" : "Replay"}</span>
            </div>
          </div>
        )}

        {status === "ready" && (
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_440px] gap-4 items-start">
            <div className="min-w-0">
              {engine.ready ? (
                <TrackCanvas
                  trackPath={engine.trackPath}
                  drivers={drivers}
                  positions={smoothPositions}
                  selectedDriver={selectedDriver}
                  onSelectDriver={setSelectedDriver}
                />
              ) : (
                <div className="aspect-[1280/800] w-full flex items-center justify-center bg-black border border-neutral-800 rounded-xl text-neutral-500 text-sm">
                  Chargement du tracé…
                </div>
              )}
            </div>
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-2.5 xl:self-start xl:sticky xl:top-5">
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
          lapInfo={detail.lapInfo}
          onClose={() => setSelectedDriver(null)}
        />
      </div>
    </div>
  );
}
