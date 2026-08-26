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

// OpenF1's filter syntax puts comparison operators in the parameter *name*
// itself, e.g. "date>=2023-..." or "speed<315" — the operator's "="
// (for >=, <=) is part of the key, not a separate assignment. Building
// this with URLSearchParams/URL would percent-encode ">"/"<"/"=" inside
// the key AND insert its own "=" separator, producing "date>==..." or
// "date%3E%3D=...", both of which OpenF1 rejects with a 404. So the query
// string is built manually: a key already ending in an operator is
// concatenated directly with the (encoded) value, everything else gets a
// literal "=" separator.
const OPERATOR_SUFFIXES = [">=", "<=", ">", "<"];

function buildUrl(path: string, params: Record<string, string | undefined>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    const hasOperatorSuffix = OPERATOR_SUFFIXES.some((op) => key.endsWith(op));
    const separator = hasOperatorSuffix ? "" : "=";
    parts.push(`${key}${separator}${encodeURIComponent(value)}`);
  }
  const query = parts.length > 0 ? `?${parts.join("&")}` : "";
  return `${BASE_URL}/${path}${query}`;
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
