import { describe, expect, it, vi } from "vitest";
import { evaluateOperationalAlerts } from "@/lib/observability/alerts";
import { recordOperationalEvent, sanitizeMetadata } from "@/lib/production/observability";

const quietSignals = {
  checkoutFailureRate: 0,
  paymentMismatchCount: 0,
  webhookRetryCount: 0,
  openIntegrityAlerts: 0,
  realtimeReconnects: 0,
  activeRealtimeChannels: 0,
  aiFallbackRate: 0,
  staleEmbeddingCount: 0,
  dbFailedWrites: 0,
  authFailureCount: 0,
  refundOpenCount: 0,
  deliveryDelayedCount: 0,
  moderationBacklog: 0,
};

describe("observability reliability", () => {
  it("redacts secrets while preserving useful diagnostic metadata", () => {
    expect(
      sanitizeMetadata({
        paymentSignature: "super-secret",
        token: "private",
        transactionId: "txn-1",
        latencyMs: 42,
      }),
    ).toEqual({
      paymentSignature: "[redacted]",
      token: "[redacted]",
      transactionId: "txn-1",
      latencyMs: 42,
    });
  });

  it("emits actionable alerts only when thresholds are crossed", () => {
    expect(evaluateOperationalAlerts(quietSignals)[0].id).toBe("platform-observable");

    const alerts = evaluateOperationalAlerts({
      ...quietSignals,
      checkoutFailureRate: 0.16,
      paymentMismatchCount: 3,
      aiFallbackRate: 0.5,
      realtimeReconnects: 30,
    });

    expect(alerts.map((alert) => alert.id)).toEqual(expect.arrayContaining(["checkout-failure-spike", "payment-integrity-risk", "ai-degradation", "realtime-storm-risk"]));
    expect(alerts.filter((alert) => alert.severity === "critical").length).toBeGreaterThanOrEqual(3);
  });

  it("never throws when telemetry emission itself fails", () => {
    vi.spyOn(console, "error").mockImplementation(() => {
      throw new Error("console unavailable");
    });

    expect(() => recordOperationalEvent("error", "test.telemetry.failure", { token: "secret" }, { domain: "system", error: new Error("boom") })).not.toThrow();
  });
});
