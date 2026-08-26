import type { Meeting, Session } from "../types/openf1";
import type { Mode } from "../hooks/useSessionSelection";
import { REPLAY_YEARS } from "../hooks/useSessionSelection";
import type { ReplayControls } from "../hooks/useReplayEngine";

interface Props {
  mode: Mode;
  setMode: (mode: Mode) => void;
  year: string;
  setYear: (year: string) => void;
  meetings: Meeting[];
  meetingKey: number | null;
  setMeetingKey: (key: number) => void;
  sessionsForMeeting: Session[];
  sessionKey: number | null;
  setSessionKey: (key: number) => void;
  session: Session | null;
  replayControls?: ReplayControls;
}

const SPEED_OPTIONS = [1, 2, 5, 10, 25];

const selectClass =
  "bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-red-500/60 disabled:opacity-50 transition-shadow";

export default function ControlsBar({
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
  replayControls,
}: Props) {
  return (
    <div className="flex flex-col gap-3 bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3.5 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg overflow-hidden border border-neutral-700 shrink-0">
          {(["replay", "live"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-4 py-2 text-sm font-semibold transition-colors ${
                mode === m ? "bg-[#e10600] text-white" : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
              }`}
            >
              {m === "live" ? "Live" : "Replay"}
            </button>
          ))}
        </div>

        {mode === "replay" && (
          <>
            <select value={year} onChange={(e) => setYear(e.target.value)} className={selectClass}>
              {REPLAY_YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>

            <select
              value={meetingKey ?? ""}
              onChange={(e) => setMeetingKey(Number(e.target.value))}
              disabled={meetings.length === 0}
              className={`${selectClass} min-w-[200px]`}
            >
              {meetings.length === 0 && <option value="">Chargement des courses…</option>}
              {meetings.map((m) => (
                <option key={m.meeting_key} value={m.meeting_key}>
                  {m.country_name} — {m.meeting_name}
                </option>
              ))}
            </select>

            <select
              value={sessionKey ?? ""}
              onChange={(e) => setSessionKey(Number(e.target.value))}
              disabled={sessionsForMeeting.length === 0}
              className={selectClass}
            >
              {sessionsForMeeting.length === 0 && <option value="">…</option>}
              {sessionsForMeeting.map((s) => (
                <option key={s.session_key} value={s.session_key}>
                  {s.session_name}
                </option>
              ))}
            </select>
          </>
        )}

        {mode === "replay" && replayControls && (
          <div className="flex items-center gap-2 sm:ml-auto">
            <button
              onClick={replayControls.togglePlaying}
              className="px-3.5 py-2 text-sm font-medium bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg transition-colors"
            >
              {replayControls.playing ? "⏸ Pause" : "▶ Lecture"}
            </button>
            <select
              value={replayControls.speed}
              onChange={(e) => replayControls.setSpeed(Number(e.target.value))}
              className={selectClass}
            >
              {SPEED_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  x{s}
                </option>
              ))}
            </select>
          </div>
        )}

        {mode === "live" && session && <div className="text-sm text-neutral-400 sm:ml-auto">Session en direct</div>}
      </div>

      {session && (
        <div className="text-sm text-neutral-400 border-t border-neutral-800 pt-2">
          <span className="text-neutral-200 font-medium">{session.circuit_short_name}</span> — {session.session_name}{" "}
          <span className="text-neutral-600">({session.year})</span>
        </div>
      )}
    </div>
  );
}
