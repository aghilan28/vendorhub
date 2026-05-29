type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitEntry>();

export type RateLimitPolicy = {
  limit: number;
  windowMs: number;
};

export const securityRateLimits = {
  auth: { limit: 10, windowMs: 60_000 },
  checkout: { limit: 8, windowMs: 60_000 },
  payment: { limit: 12, windowMs: 60_000 },
  webhook: { limit: 120, windowMs: 60_000 },
  aiSearch: { limit: 30, windowMs: 60_000 },
  sellerMutation: { limit: 40, windowMs: 60_000 },
  adminMutation: { limit: 20, windowMs: 60_000 },
  logistics: { limit: 50, windowMs: 60_000 },
  upload: { limit: 20, windowMs: 60_000 },
  realtime: { limit: 120, windowMs: 60_000 },
} as const satisfies Record<string, RateLimitPolicy>;

export function checkRateLimit(key: string, policy: RateLimitPolicy) {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + policy.windowMs });
    return { allowed: true, remaining: policy.limit - 1, resetAt: now + policy.windowMs };
  }

  if (existing.count >= policy.limit) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return { allowed: true, remaining: policy.limit - existing.count, resetAt: existing.resetAt };
}

export function clearRateLimitBucketsForTests() {
  buckets.clear();
}


// ---------------------------------------------------------------------------
// Phase B: distributed rate limiting.
// `checkRateLimit` above is per-instance (in-memory Map) and is NOT correct
// across multiple serverless instances. `checkRateLimitDistributed` uses Redis
// when RUNTIME_REDIS_ENABLED=true, and transparently falls back to the
// in-memory limiter when Redis is disabled or unreachable. The sync API is
// retained for callers that cannot await.
// ---------------------------------------------------------------------------

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  backend: "redis" | "memory";
};

export async function checkRateLimitDistributed(key: string, policy: RateLimitPolicy): Promise<RateLimitResult> {
  try {
    const { redisRuntime } = await import("@/lib/runtime/redis");
    if (redisRuntime.isEnabled()) {
      const windowed = await redisRuntime.incrementWindow(`ratelimit:${key}`, policy.windowMs);
      if (windowed) {
        const allowed = windowed.count <= policy.limit;
        return {
          allowed,
          remaining: Math.max(0, policy.limit - windowed.count),
          resetAt: Date.now() + windowed.ttlMs,
          backend: "redis",
        };
      }
    }
  } catch {
    // fall through to in-memory
  }

  const fallback = checkRateLimit(key, policy);
  return { ...fallback, backend: "memory" };
}
