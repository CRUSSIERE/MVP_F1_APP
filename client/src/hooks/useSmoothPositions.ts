import { useEffect, useRef, useState } from "react";
import type { Point } from "../lib/trackPath";

const SMOOTHING = 0.22;
const SNAP_THRESHOLD = 0.05;

/**
 * Animates towards `target` at 60fps regardless of how often `target`
 * itself changes (every ~3.5s in live mode, every ~200ms in replay). This
 * is what makes cars glide across the track instead of jumping between
 * polled/sampled positions.
 */
export function useSmoothPositions(target: Record<number, Point>): Record<number, Point> {
  const displayedRef = useRef<Record<number, Point>>({});
  const [smoothed, setSmoothed] = useState<Record<number, Point>>({});

  useEffect(() => {
    let raf: number;
    let cancelled = false;

    const animate = () => {
      if (cancelled) return;
      const displayed = displayedRef.current;
      const next: Record<number, Point> = {};
      let changed = false;

      for (const key of Object.keys(target)) {
        const driverNumber = Number(key);
        const t = target[driverNumber];
        const cur = displayed[driverNumber];
        if (!cur) {
          next[driverNumber] = t;
          changed = true;
          continue;
        }
        const dx = t.x - cur.x;
        const dy = t.y - cur.y;
        if (Math.abs(dx) < SNAP_THRESHOLD && Math.abs(dy) < SNAP_THRESHOLD) {
          next[driverNumber] = t;
        } else {
          next[driverNumber] = { x: cur.x + dx * SMOOTHING, y: cur.y + dy * SMOOTHING };
          changed = true;
        }
      }

      displayedRef.current = next;
      if (changed) setSmoothed(next);
      raf = requestAnimationFrame(animate);
    };

    raf = requestAnimationFrame(animate);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [target]);

  return smoothed;
}
