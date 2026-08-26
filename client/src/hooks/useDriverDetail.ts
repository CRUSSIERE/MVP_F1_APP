import { useEffect, useRef, useState } from "react";
import { fetchCarData } from "../api/openf1";
import type { CarData, Session } from "../types/openf1";
import type { Mode } from "./useSessionSelection";

const LIVE_POLL_MS = 2000;
const LIVE_LOOKBACK_MS = 5000;

interface Options {
  mode: Mode;
  session: Session | null;
  driverNumber: number | null;
  windowStart: string | null;
  windowSeconds: number;
  virtualOffsetMs: number;
}

export function useDriverDetail({
  mode,
  session,
  driverNumber,
  windowStart,
  windowSeconds,
  virtualOffsetMs,
}: Options): { data: CarData | null; loading: boolean } {
  const [data, setData] = useState<CarData | null>(null);
  const [loading, setLoading] = useState(false);
  const replaySeriesRef = useRef<CarData[]>([]);
  const replayDriverRef = useRef<number | null>(null);

  // Live mode: poll the selected driver's car_data.
  useEffect(() => {
    if (mode !== "live" || !session || driverNumber === null) {
      if (mode === "live") setData(null);
      return;
    }
    let cancelled = false;

    async function poll() {
      if (!session || driverNumber === null) return;
      try {
        const since = new Date(Date.now() - LIVE_LOOKBACK_MS).toISOString();
        const samples = await fetchCarData(session.session_key, { driverNumber, dateFrom: since });
        if (cancelled || samples.length === 0) return;
        setData(samples[samples.length - 1]);
      } catch {
        // Keep last known value; a transient failure shouldn't blank the panel.
      }
    }

    setData(null);
    poll();
    const id = setInterval(poll, LIVE_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [mode, session, driverNumber]);

  // Replay mode: lazily fetch the driver's car_data across the replay
  // window once, then sample it against the shared virtual clock.
  useEffect(() => {
    if (mode !== "replay" || !session || driverNumber === null || !windowStart) {
      if (mode === "replay") setData(null);
      return;
    }
    if (replayDriverRef.current === driverNumber && replaySeriesRef.current.length > 0) return;

    let cancelled = false;
    setLoading(true);
    const dateTo = new Date(new Date(windowStart).getTime() + windowSeconds * 1000).toISOString();
    fetchCarData(session.session_key, { driverNumber, dateFrom: windowStart, dateTo })
      .then((samples) => {
        if (cancelled) return;
        replayDriverRef.current = driverNumber;
        replaySeriesRef.current = samples.slice().sort((a, b) => a.date.localeCompare(b.date));
      })
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [mode, session, driverNumber, windowStart, windowSeconds]);

  useEffect(() => {
    if (mode !== "replay" || !windowStart || replayDriverRef.current !== driverNumber) return;
    const series = replaySeriesRef.current;
    if (series.length === 0) return;
    const windowStartMs = new Date(windowStart).getTime();
    const targetMs = windowStartMs + virtualOffsetMs;
    let chosen = series[0];
    for (const s of series) {
      if (new Date(s.date).getTime() <= targetMs) chosen = s;
      else break;
    }
    setData(chosen);
  }, [mode, windowStart, virtualOffsetMs, driverNumber]);

  return { data, loading };
}
