import { describe, expect, it } from "vitest";
import { assessExperiencePosture } from "@/lib/experience";

describe("Phase 40 experience governance", () => {
  it("keeps buyer checkout recoverable under offline payment and logistics pressure", () => {
    const posture = assessExperiencePosture({
      persona: "buyer",
      isOnline: false,
      realtimeState: "offline",
      paymentRecoverable: true,
      logisticsDelayed: true,
      aiAvailable: false,
      accessibilityMode: true,
    });

    expect(posture.tone).toBe("degraded");
    expect(posture.guarantees).toContain("Payment recovery");
    expect(posture.signals.map((signal) => signal.id)).toEqual(
      expect.arrayContaining(["offline-continuity", "realtime-fallback", "payment-recovery", "delivery-delay", "ai-explainable-fallback"]),
    );
    expect(posture.signals.every((signal) => signal.trustVisible)).toBe(true);
  });

  it("escalates operational overload without losing action guidance", () => {
    const posture = assessExperiencePosture({
      persona: "admin",
      realtimeState: "degraded",
      operationalPressure: 97,
      accessibilityMode: true,
    });

    expect(posture.tone).toBe("critical");
    expect(posture.signals.find((signal) => signal.id === "operational-pressure")?.userAction).toContain("priority queue");
    expect(posture.userMessage).toContain("recovery context");
  });
});
