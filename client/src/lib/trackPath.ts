import type { LocationPoint } from "../types/openf1";

export interface Point {
  x: number;
  y: number;
}

/**
 * Build a circuit outline from a batch of location samples: group by
 * driver, keep the driver with the most points (the "densest" trace),
 * and return its points ordered by time. Since GPS samples are recorded
 * sequentially along the track, connecting them in order draws the
 * circuit shape.
 */
export function buildTrackPathFromLocations(points: LocationPoint[]): Point[] {
  const byDriver = new Map<number, LocationPoint[]>();
  for (const p of points) {
    const list = byDriver.get(p.driver_number);
    if (list) list.push(p);
    else byDriver.set(p.driver_number, [p]);
  }

  let densest: LocationPoint[] = [];
  for (const list of byDriver.values()) {
    if (list.length > densest.length) densest = list;
  }

  return densest
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((p) => ({ x: p.x, y: p.y }));
}

export interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export function computeBounds(points: Point[]): Bounds | null {
  if (points.length === 0) return null;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const { x, y } of points) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return { minX, maxX, minY, maxY };
}
