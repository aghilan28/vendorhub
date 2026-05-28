import { describe, expect, it, vi } from "vitest";
import { deliveryFeasibility, estimateDeliveryEta, estimateHyperlocalDistanceKm } from "@/features/logistics/eta";
import { advanceDeliveryLifecycle, canStartDispatch, deriveDeliverySignals, scheduleDeliveryRecovery } from "@/features/logistics/orchestrator";
import { canTransitionDelivery, orderStatusForDelivery } from "@/features/logistics/status-engine";
import { chooseLogisticsProvider, evaluateLogisticsBackpressure, normalizeProviderStatus, updateProviderHealthAfterAttempt } from "@/features/logistics/providers";
import { assessDeliverySla } from "@/features/logistics/sla";
import { simulateDispatchBacklog, simulateTrackingReplay } from "@/tests/utils/failure-simulator";
import { OrderStatus, PaymentStatus } from "@/types";
import type { Delivery } from "@/features/logistics/types";

const deliveryFixture = (index: number, overrides: Partial<Delivery> = {}): Delivery => ({
  id: `test-delivery-${index}`,
  orderId: `test-order-${index}`,
  orderCode: `TEST-${index}`,
  buyerName: "Test Buyer",
  buyerPhone: "+91 90000 00000",
  vendorId: "test-vendor",
  vendorName: "Test Seller",
  deliveryAddress: "Test Address, Chennai",
  mode: "seller_self",
  status: "IN_TRANSIT",
  partner: { id: "partner-self", name: "Seller self-delivery", mode: "seller_self", serviceLevel: "hyperlocal", rating: 4.7, integrationStatus: "manual" },
  distanceKm: 3.2,
  prepMinutes: 18,
  etaMinutes: 24,
  etaWindow: "24-32 min",
  etaConfidence: "high",
  promisedAt: "2026-05-26T12:30:00.000Z",
  createdAt: "2026-05-26T10:00:00.000Z",
  updatedAt: "2026-05-26T10:30:00.000Z",
  shipment: { provider: "seller_self", syncStatus: "not_required" },
  events: [],
  etaLogs: [],
  verification: { state: "pending" },
  ...overrides,
});

const seedDeliveries = [
  deliveryFixture(1),
  deliveryFixture(2, { status: "DELIVERY_PENDING", etaConfidence: "medium" }),
  deliveryFixture(3, {
    status: "FAILED",
    etaConfidence: "low",
    recovery: { reason: "unreachable_customer", action: "customer_contact", runAfter: "2026-05-26T09:13:00.000Z", attempts: 1, status: "pending" },
  }),
];

