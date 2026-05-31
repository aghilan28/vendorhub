/**
 * EC-6 — Marketplace Operations Scale & Operator-Flow Certification.
 * Exercises the EXISTING operational engines (incidents, disputes, seller-ops/trust,
 * operations-center, governance trust-engine) at operator volume and proves the
 * operator journeys (fraud, dispute escalation, incident resolution, trust enforcement).
 * No new operational systems are built.
 */

import { describe, it, expect } from "vitest";
import {
  createIncident,
  transitionIncident,
  addPostmortem,
  computeIncidentAnalytics,
  createDispute,
  transitionDispute,
  submitEvidence,
  resolveDispute,
  computeDisputeAnalytics,
  createViolation,
  confirmViolation,
  applyAction,
  recommendAction,
  computeSellerOperationsSnapshot,
  computeMarketplaceOperationsSnapshot,
  computeSupportAnalytics,
  computeCustomerOperationsSnapshot,
  computeFulfillmentSnapshot,
  computeRefundAnalytics,
  type MarketplaceIncident,
  type Dispute,
  type SellerViolation,
  type SellerOperationsProfile,
} from "@/lib/marketplace-operations";
import {
  SEED_TICKETS,
  SEED_DISPUTES,
  SEED_INCIDENTS,
  SEED_FULFILLMENT_ORDERS,
  SEED_REFUND_REQUESTS,
  SEED_CUSTOMERS,
  SEED_CUSTOMER_ISSUES,
  SEED_SELLERS,
  SEED_VIOLATIONS,
} from "@/lib/marketplace-operations";
import { detectRiskSignals, recommendedEnforcement, isReversibleEnforcement } from "@/features/governance/trust-engine";

describe("EC-6 Incident lifecycle (mandated statuses)", () => {
  it("runs the full incident lifecycle to closed + postmortem", () => {
    let inc: MarketplaceIncident = createIncident({
      type: "seller_fraud", severity: "critical", title: "Counterfeit ring",
      description: "Multiple fake-brand listings", impactScope: "Electronics",
      impactedCustomers: 40, impactedSellers: 2, impactedOrders: 55,
      ownerId: "ts-1", ownerName: "Trust Lead",
    });
    expect(inc.status).toBe("detected"); // OPEN
    inc = transitionIncident(inc, "acknowledged", "ts-1", "Ack");
    inc = transitionIncident(inc, "investigating", "ts-1", "Investigating");
    inc = transitionIncident(inc, "mitigating", "ts-1", "Suspending sellers"); // MITIGATED
    inc = transitionIncident(inc, "resolved", "ts-1", "Sellers banned, orders refunded");
    expect(inc.resolvedAt).not.toBeNull();
    inc = addPostmortem(inc, {
      summary: "Counterfeit ring", rootCause: "Weak electronics verification",
      impact: "40 customers", timeline: "9am-6pm", lessonsLearned: ["Brand auth"],
      actionItems: [{ task: "Add brand auth", owner: "catalog", deadline: "2026-06-15", status: "pending" }],
    });
    expect(inc.status).toBe("post_mortem");
  });

  it("rejects illegal transitions", () => {
    const inc = createIncident({ type: "payment_failure", severity: "high", title: "x", description: "y", impactScope: "All", impactedCustomers: 1, impactedSellers: 1, impactedOrders: 1, ownerId: "o", ownerName: "O" });
    expect(() => transitionIncident(inc, "resolved", "o", "skip")).toThrow();
  });
});

describe("EC-6 Operations scale — incidents / disputes / violations at volume", () => {
  for (const n of [100, 1000] as const) {
    it(`computes analytics over ${n} incidents + ${n} disputes + ${n} violations`, () => {
      const t0 = Date.now();
      const incidents: MarketplaceIncident[] = [];
      const disputes: Dispute[] = [];
      const violations: SellerViolation[] = [];
      for (let i = 0; i < n; i++) {
        incidents.push(createIncident({
          type: i % 2 ? "delivery_disruption" : "seller_fraud",
          severity: (["low", "medium", "high", "critical"] as const)[i % 4],
          title: `INC ${i}`, description: "d", impactScope: "zone", impactedCustomers: i, impactedSellers: i % 10, impactedOrders: i,
          ownerId: `ops-${i % 5}`, ownerName: "Ops",
        }));
        disputes.push(createDispute({ type: "damaged_item", buyerId: `b${i}`, sellerId: `s${i % 50}`, orderId: `o${i}`, amount: 100 + i, description: "issue raised" }));
        violations.push(createViolation({ sellerId: `s${i % 50}`, type: "late_shipment", severity: "minor", description: "late", evidence: ["r.csv"], reportedBy: "system" }));
      }
      const incAnalytics = computeIncidentAnalytics(incidents);
      const dispAnalytics = computeDisputeAnalytics(disputes);
      expect(incAnalytics.totalIncidents).toBe(n);
      expect(dispAnalytics.totalDisputes).toBe(n);
      expect(violations.length).toBe(n);
      const ms = Date.now() - t0;
      expect(ms).toBeLessThan(n * 3 + 2000);
    });
  }

  it("computes seller-ops snapshot over 10,000 sellers", () => {
    const sellers: SellerOperationsProfile[] = [];
    for (let i = 0; i < 10000; i++) {
      const r = computeSellerHealthProfile(i);
      sellers.push(r);
    }
    const snap = computeSellerOperationsSnapshot(sellers, SEED_VIOLATIONS);
    expect(snap.totalSellers).toBe(10000);
    expect(snap.riskDistribution).toBeTruthy();
  });
});

