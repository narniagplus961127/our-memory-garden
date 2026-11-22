import { createHash } from "node:crypto";
import { isIP } from "node:net";

// Defense in depth for a warm process. Distributed limits belong at the WAF;
// these counters deliberately do not add a database write per anonymous hit.
export class RequestRateLimiter {
  private buckets = new Map<string, { count: number; expires: number }>();
  private readonly maxKeys: number;
  private readonly now: () => number;

  constructor(maxKeys = 4096, now: () => number = Date.now) {
    this.maxKeys = maxKeys;
    this.now = now;
  }

  retryAfter(key: string, limit: number, window: number): number {
    const now = this.now();
    const bucket = this.buckets.get(key);
    if (bucket && bucket.expires > now) {
      if (bucket.count >= limit)
        return Math.max(1, Math.ceil((bucket.expires - now) / 1000));
      bucket.count++;
      return 0;
    }
    if (this.buckets.size >= this.maxKeys) {
      for (const [expiredKey, entry] of this.buckets) {
        if (entry.expires <= now) this.buckets.delete(expiredKey);
      }
      // Do not evict active limits: rotating identifiers must not reset them.
      if (!this.buckets.has(key) && this.buckets.size >= this.maxKeys)
        return Math.max(1, Math.ceil(window / 1000));
    }
    this.buckets.set(key, { count: 1, expires: now + window });
    return 0;
  }
}

export function rateLimitClient(
  headers: Headers,
  onVercel = process.env.VERCEL === "1",
) {
  // Only trust the hosting platform's overwritten address header. A supplied
  // X-Forwarded-For, cookie or user agent must not let a caller rotate counters.
  const address = onVercel
    ? headers.get("x-vercel-forwarded-for")?.trim()
    : null;
  return address && isIP(address)
    ? createHash("sha256").update(address).digest("hex")
    : "shared";
}

const limiter = new RequestRateLimiter();
export function limitRequest(request: Request, scope: string, limit: number) {
  const retry = limiter.retryAfter(
    scope + ":" + rateLimitClient(request.headers),
    limit,
    60_000,
  );
  return retry
    ? Response.json(
        {
          message: "Too many requests. Please wait a moment and try again.",
          error: "Too many requests. Please wait a moment and try again.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(retry),
            "Cache-Control": "private, no-store",
          },
        },
      )
    : null;
}
