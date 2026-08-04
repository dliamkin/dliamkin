/**
 * Simple in-memory IP rate limiter: 10 simulations per hour per IP.
 * Deliberately framework-free so it can be swapped for API Gateway
 * throttling when the handler is lifted into a Lambda.
 */

const WINDOW_MS = 60 * 60 * 1000
const MAX_PER_WINDOW = 10

const hits = new Map<string, number[]>()

export interface RateLimitDecision {
  allowed: boolean
  retryAfterSeconds: number
  remaining: number
}

export function checkRateLimit(ip: string, now: number = Date.now()): RateLimitDecision {
  const cutoff = now - WINDOW_MS
  const recent = (hits.get(ip) ?? []).filter((t) => t > cutoff)

  if (recent.length >= MAX_PER_WINDOW) {
    const oldest = recent[0] ?? now
    hits.set(ip, recent)
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((oldest + WINDOW_MS - now) / 1000)),
      remaining: 0,
    }
  }

  recent.push(now)
  hits.set(ip, recent)
  return { allowed: true, retryAfterSeconds: 0, remaining: MAX_PER_WINDOW - recent.length }
}

/** Occasional sweep so the map doesn't grow unbounded on long-lived servers. */
export function pruneRateLimiter(now: number = Date.now()): void {
  const cutoff = now - WINDOW_MS
  for (const [ip, times] of hits) {
    const recent = times.filter((t) => t > cutoff)
    if (recent.length === 0) hits.delete(ip)
    else hits.set(ip, recent)
  }
}
