import { useEffect, useRef, useState } from "react";
import { fetchIntervals, fetchLocations } from "../api/openf1";
import { buildTrackPathFromLocations, type Point } from "../lib/trackPath";
import type { Interval, Session } from "../types/openf1";

const POLL_MS = 3500;
const LOOKBACK_MS = 6000;

export interface EngineOutput {
  trackPath: Point[];
  positions: Record<number, Point>;
  intervals: Record<number, Interval>;
  ready: boolean;
  stale: boolean;
  message?: string;
}

export function useLiveEngine(session: Session | null): EngineOutput {
  const [trackPath, setTrackPath] = useState<Point[]>([]);
  const [positions, setPositions] = useState<Record<number, Point>>({});
  const [intervals, setIntervals] = useState<Record<number, Interval>>({});
  const [message, setMessage] = useState<string | undefined>();
  const emptyPollsRef = useRef(0);

  // Seed the track outline once from an early window of the session.
  useEffect(() => {
    if (!session) return;
    setTrackPath([]);
    setPositions({});
    setIntervals({});
    emptyPollsRef.current = 0;
    setMessage(undefined);

    const seedEnd = new Date(new Date(session.date_start).getTime() + 240_000).toISOString();
    fetchLocations(session.session_key, { dateFrom: session.date_start, dateTo: seedEnd })
      .then((pts) => setTrackPath(buildTrackPathFromLocations(pts)))
      .catch(() => undefined);
  }, [session]);

  // Poll recent positions + intervals.
  useEffect(() => {
    if (!session) return;
    let cancelled = false;

    async function poll() {
      if (!session) return;
      const since = new Date(Date.now() - LOOKBACK_MS).toISOString();
      try {
        const [locs, ivs] = await Promise.all([
          fetchLocations(session.session_key, { dateFrom: since }),
          fetchIntervals(session.session_key),
        ]);
        if (cancelled) return;

        if (locs.length === 0) {
          emptyPollsRef.current += 1;
          if (emptyPollsRef.current >= 3) {
            setMessage("Aucune nouvelle donnée reçue : la session est probablement terminée.");
          }
        } else {
          emptyPollsRef.current = 0;
          setMessage(undefined);
          setPositions((prev) => {
            const next = { ...prev };
            const latestByDriver = new Map<number, (typeof locs)[number]>();
            for (const p of locs) {
              const cur = latestByDriver.get(p.driver_number);
              if (!cur || p.date > cur.date) latestByDriver.set(p.driver_number, p);
            }
            for (const [num, p] of latestByDriver) next[num] = { x: p.x, y: p.y };
            return next;
          });
        }

        const latestIvByDriver = new Map<number, Interval>();
        for (const iv of ivs) {
          const cur = latestIvByDriver.get(iv.driver_number);
          if (!cur || iv.date > cur.date) latestIvByDriver.set(iv.driver_number, iv);
        }
        if (latestIvByDriver.size > 0) {
          setIntervals(Object.fromEntries(latestIvByDriver));
        }
      } catch (err) {
        if (!cancelled) setMessage(err instanceof Error ? err.message : "Erreur de récupération des données live.");
      }
    }

    poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [session]);

  return {
    trackPath,
    positions,
    intervals,
    ready: trackPath.length > 0,
    stale: Boolean(message),
    message,
  };
}
