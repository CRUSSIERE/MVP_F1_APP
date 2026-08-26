import { useEffect, useMemo, useRef, useState } from "react";
import { fetchIntervals, fetchLocations } from "../api/openf1";
import { buildTrackPathFromLocations, type Point } from "../lib/trackPath";
import type { Interval, LocationPoint, Session } from "../types/openf1";
import type { EngineOutput } from "./useLiveEngine";

const WINDOW_SECONDS = 180;
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
  // series is sorted ascending; find the last sample <= offsetMs.
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
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(5);
  const [virtualOffsetMs, setVirtualOffsetMs] = useState(0);

  const windowStartMsRef = useRef(0);

  useEffect(() => {
    if (!session) return;
    setLocationSeries(new Map());
    setIntervalSeries(new Map());
    setTrackPath([]);
    setVirtualOffsetMs(0);
    setMessage(undefined);
    setWindowStart(session.date_start);
    windowStartMsRef.current = new Date(session.date_start).getTime();

    const dateFrom = session.date_start;
    const dateTo = new Date(windowStartMsRef.current + WINDOW_SECONDS * 1000).toISOString();

    Promise.all([
      fetchLocations(session.session_key, { dateFrom, dateTo }),
      fetchIntervals(session.session_key).catch(() => [] as Interval[]),
    ])
      .then(([locs, ivs]) => {
        if (locs.length === 0) {
          setMessage("Aucune donnée de position disponible pour cette fenêtre de replay.");
          return;
        }
        setTrackPath(buildTrackPathFromLocations(locs));
        setLocationSeries(toOffsetSeries(locs, windowStartMsRef.current));
        const windowIvs = ivs.filter((iv) => {
          const t = new Date(iv.date).getTime();
          return t >= windowStartMsRef.current && t <= windowStartMsRef.current + WINDOW_SECONDS * 1000;
        });
        setIntervalSeries(toOffsetSeries(windowIvs, windowStartMsRef.current));
      })
      .catch((err) => setMessage(err instanceof Error ? err.message : "Erreur de chargement du replay."));
  }, [session]);

  useEffect(() => {
    if (!playing || !windowStart) return;
    let lastTs = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      const deltaMs = (now - lastTs) * speed;
      lastTs = now;
      setVirtualOffsetMs((prev) => (prev + deltaMs) % (WINDOW_SECONDS * 1000));
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
      windowSeconds: WINDOW_SECONDS,
      virtualOffsetMs,
    },
  };
}
