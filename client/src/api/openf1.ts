import type { CarData, Driver, Interval, Lap, LocationPoint, Meeting, Session } from "../types/openf1";

const API_BASE = "/api";

async function getJson<T>(path: string, params: Record<string, string | undefined>): Promise<T> {
  const url = new URL(path, window.location.origin);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") url.searchParams.set(key, value);
  }
  const res = await fetch(url.pathname + url.search);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `Request failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

export function fetchLatestSession(): Promise<Session[]> {
  return getJson<Session[]>(`${API_BASE}/sessions`, { session_key: "latest" });
}

export function fetchSessions(params: { year?: string; country_name?: string; meeting_key?: string }): Promise<Session[]> {
  return getJson<Session[]>(`${API_BASE}/sessions`, params);
}

export function fetchMeetings(year: string): Promise<Meeting[]> {
  return getJson<Meeting[]>(`${API_BASE}/meetings`, { year });
}

export function fetchDrivers(sessionKey: number): Promise<Driver[]> {
  return getJson<Driver[]>(`${API_BASE}/drivers`, { session_key: String(sessionKey) });
}

export function fetchLocations(
  sessionKey: number,
  opts: { driverNumber?: number; dateFrom?: string; dateTo?: string } = {}
): Promise<LocationPoint[]> {
  const params: Record<string, string | undefined> = { session_key: String(sessionKey) };
  if (opts.driverNumber !== undefined) params.driver_number = String(opts.driverNumber);
  if (opts.dateFrom) params["date>="] = opts.dateFrom;
  if (opts.dateTo) params["date<="] = opts.dateTo;
  return getJson<LocationPoint[]>(`${API_BASE}/location`, params);
}

export function fetchCarData(
  sessionKey: number,
  opts: { driverNumber?: number; dateFrom?: string; dateTo?: string } = {}
): Promise<CarData[]> {
  const params: Record<string, string | undefined> = { session_key: String(sessionKey) };
  if (opts.driverNumber !== undefined) params.driver_number = String(opts.driverNumber);
  if (opts.dateFrom) params["date>="] = opts.dateFrom;
  if (opts.dateTo) params["date<="] = opts.dateTo;
  return getJson<CarData[]>(`${API_BASE}/car_data`, params);
}

export function fetchIntervals(sessionKey: number): Promise<Interval[]> {
  return getJson<Interval[]>(`${API_BASE}/intervals`, { session_key: String(sessionKey) });
}

export function fetchLaps(sessionKey: number, driverNumber?: number): Promise<Lap[]> {
  const params: Record<string, string | undefined> = { session_key: String(sessionKey) };
  if (driverNumber !== undefined) params.driver_number = String(driverNumber);
  return getJson<Lap[]>(`${API_BASE}/laps`, params);
}