function computeSellerHealthProfile(i: number): SellerOperationsProfile {
  const statuses = ["excellent", "good", "watch", "probation", "suspended"] as const;
  return {
    sellerId: `seller-${i}`,
    storeName: `Store ${i}`,
    healthStatus: statuses[i % 5],
    healthScore: (i % 100),
    totalOrders: i,
    fulfillmentRate: 0.8 + (i % 20) / 100,
    lateShipmentRate: (i % 20) / 100,
    returnRate: (i % 15) / 100,
    disputeRate: (i % 8) / 100,
    customerRating: 3 + (i % 20) / 10,
    activeViolations: i % 3,
    totalViolations: i % 6,
    warningCount: i % 4,
    lastViolationAt: null,
    riskFactors: [],
  };
}

describe("EC-6 Dispute escalation + resolution (operator journey)", () => {
  it("escalates then resolves a dispute with evidence + audit trail", () => {
    let d = createDispute({ type: "order_not_received", buyerId: "b1", sellerId: "s1", orderId: "o1", amount: 2000, description: "Never received item" });
    d = submitEvidence(d, { submittedBy: "b1", submittedByRole: "buyer", type: "tracking", content: "no-scan", description: "no delivery scan" });
    d = transitionDispute(d, "evidence_collection", "admin", "admin", "collecting");
    d = transitionDispute(d, "under_review", "admin", "admin", "reviewing");
    d = transitionDispute(d, "escalated", "admin", "admin", "escalating to senior");
    const resolved = resolveDispute(d, { outcome: "buyer_wins", summary: "No delivery proof", refundAmount: 2000, resolvedBy: "mediator-1" });
    expect(resolved.status).toBe("resolved_buyer");
    expect(resolved.timeline.length).toBeGreaterThanOrEqual(4);
  });
});

describe("EC-6 Trust enforcement (operator journey)", () => {
  it("detects risk signals and maps to enforcement (reversibility flagged)", () => {
    const signals = detectRiskSignals({
      orders: 100, cancellations: 40, refunds: 30, disputes: 20, failedDeliveries: 15,
      openFlags: 5, activeEnforcements: 0, failedPayouts: 8, verificationState: "VERIFIED",
    });
    expect(signals.length).toBeGreaterThan(0);
    for (const s of signals) {
      const enforcement = recommendedEnforcement(s);
      expect(enforcement).toBeTruthy();
      expect(typeof isReversibleEnforcement(enforcement)).toBe("boolean");
    }
  });
});

describe("EC-6 Violation enforcement (operator journey)", () => {
  it("confirms a violation and applies the recommended action", () => {
    const v = createViolation({ sellerId: "s1", type: "fake_product", severity: "critical", description: "counterfeit", evidence: ["img"], reportedBy: "ts-1" });
    expect(recommendAction(v)).toBe("permanent_ban");
    const confirmed = confirmViolation(v);
    const actioned = applyAction(confirmed, { type: "permanent_ban", reason: "Counterfeit confirmed", expiresAt: null, appliedBy: "admin-1" });
    expect(actioned.status).toBe("actioned");
    expect(actioned.action?.type).toBe("permanent_ban");
  });
});

describe("EC-6 Unified operations control snapshot", () => {
  it("computes a marketplace operations snapshot with health + KPIs + alerts", () => {
    const support = computeSupportAnalytics(SEED_TICKETS);
    const disputes = computeDisputeAnalytics(SEED_DISPUTES);
    const incidents = computeIncidentAnalytics(SEED_INCIDENTS);
    const fulfillment = computeFulfillmentSnapshot(SEED_FULFILLMENT_ORDERS);
    const sellers = computeSellerOperationsSnapshot(SEED_SELLERS, SEED_VIOLATIONS);
    const customers = computeCustomerOperationsSnapshot(SEED_CUSTOMERS, SEED_CUSTOMER_ISSUES);
    const refunds = computeRefundAnalytics(SEED_REFUND_REQUESTS);
    const snap = computeMarketplaceOperationsSnapshot({ support, disputes, incidents, fulfillment, sellers, customers, refunds });
    expect(snap.overallHealth).toBeGreaterThan(0);
    expect(snap.overallHealth).toBeLessThanOrEqual(100);
    expect(Object.keys(snap.healthByDomain).length).toBe(7);
    expect(snap.kpis.length).toBeGreaterThanOrEqual(8);
    expect(Array.isArray(snap.activeAlerts)).toBe(true);
  });
});
