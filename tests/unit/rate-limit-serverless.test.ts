import { describe, expect, it } from "vitest";
import { checkRateLimit, clearRateLimitBucketsForTests, securityRateLimits } from "@/lib/security/rate-limit";

// Stage 1.8 evidence: characterize the in-memory limiter's serverless behavior so the
// certification decision is backed by an executable demonstration, not just code reading.
describe("rate limiting — serverless behavior characterization", () => {
  it("enforces the configured limit within a single instance/window", () => {
    clearRateLimitBucketsForTests();
    const key = `auth:1.2.3.4:${Math.random()}`;
    const policy = securityRateLimits.auth; // limit 10 / 60s
    let lastAllowed = true;
    for (let i = 0; i < policy.limit; i += 1) {
      lastAllowed = checkRateLimit(key, policy).allowed;
      expect(lastAllowed).toBe(true);
    }
    // The (limit+1)-th request in the same window is blocked.
    expect(checkRateLimit(key, policy).allowed).toBe(false);
  });

  it("DEMONSTRATES the per-instance limitation: a fresh instance (cleared buckets) resets the limit", () => {
    const key = `payment:9.9.9.9:${Math.random()}`;
    const policy = securityRateLimits.payment;
    for (let i = 0; i < policy.limit; i += 1) checkRateLimit(key, policy);
    expect(checkRateLimit(key, policy).allowed).toBe(false);

    // Simulate the request being routed to a different serverless instance
    // (or the same instance after a cold start) — its in-memory Map is empty.
    clearRateLimitBucketsForTests();
    expect(checkRateLimit(key, policy).allowed).toBe(true);
  });

  it("documents every sensitive route class has a policy", () => {
    expect(Object.keys(securityRateLimits)).toEqual(
      expect.arrayContaining(["auth", "checkout", "payment", "webhook", "adminMutation"]),
    );
  });
});
