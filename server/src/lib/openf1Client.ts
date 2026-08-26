import { cacheGet, cacheSet } from "./cache.js";
import { throttle } from "./rateLimiter.js";

const BASE_URL = "https://api.openf1.org/v1";

export class UpstreamError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function buildUrl(path: string, params: Record<string, string | undefined>): string {
  const url = new URL(`${BASE_URL}/${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, value);
    }
  }
  return url.toString();
}

/**
 * Fetch a path from OpenF1, going through the shared cache and the
 * outbound rate limiter. `ttlMs` controls how long a response is reused.
 */
export async function fetchOpenF1<T>(
  path: string,
  params: Record<string, string | undefined>,
  ttlMs: number
): Promise<T> {
  const url = buildUrl(path, params);

  const cached = cacheGet<T>(url);
  if (cached !== undefined) return cached;

  const data = await throttle(async () => {
    const res = await fetch(url);
    if (!res.ok) {
      throw new UpstreamError(`OpenF1 request failed: ${res.status} ${res.statusText}`, res.status);
    }
    return (await res.json()) as T;
  });

  cacheSet(url, data, ttlMs);
  return data;
}
