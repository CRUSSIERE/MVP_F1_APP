import { useEffect, useState } from "react";
import { fetchDrivers, fetchLatestSession, fetchMeetings, fetchSessions } from "../api/openf1";
import type { Driver, Meeting, Session } from "../types/openf1";

export type Mode = "live" | "replay";

export const REPLAY_YEARS = ["2025", "2024", "2023"];

const SESSION_TYPE_PRIORITY = ["Race", "Sprint", "Qualifying", "Sprint Qualifying", "Practice 3", "Practice 2", "Practice 1"];

function pickDefaultSession(sessions: Session[]): Session | null {
  if (sessions.length === 0) return null;
  for (const name of SESSION_TYPE_PRIORITY) {
    const match = sessions.find((s) => s.session_name === name);
    if (match) return match;
  }
  return sessions[sessions.length - 1];
}

type Status = "loading" | "ready" | "no-data" | "error";

export function useSessionSelection() {
  const [mode, setMode] = useState<Mode>("replay");
  const [year, setYear] = useState(REPLAY_YEARS[0]);

  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [meetingKey, setMeetingKey] = useState<number | null>(null);
  const [meetingsStatus, setMeetingsStatus] = useState<Status>("loading");

  const [sessionsForMeeting, setSessionsForMeeting] = useState<Session[]>([]);
  const [sessionKey, setSessionKey] = useState<number | null>(null);

  const [session, setSession] = useState<Session | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  // Live mode: fetch the latest session directly, no meeting/session picking.
  useEffect(() => {
    if (mode !== "live") return;
    let cancelled = false;
    setStatus("loading");
    setErrorMessage(undefined);
    fetchLatestSession()
      .then(async (sessions) => {
        if (cancelled) return;
        if (sessions.length === 0) {
          setSession(null);
          setDrivers([]);
          setStatus("no-data");
          return;
        }
        const chosen = sessions[0];
        const driverList = await fetchDrivers(chosen.session_key);
        if (cancelled) return;
        setSession(chosen);
        setDrivers(driverList);
        setStatus(driverList.length > 0 ? "ready" : "no-data");
      })
      .catch((err) => {
        if (cancelled) return;
        setSession(null);
        setDrivers([]);
        setStatus("error");
        setErrorMessage(err instanceof Error ? err.message : "Erreur inconnue");
      });
    return () => {
      cancelled = true;
    };
  }, [mode]);

  // Replay mode, step 1: list Grand Prix weekends for the selected year.
  useEffect(() => {
    if (mode !== "replay") return;
    let cancelled = false;
    setMeetingsStatus("loading");
    setMeetings([]);
    setMeetingKey(null);
    fetchMeetings(year)
      .then((list) => {
        if (cancelled) return;
        const sorted = list.slice().sort((a, b) => a.date_start.localeCompare(b.date_start));
        setMeetings(sorted);
        setMeetingsStatus(sorted.length > 0 ? "ready" : "no-data");
        if (sorted.length > 0) setMeetingKey(sorted[sorted.length - 1].meeting_key);
      })
      .catch((err) => {
        if (cancelled) return;
        setMeetingsStatus("error");
        setErrorMessage(err instanceof Error ? err.message : "Erreur inconnue");
      });
    return () => {
      cancelled = true;
    };
  }, [mode, year]);

  // Replay mode, step 2: list sessions (Practice/Qualifying/Race...) for the
  // selected meeting, defaulting to the Race.
  useEffect(() => {
    if (mode !== "replay" || meetingKey === null) return;
    let cancelled = false;
    setStatus("loading");
    setErrorMessage(undefined);
    fetchSessions({ meeting_key: String(meetingKey) })
      .then((sessions) => {
        if (cancelled) return;
        const sorted = sessions.slice().sort((a, b) => a.date_start.localeCompare(b.date_start));
        setSessionsForMeeting(sorted);
        const defaultSession = pickDefaultSession(sorted);
        setSessionKey(defaultSession?.session_key ?? null);
        if (!defaultSession) {
          setSession(null);
          setDrivers([]);
          setStatus("no-data");
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setStatus("error");
        setErrorMessage(err instanceof Error ? err.message : "Erreur inconnue");
      });
    return () => {
      cancelled = true;
    };
  }, [mode, meetingKey]);

  // Replay mode, step 3: resolve the chosen session and load its drivers.
  useEffect(() => {
    if (mode !== "replay" || sessionKey === null) return;
    const chosen = sessionsForMeeting.find((s) => s.session_key === sessionKey);
    if (!chosen) return;
    let cancelled = false;
    setStatus("loading");
    fetchDrivers(chosen.session_key)
      .then((driverList) => {
        if (cancelled) return;
        setSession(chosen);
        setDrivers(driverList);
        setStatus(driverList.length > 0 ? "ready" : "no-data");
      })
      .catch((err) => {
        if (cancelled) return;
        setStatus("error");
        setErrorMessage(err instanceof Error ? err.message : "Erreur inconnue");
      });
    return () => {
      cancelled = true;
    };
  }, [mode, sessionKey, sessionsForMeeting]);

  return {
    mode,
    setMode,
    year,
    setYear,
    meetings,
    meetingKey,
    setMeetingKey,
    meetingsStatus,
    sessionsForMeeting,
    sessionKey,
    setSessionKey,
    session,
    drivers,
    status,
    errorMessage,
  };
}
