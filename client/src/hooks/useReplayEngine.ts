import { useEffect, useMemo, useRef, useState } from "react";
import { fetchIntervals, fetchLaps, fetchLocations } from "../api/openf1";
import { buildTrackPathFromLocations, type Point } from "../lib/trackPath";
import type { Interval, Lap, LocationPoint, Session } from "../types/openf1";
import type { EngineOutput } from "./useLiveEngine";

// Fallback window when no usable lap timing is found (e.g. very early in a
// session before any lap has completed).
const FALLBACK_WINDOW_SECONDS = 180;
const TICK_MS = 200;

interface TimedSample<T> {
  offsetMs: number;
  value: T;
}

function toOffsetSeries<T extends { date: string; driver_number: number }>(
  points: T[],
  windowStartMs: number
): Map<number, TimedSample<T>[]> {
  const byDriver = new Map<number, TimedSample<T>[]>();
  for (const p of points) {
    const offsetMs = new Date(p.date).getTime() - windowStartMs;
    const list = byDriver.get(p.driver_number);
    const sample = { offsetMs, value: p };
    if (list) list.push(sample);
    else byDriver.set(p.driver_number, [sample]);
  }
  for (const list of byDriver.values()) list.sort((a, b) => a.offsetMs - b.offsetMs);
  return byDriver;
}

function sampleAt<T>(series: TimedSample<T>[] | undefined, offsetMs: number): T | undefined {
  if (!series || series.length === 0) return undefined;
  let lo = 0;
  let hi = series.length - 1;
  if (offsetMs < series[0].offsetMs) return series[0].value;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (series[mid].offsetMs <= offsetMs) lo = mid;
    else hi = mid - 1;
  }
  return series[lo].value;
}

/**
 * Find a window of time that is very likely to have dense GPS coverage: a
 * completed racing lap (not an out-lap) from the middle of the session,
 * rather than guessing from the session's scheduled start (which can land
 * on the grid before cars start moving).
 */
async function resolveWindow(session: Session): Promise<{ start: string; end: string }> {
  try {
    const laps: Lap[] = await fetchLaps(session.session_key);
    const candidates = laps
      .filter((l) => l.lap_duration && l.lap_duration > 30 && !l.is_pit_out_lap && l.lap_number >= 2)
      .sort((a, b) => a.date_start.localeCompare(b.date_start));
    if (candidates.length > 0) {
      const lap = candidates[Math.floor(candidates.length / 2)];
      const start = lap.date_start;
      const end = new Date(new Date(start).getTime() + (lap.lap_duration! + 8) * 1000).toISOString();
      return { start, end };
    }
  } catch {
    // fall through to the fixed fallback window below
  }
  const start = session.date_start;
  const end = new Date(new Date(start).getTime() + FALLBACK_WINDOW_SECONDS * 1000).toISOString();
  return { start, end };
}

export interface ReplayControls {
  playing: boolean;
  togglePlaying: () => void;
  speed: number;
  setSpeed: (speed: number) => void;
  windowStart: string | null;
  windowSeconds: number;
  virtualOffsetMs: number;
}

export function useReplayEngine(session: Session | null): EngineOutput & { controls: ReplayControls } {
  const [locationSeries, setLocationSeries] = useState<Map<number, TimedSample<LocationPoint>[]>>(new Map());
  const [intervalSeries, setIntervalSeries] = useState<Map<number, TimedSample<Interval>[]>>(new Map());
  const [trackPath, setTrackPath] = useState<Point[]>([]);
  const [message, setMessage] = useState<string | undefined>();
  const [windowStart, setWindowStart] = useState<string | null>(null);
  const [windowSeconds, setWindowSeconds] = useState(FALLBACK_WINDOW_SECONDS);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(5);
  const [virtualOffsetMs, setVirtualOffsetMs] = useState(0);

  const windowStartMsRef = useRef(0);
  const windowSecondsRef = useRef(FALLBACK_WINDOW_SECONDS);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    setLocationSeries(new Map());
    setIntervalSeries(new Map());
    setTrackPath([]);
    setVirtualOffsetMs(0);
    setMessage(undefined);
    setWindowStart(null);

    resolveWindow(session)
      .then(async ({ start, end }) => {
        if (cancelled) return;
        const startMs = new Date(start).getTime();
        const seconds = Math.max(20, (new Date(end).getTime() - startMs) / 1000);
        windowStartMsRef.current = startMs;
        windowSecondsRef.current = seconds;
        setWindowStart(start);
        setWindowSeconds(seconds);

        const [locs, ivs] = await Promise.all([
          fetchLocations(session.session_key, { dateFrom: start, dateTo: end }),
          fetchIntervals(session.session_key).catch(() => [] as Interval[]),
        ]);
        if (cancelled) return;

        if (locs.length === 0) {
          setMessage("Aucune donnée de position disponible pour cette session (essayez une autre course).");
          return;
        }
        setTrackPath(buildTrackPathFromLocations(locs));
        setLocationSeries(toOffsetSeries(locs, startMs));
        const windowIvs = ivs.filter((iv) => {
          const t = new Date(iv.date).getTime();
          return t >= startMs && t <= startMs + seconds * 1000;
        });
        setIntervalSeries(toOffsetSeries(windowIvs, startMs));
      })
      .catch((err) => {
        if (!cancelled) setMessage(err instanceof Error ? err.message : "Erreur de chargement du replay.");
      });

    return () => {
      cancelled = true;
    };
  }, [session]);

  useEffect(() => {
    if (!playing || !windowStart) return;
    let lastTs = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      const deltaMs = (now - lastTs) * speed;
      lastTs = now;
      setVirtualOffsetMs((prev) => (prev + deltaMs) % (windowSecondsRef.current * 1000));
    }, TICK_MS);
    return () => clearInterval(id);
  }, [playing, speed, windowStart]);

  const positions = useMemo(() => {
    const result: Record<number, Point> = {};
    for (const [driverNumber, series] of locationSeries) {
      const sample = sampleAt(series, virtualOffsetMs);
      if (sample) result[driverNumber] = { x: sample.x, y: sample.y };
    }
    return result;
  }, [locationSeries, virtualOffsetMs]);

  const intervals = useMemo(() => {
    const result: Record<number, Interval> = {};
    for (const [driverNumber, series] of intervalSeries) {
      const sample = sampleAt(series, virtualOffsetMs);
      if (sample) result[driverNumber] = sample;
    }
    return result;
  }, [intervalSeries, virtualOffsetMs]);

  return {
    trackPath,
    positions,
    intervals,
    ready: trackPath.length > 0,
    stale: false,
    message,
    controls: {
      playing,
      togglePlaying: () => setPlaying((p) => !p),
      speed,
      setSpeed,
      windowStart,
      windowSeconds,
      virtualOffsetMs,
    },
  };
}
