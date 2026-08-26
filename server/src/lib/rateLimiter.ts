// Simple sliding-window token bucket protecting the outbound calls this
// server makes to the OpenF1 API (documented limit: 30 requests / 10s).
// All clients of this server share one bucket since they all funnel
// through this single process's outbound IP.

const WINDOW_MS = 10_000;
const MAX_REQUESTS = 30;

const timestamps: number[] = [];
let queue: Promise<void> = Promise.resolve();

function pruneOld(): void {
  const cutoff = Date.now() - WINDOW_MS;
  while (timestamps.length > 0 && timestamps[0] < cutoff) {
    timestamps.shift();
  }
}

async function acquireSlot(): Promise<void> {
  pruneOld();
  while (timestamps.length >= MAX_REQUESTS) {
    const waitMs = timestamps[0] + WINDOW_MS - Date.now() + 5;
    if (waitMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
    pruneOld();
  }
  timestamps.push(Date.now());
}

// Serialize acquisition so concurrent callers don't all pass the check
// simultaneously and overshoot the bucket.
export function throttle<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(() => acquireSlot());
  queue = run.catch(() => undefined);
  return run.then(fn);
}
