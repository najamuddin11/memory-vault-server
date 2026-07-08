// Per-IP limiter specifically for the sendMessage mutation.
//
// express-rate-limit (wired up in index.ts) protects the /graphql route as
// a whole. But GraphQL only has one HTTP route, so a route-level limiter
// can't tell "someone spamming the contact form" apart from "someone
// browsing the portfolio data" - both hit POST /graphql. This gives the
// contact mutation its own, stricter budget.
//
// In-memory is fine for a single-instance personal site. If you ever run
// multiple server instances behind a load balancer, swap this for a
// Redis-backed counter so limits are shared across instances.

const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_PER_WINDOW = 5;

const hits = new Map<string, number[]>();

// Periodically clear out stale entries so this map doesn't grow forever.
setInterval(
  () => {
    const cutoff = Date.now() - WINDOW_MS;
    for (const [ip, timestamps] of hits.entries()) {
      const fresh = timestamps.filter((t) => t > cutoff);
      if (fresh.length === 0) hits.delete(ip);
      else hits.set(ip, fresh);
    }
  },
  10 * 60 * 1000,
).unref();

export function isContactRateLimited(ip: string): boolean {
  const now = Date.now();
  const cutoff = now - WINDOW_MS;
  const timestamps = (hits.get(ip) ?? []).filter((t) => t > cutoff);

  if (timestamps.length >= MAX_PER_WINDOW) {
    hits.set(ip, timestamps);
    return true;
  }

  timestamps.push(now);
  hits.set(ip, timestamps);
  return false;
}
