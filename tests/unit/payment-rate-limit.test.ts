import { describe, expect, it, vi } from "vitest";
import { checkPaymentRateLimit } from "@/lib/payments/rate-limit";

describe("payment rate-limit reliability", () => {
  it("blocks repeated payment attempts within the same window", () => {
    vi.setSystemTime(new Date("2026-05-26T12:00:00.000Z"));
    const key = `payment-test-${crypto.randomUUID()}`;

    expect(checkPaymentRateLimit(key, 2, 60_000)).toMatchObject({ allowed: true, remaining: 1 });
    expect(checkPaymentRateLimit(key, 2, 60_000)).toMatchObject({ allowed: true, remaining: 0 });
    expect(checkPaymentRateLimit(key, 2, 60_000)).toMatchObject({ allowed: false, remaining: 0 });
  });

  it("recovers after the configured rate-limit window", () => {
    vi.setSystemTime(new Date("2026-05-26T12:00:00.000Z"));
    const key = `payment-window-${crypto.randomUUID()}`;

    expect(checkPaymentRateLimit(key, 1, 1_000).allowed).toBe(true);
    expect(checkPaymentRateLimit(key, 1, 1_000).allowed).toBe(false);

    vi.setSystemTime(new Date("2026-05-26T12:00:02.000Z"));
    expect(checkPaymentRateLimit(key, 1, 1_000)).toMatchObject({ allowed: true, remaining: 0 });
  });
});
