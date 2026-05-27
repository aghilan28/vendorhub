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
