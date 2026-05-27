import { describe, expect, it, beforeEach, vi } from "vitest";
import { checkRateLimit, clearRateLimitBucketsForTests } from "@/lib/security/rate-limit";
import { checkReplayKey, clearReplayKeysForTests, hashRequestBody, validateWebhookTimestamp } from "@/lib/security/replay";
import { redactSecurityMetadata } from "@/lib/security/audit";
import { assertSafeUpload } from "@/lib/security/upload";
import { AppError } from "@/lib/errors";

describe("phase 25 security hardening primitives", () => {
  beforeEach(() => {
    clearRateLimitBucketsForTests();
    clearReplayKeysForTests();
    vi.setSystemTime(new Date("2026-05-26T12:00:00.000Z"));
  });

  it("rate limits mutation buckets without blocking the first valid request", () => {
    expect(checkRateLimit("seller:1", { limit: 2, windowMs: 60_000 })).toMatchObject({ allowed: true, remaining: 1 });
    expect(checkRateLimit("seller:1", { limit: 2, windowMs: 60_000 })).toMatchObject({ allowed: true, remaining: 0 });
    expect(checkRateLimit("seller:1", { limit: 2, windowMs: 60_000 })).toMatchObject({ allowed: false, remaining: 0 });
  });

  it("allows replay keys once and rejects duplicate mutation fingerprints", () => {
    const key = hashRequestBody(JSON.stringify({ event: "payment.captured", id: "evt_123" }));
    expect(checkReplayKey(key).allowed).toBe(true);
    expect(checkReplayKey(key).allowed).toBe(false);
  });

  it("validates webhook timestamps within tolerance", () => {
    expect(validateWebhookTimestamp("1779796800").valid).toBe(true);
    expect(validateWebhookTimestamp("1779795800").valid).toBe(false);
    expect(validateWebhookTimestamp(null).valid).toBe(false);
  });

  it("redacts sensitive security audit metadata before persistence", () => {
    const redacted = redactSecurityMetadata({
      route: "payments",
      authorization: "Bearer secret",
      nested: { phone: "+91 99999 99999", status: "FAILED" },
    });

    expect(redacted.authorization).toBe("[redacted]");
    expect((redacted.nested as Record<string, unknown>).phone).toBe("[redacted]");
    expect((redacted.nested as Record<string, unknown>).status).toBe("FAILED");
  });

  it("enforces upload MIME, size, and filename boundaries", () => {
    expect(() => assertSafeUpload({ bucket: "product-images", mimeType: "image/webp", sizeBytes: 1024, filename: "product.webp" })).not.toThrow();
    expect(() => assertSafeUpload({ bucket: "product-images", mimeType: "application/javascript", sizeBytes: 1024, filename: "x.js" })).toThrow(AppError);
    expect(() => assertSafeUpload({ bucket: "kyc-documents", mimeType: "application/pdf", sizeBytes: 8 * 1024 * 1024, filename: "kyc.pdf" })).toThrow(AppError);
    expect(() => assertSafeUpload({ bucket: "vendor-assets", mimeType: "image/png", sizeBytes: 1024, filename: "../logo.png" })).toThrow(AppError);
  });
});