describe("phase 24 delivery execution", () => {
  it("enforces deterministic canonical shipment transitions", () => {
    expect(canTransitionDelivery("DELIVERY_PENDING", "READY_FOR_DISPATCH")).toBe(true);
    expect(canTransitionDelivery("READY_FOR_DISPATCH", "DELIVERED")).toBe(false);
    expect(canTransitionDelivery("DELIVERED", "DISPATCHED")).toBe(false);
  });

  it("keeps delivery and order lifecycle synchronization deterministic", () => {
    expect(orderStatusForDelivery("READY_FOR_DISPATCH")).toBe(OrderStatus.Packed);
    expect(orderStatusForDelivery("DISPATCHED")).toBe(OrderStatus.OutForDelivery);
    expect(orderStatusForDelivery("DELIVERED")).toBe(OrderStatus.Delivered);
    expect(orderStatusForDelivery("RETURNED")).toBe(OrderStatus.Refunded);
  });

  it("blocks dispatch before payment is captured or COD is confirmed", () => {
    const delivery = seedDeliveries[0];
    expect(canStartDispatch(delivery, PaymentStatus.Pending)).toBe(false);
    expect(canStartDispatch(delivery, PaymentStatus.Succeeded)).toBe(true);
    expect(canStartDispatch(delivery, PaymentStatus.CodConfirmed)).toBe(true);
  });

  it("advances delivery with auditable events, ETA refresh, and verification state", () => {
    vi.setSystemTime(new Date("2026-05-26T12:00:00.000Z"));
    const result = advanceDeliveryLifecycle(seedDeliveries[1], {
      deliveryId: seedDeliveries[1].id,
      toStatus: "READY_FOR_DISPATCH",
      actor: "seller",
      note: "Seller packed and verified package handoff readiness.",
    });

    expect(result.delivery.status).toBe("READY_FOR_DISPATCH");
    expect(result.orderStatus).toBe(OrderStatus.Packed);
    expect(result.event.type).toBe("pickup_ready");
    expect(result.delivery.etaLogs.at(-1)?.reason).toContain("READY_FOR_DISPATCH");
  });

  it("creates recovery paths for failed deliveries", () => {
    vi.setSystemTime(new Date("2026-05-26T12:00:00.000Z"));
    const active = seedDeliveries[0];
    const failed = advanceDeliveryLifecycle(active, {
      deliveryId: active.id,
      toStatus: "FAILED",
      actor: "partner",
      note: "Customer unreachable after two verified contact attempts.",
      failureReason: "unreachable customer",
    });

    expect(failed.delivery.recovery).toMatchObject({
      reason: "unreachable_customer",
      action: "manual_review",
      status: "pending",
    });
    expect(scheduleDeliveryRecovery(failed.delivery, "stale_tracking").action).toBe("eta_refresh");
  });

  it("calculates realistic hyperlocal ETA and delivery feasibility", () => {
    const distance = estimateHyperlocalDistanceKm({
      pickupLatitude: 13.0405,
      pickupLongitude: 80.2337,
      dropoffLatitude: 13.0569,
      dropoffLongitude: 80.2425,
    });

    expect(distance).toBeGreaterThan(1);
    expect(deliveryFeasibility(distance, 5).deliverable).toBe(true);

    const eta = estimateDeliveryEta({
      distanceKm: distance ?? 2,
      prepMinutes: 18,
      mode: "seller_self",
      serviceRadiusKm: 5,
      trafficFactor: "heavy",
      status: "DISPATCHED",
    });

    expect(eta.estimatedMinutes).toBeGreaterThan(10);
    expect(eta.reason).toContain("DISPATCHED");
  });

  it("surfaces stale or failed deliveries as operational alerts", () => {
    vi.setSystemTime(new Date("2026-05-26T12:00:00.000Z"));
    const signals = deriveDeliverySignals({
      ...seedDeliveries[2],
      updatedAt: "2026-05-26T10:45:00.000Z",
    });

    expect(signals.alertLevel).toBe("critical");
    expect(signals.failureCount).toBe(1);
  });

  it("keeps provider orchestration independent with health-based failover", () => {
    const plan = chooseLogisticsProvider({
      delivery: { mode: "shiprocket", distanceKm: 4.2, etaConfidence: "medium" },
      health: [
        { provider: "seller_self", state: "HEALTHY", priority: 90, averageLatencyMs: 0, failureCount: 0 },
        { provider: "shiprocket", state: "OUTAGE", priority: 70, averageLatencyMs: 1200, failureCount: 8 },
      ],
    });

    expect(plan.providerIndependent).toBe(true);
    expect(plan.primary).toBe("seller_self");
    expect(plan.reason).toContain("failover");
    expect(plan.degraded).toBe(true);
    expect(plan.throttledProviders).toContain("shiprocket");
  });

  it("scores provider failures into degraded cooldown-aware health", () => {
    const health = updateProviderHealthAfterAttempt({
      health: { provider: "shiprocket", state: "HEALTHY", priority: 70, averageLatencyMs: 900, failureCount: 5 },
      attempt: { provider: "shiprocket", ok: false, latencyMs: 3200, attemptedAt: "2026-05-26T12:00:00.000Z", errorCode: "TIMEOUT" },
      cooldownMinutes: 15,
    });

    expect(health.state).toBe("OUTAGE");
    expect(health.cooldownUntil).toBe("2026-05-26T12:15:00.000Z");
    expect(health.failureCount).toBe(6);
  });

  it("normalizes provider tracking without skipping delivery state enforcement", () => {
    expect(normalizeProviderStatus("Courier out for delivery nearby")).toBe("NEARBY");
    expect(canTransitionDelivery("IN_TRANSIT", normalizeProviderStatus("Courier out for delivery nearby"))).toBe(true);
  });

  it("detects SLA breaches for stale dispatch and tracking", () => {
    const assessment = assessDeliverySla(
      {
        ...seedDeliveries[1],
        status: "DELIVERY_PENDING",
        createdAt: "2026-05-26T10:00:00.000Z",
        updatedAt: "2026-05-26T10:05:00.000Z",
      },
      new Date("2026-05-26T11:00:00.000Z"),
    );

    expect(assessment.alertLevel).toBe("critical");
    expect(assessment.escalation).toBe("ops_review");
    expect(assessment.latencyScore).toBeLessThan(100);
    expect(assessment.breaches.map((breach) => breach.type)).toContain("dispatch_delay");
    expect(assessment.breaches.map((breach) => breach.type)).toContain("stale_tracking");
  });

  it("detects ETA drift as an actionable SLA breach", () => {
    const assessment = assessDeliverySla(
      {
        ...seedDeliveries[0],
        status: "IN_TRANSIT",
        etaMinutes: 20,
        updatedAt: "2026-05-26T10:00:00.000Z",
        promisedAt: "2026-05-26T12:30:00.000Z",
      },
      new Date("2026-05-26T10:51:00.000Z"),
    );

    expect(assessment.breaches.map((breach) => breach.type)).toContain("eta_drift");
    expect(assessment.alertLevel).toBe("critical");
  });

  it("keeps replayed tracking events and dispatch saturation observable", () => {
    const replay = simulateTrackingReplay([
      { deliveryId: "del-1", provider: "shiprocket", providerEventId: "evt-1", status: "IN_TRANSIT" },
      { deliveryId: "del-1", provider: "shiprocket", providerEventId: "evt-1", status: "IN_TRANSIT" },
      { deliveryId: "del-1", provider: "shiprocket", providerEventId: "evt-2", status: "ARRIVING" },
    ]);
    const backlog = simulateDispatchBacklog({ pending: 90, active: 32, failedProviders: 2, retryCount: 10, maxConcurrentDispatches: 40 });
    const pressure = evaluateLogisticsBackpressure({ queueDepth: 90, activeDispatches: 32, providerFailureCount: 2, retryCount: 10, maxConcurrentDispatches: 40 });

    expect(replay.duplicateCount).toBe(1);
    expect(backlog.shouldThrottle).toBe(true);
    expect(backlog.stable).toBe(true);
    expect(pressure.acceptDispatch).toBe(true);
    expect(pressure.throttleRealtime).toBe(true);
    expect(pressure.alertLevel).toBe("watch");
  });
});
