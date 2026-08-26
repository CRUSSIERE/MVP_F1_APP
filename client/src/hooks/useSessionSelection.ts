import { useCallback, useEffect, useState } from "react";
import { fetchDrivers, fetchLatestSession, fetchSessions } from "../api/openf1";
import type { Driver, Session } from "../types/openf1";

export type Mode = "live" | "replay";

interface State {
  mode: Mode;
  session: Session | null;
  drivers: Driver[];
  status: "loading" | "ready" | "no-data" | "error";
  errorMessage?: string;
}

const DEFAULT_REPLAY_YEAR = "2023";
const DEFAULT_REPLAY_COUNTRY = "Belgium";

export function useSessionSelection() {
  const [mode, setMode] = useState<Mode>("replay");
  const [year, setYear] = useState(DEFAULT_REPLAY_YEAR);
  const [country, setCountry] = useState(DEFAULT_REPLAY_COUNTRY);
  const [state, setState] = useState<State>({
    mode: "replay",
    session: null,
    drivers: [],
    status: "loading",
  });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, status: "loading", errorMessage: undefined }));
    try {
      const sessions =
        mode === "live" ? await fetchLatestSession() : await fetchSessions({ year, country_name: country });

      if (!sessions || sessions.length === 0) {
        setState({ mode, session: null, drivers: [], status: "no-data" });
        return;
      }

      // For replay, prefer a Race session if the country has several
      // sessions (qualifying, practice, race); otherwise take the last one.
      const chosen =
        mode === "replay"
          ? sessions.find((s) => s.session_type === "Race") ?? sessions[sessions.length - 1]
          : sessions[0];

      const drivers = await fetchDrivers(chosen.session_key);
      setState({ mode, session: chosen, drivers, status: drivers.length > 0 ? "ready" : "no-data" });
    } catch (err) {
      setState({
        mode,
        session: null,
        drivers: [],
        status: "error",
        errorMessage: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }, [mode, year, country]);

  useEffect(() => {
    load();
  }, [load]);

  return { setMode, year, setYear, country, setCountry, reload: load, ...state };
}
