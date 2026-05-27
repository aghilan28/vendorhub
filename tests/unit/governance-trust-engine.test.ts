import { describe, expect, it } from "vitest";
import { calculateOperationalTrust, detectRiskSignals, governancePressure, isReversibleEnforcement, recommendedEnforcement } from "@/features/governance/trust-engine";
import { simulateGovernanceReplay, simulateModerationPressure } from "@/tests/utils/failure-simulator";

describe("governance trust engine", () => {
  it("keeps trust scoring explainable across operational factors", () => {
    const result = calculateOperationalTrust({
      orders: 40,
      cancellations: 2,
      refunds: 3,
      disputes: 1,
      failedDeliveries: 1,
      openFlags: 0,
      activeEnforcements: 0,
      failedPayouts: 0,
      verificationState: "VERIFIED",
    });

    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.level).toBe("trusted");
    expect(result.factors.map((factor) => factor.label)).toEqual(expect.arrayContaining(["Fulfillment reliability", "Refund pattern", "KYC verification"]));
  });

  it("detects review-first fraud and abuse signals without auto-ban semantics", () => {
    const signals = detectRiskSignals({
      orders: 10,
      cancellations: 3,
      refunds: 4,
      disputes: 0,
      failedDeliveries: 3,
      openFlags: 0,
      activeEnforcements: 0,
      failedPayouts: 1,
      verificationState: "UNDER_REVIEW",
      suspiciousOrderBursts: 3,
      reviewAnomalies: 2,
    });

    expect(signals.map((signal) => signal.type)).toEqual(expect.arrayContaining(["REFUND_ABUSE", "CANCELLATION_SPIKE", "DELIVERY_FAILURE_SPIKE", "PAYOUT_ABUSE", "KYC_INCOMPLETE", "ORDER_BURST", "REVIEW_MANIPULATION"]));
    expect(recommendedEnforcement(signals.find((signal) => signal.type === "PAYOUT_ABUSE")!)).toBe("PAYOUT_HOLD");
    expect(recommendedEnforcement(signals.find((signal) => signal.type === "CANCELLATION_SPIKE")!)).toBe("SELLER_THROTTLE");
  });

  it("marks enforcement actions reversible unless they are manual review markers", () => {
    expect(isReversibleEnforcement("PAYOUT_HOLD")).toBe(true);
    expect(isReversibleEnforcement("SELLER_SUSPENSION")).toBe(true);
    expect(isReversibleEnforcement("MANUAL_REVIEW")).toBe(false);
  });

  it("keeps KYC escalation review-first instead of automatic suspension", () => {
    const signal = detectRiskSignals({
      orders: 4,
      cancellations: 0,
      refunds: 0,
      disputes: 0,
      failedDeliveries: 0,
      openFlags: 0,
      activeEnforcements: 0,
      failedPayouts: 0,
      verificationState: "SUSPENDED",
    }).find((item) => item.type === "KYC_INCOMPLETE");

    expect(signal?.severity).toBe("critical");
    expect(recommendedEnforcement(signal!)).toBe("VERIFICATION_REQUIRED");
  });

  it("surfaces governance saturation without irreversible enforcement pressure", () => {
    const pressure = governancePressure({
      openCases: 18,
      overdueCases: 4,
      openDisputes: 12,
      overdueDisputes: 3,
      highRiskSignals: 8,
      activeEnforcements: 5,
      recoveryBacklog: 20,
    });
    const moderation = simulateModerationPressure({ openCases: 35, disputes: 12, escalations: 8, reviewers: 3 });
    const replay = simulateGovernanceReplay([
      { fingerprint: "risk:seller-1:refund", vendorId: "seller-1", eventType: "REFUND_ABUSE" },
      { fingerprint: "risk:seller-1:refund", vendorId: "seller-1", eventType: "REFUND_ABUSE" },
      { fingerprint: "risk:seller-2:payout", vendorId: "seller-2", eventType: "PAYOUT_ABUSE" },
    ]);

    expect(pressure.alertLevel).toBe("critical");
    expect(pressure.shouldThrottleEnforcement).toBe(false);
    expect(moderation.overloaded).toBe(true);
    expect(replay.replayCount).toBe(1);
  });
});
