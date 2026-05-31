/**
 * MCP-1E — Marketplace Operations Engine Tests
 * Covers: Support, Customer Ops, Seller Ops, Disputes, Incidents, Fulfillment, Refund Governance, Operations Center, Intelligence
 */

import { describe, it, expect } from "vitest";
import {
  // Support
  createTicket,
  canTransition,
  transitionTicket,
  escalateTicket,
  resolveTicket,
  computeSupportAnalytics,
  determinePriority,
  determineTeam,
  // Customer Ops
  computeCustomerHealth,
  createCustomerIssue,
  resolveCustomerIssue,
  computeCustomerOperationsSnapshot,
  // Seller Ops
  computeSellerHealth,
  createViolation,
  confirmViolation,
  applyAction,
  recommendAction,
  computeSellerOperationsSnapshot,
  // Disputes
  createDispute,
  canTransitionDispute,
  transitionDispute,
  submitEvidence,
  resolveDispute,
  computeDisputeAnalytics,
  // Incidents
  createIncident,
  canTransitionIncident,
  transitionIncident,
  addPostmortem,
  computeIncidentAnalytics,
  // Fulfillment
  assessDeliveryRisk,
  checkFulfillmentSLA,
  computeFulfillmentSnapshot,
  // Refund Governance
  computeRefundRisk,
  createRefundRequest,
  approveRefund,
  rejectRefund,
  createCancellationRequest,
  computeRefundAnalytics,
  DEFAULT_REFUND_RULES,
  // Operations Center
  computeDomainHealth,
  generateKPIs,
  generateAlerts,
  computeMarketplaceOperationsSnapshot,
  // Intelligence
  detectOperationalRisks,
  generateForecasts,
  generateRecommendations,
  computeOperationalIntelligence,
  // Seed data
  SEED_TICKETS,
  SEED_DISPUTES,
  SEED_INCIDENTS,
  SEED_FULFILLMENT_ORDERS,
  SEED_REFUND_REQUESTS,
  SEED_CANCELLATIONS,
  SEED_CUSTOMERS,
  SEED_CUSTOMER_ISSUES,
  SEED_SELLERS,
  SEED_VIOLATIONS,
} from "@/lib/marketplace-operations";

// ─── Phase 2: Support Platform ─────────────────────────────────────────────────

describe("Support Platform", () => {
  it("creates a ticket with correct priority and SLA", () => {
    const ticket = createTicket({ subject: "Payment failed", description: "Payment failed during checkout", category: "payment_issue", channel: "web", createdBy: "user-1", createdByRole: "customer" });
    expect(ticket.priority).toBe("high");
    expect(ticket.status).toBe("open");
    expect(ticket.assignedTeam).toBe("payment_support");
    expect(ticket.sla.policy.priority).toBe("high");
    expect(ticket.ticketNumber).toMatch(/^TKT-/);
  });

  it("determines priority from category and keywords", () => {
    expect(determinePriority("payment_issue", "someone committed fraud on my account")).toBe("critical");
    expect(determinePriority("delivery_issue", "normal delivery delay")).toBe("high");
    expect(determinePriority("general_inquiry", "how do I change my email")).toBe("low");
  });

  it("routes tickets to correct teams", () => {
    expect(determineTeam("delivery_issue")).toBe("logistics_support");
    expect(determineTeam("seller_complaint")).toBe("seller_relations");
    expect(determineTeam("refund_request")).toBe("refund_team");
  });

  it("enforces valid status transitions", () => {
    expect(canTransition("open", "assigned")).toBe(true);
    expect(canTransition("open", "resolved")).toBe(false);
    expect(canTransition("in_progress", "resolved")).toBe(true);
    expect(canTransition("closed", "open")).toBe(false);
  });

  it("transitions ticket status with audit trail", () => {
    const ticket = createTicket({ subject: "Test", description: "test", category: "general_inquiry", channel: "web", createdBy: "u1", createdByRole: "customer" });
    const assigned = transitionTicket(ticket, "assigned", "agent-1", "agent");
    expect(assigned.status).toBe("assigned");
    expect(assigned.audit.length).toBe(ticket.audit.length + 1);
  });

  it("throws on invalid transition", () => {
    const ticket = createTicket({ subject: "Test", description: "test", category: "general_inquiry", channel: "web", createdBy: "u1", createdByRole: "customer" });
    expect(() => transitionTicket(ticket, "resolved", "a1", "agent")).toThrow("Invalid transition");
  });

  it("escalates ticket and increments escalation level", () => {
    const ticket = createTicket({ subject: "Urgent", description: "urgent issue", category: "payment_issue", channel: "web", createdBy: "u1", createdByRole: "customer" });
    const escalated = escalateTicket(ticket, "agent-1", "Customer demanding immediate resolution");
    expect(escalated.escalationLevel).toBe(1);
    expect(escalated.status).toBe("escalated");
  });

  it("resolves ticket with resolution details", () => {
    const ticket = createTicket({ subject: "Test", description: "test", category: "general_inquiry", channel: "web", createdBy: "u1", createdByRole: "customer" });
    const inProgress = transitionTicket(ticket, "in_progress", "a1", "agent");
    const resolved = resolveTicket(inProgress, { type: "resolved", summary: "Issue fixed", resolvedBy: "a1", satisfactionScore: 5 });
    expect(resolved.status).toBe("resolved");
    expect(resolved.resolution?.summary).toBe("Issue fixed");
    expect(resolved.resolution?.satisfactionScore).toBe(5);
  });

  it("computes support analytics from seed data", () => {
    const analytics = computeSupportAnalytics(SEED_TICKETS);
    expect(analytics.totalTickets).toBe(5);
    expect(analytics.openTickets).toBeGreaterThan(0);
    expect(analytics.slaComplianceRate).toBeGreaterThanOrEqual(0);
    expect(analytics.slaComplianceRate).toBeLessThanOrEqual(1);
  });
});

// ─── Phase 3: Customer Operations ──────────────────────────────────────────────

describe("Customer Operations", () => {
  it("computes customer health with risk factors", () => {
    const result = computeCustomerHealth({ lifetimeOrders: 3, lifetimeSpend: 5000, openIssues: 3, totalIssues: 5, daysSinceLastOrder: 100, satisfactionAvg: 2.5, refundCount: 4, disputeCount: 2 });
    expect(result.score).toBeLessThan(50);
    expect(["churning", "lost"]).toContain(result.status);
    expect(result.riskFactors.length).toBeGreaterThan(0);
  });

  it("identifies healthy customers", () => {
    const result = computeCustomerHealth({ lifetimeOrders: 20, lifetimeSpend: 50000, openIssues: 0, totalIssues: 1, daysSinceLastOrder: 5, satisfactionAvg: 4.8, refundCount: 0, disputeCount: 0 });
    expect(result.status).toBe("healthy");
    expect(result.score).toBeGreaterThan(70);
  });

  it("creates and resolves customer issues", () => {
    const issue = createCustomerIssue({ customerId: "c1", type: "complaint", description: "Bad experience" });
    expect(issue.status).toBe("open");
    expect(issue.priority).toBe("high");
    const resolved = resolveCustomerIssue(issue, "Apology sent and credit applied");
    expect(resolved.status).toBe("resolved");
    expect(resolved.resolution).toBe("Apology sent and credit applied");
  });

  it("computes customer operations snapshot", () => {
    const snap = computeCustomerOperationsSnapshot(SEED_CUSTOMERS, SEED_CUSTOMER_ISSUES);
    expect(snap.totalCustomers).toBe(5);
    expect(snap.healthyCustomers).toBeGreaterThan(0);
    expect(snap.topRiskFactors.length).toBeGreaterThan(0);
  });
});

// ─── Phase 4: Seller Operations ────────────────────────────────────────────────

describe("Seller Operations", () => {
  it("computes seller health score and status", () => {
    const result = computeSellerHealth({ totalOrders: 50, fulfillmentRate: 0.82, lateShipmentRate: 0.25, returnRate: 0.2, disputeRate: 0.08, customerRating: 3.0, activeViolations: 3, warningCount: 5 });
    expect(result.status).toBe("suspended");
    expect(result.score).toBeLessThan(30);
    expect(result.riskFactors.length).toBeGreaterThan(3);
  });

  it("identifies excellent sellers", () => {
    const result = computeSellerHealth({ totalOrders: 500, fulfillmentRate: 0.99, lateShipmentRate: 0.01, returnRate: 0.02, disputeRate: 0.005, customerRating: 4.8, activeViolations: 0, warningCount: 0 });
    expect(result.status).toBe("excellent");
    expect(result.score).toBeGreaterThan(85);
  });

  it("creates and processes violations", () => {
    const violation = createViolation({ sellerId: "s1", type: "late_shipment", severity: "minor", description: "Late", evidence: ["report.csv"], reportedBy: "system" });
    expect(violation.status).toBe("reported");
    const confirmed = confirmViolation(violation);
    expect(confirmed.status).toBe("confirmed");
    const actioned = applyAction(confirmed, { type: "warning", reason: "First offense", expiresAt: null, appliedBy: "admin-1" });
    expect(actioned.status).toBe("actioned");
    expect(actioned.action?.type).toBe("warning");
  });

  it("recommends appropriate actions for violations", () => {
    expect(recommendAction({ type: "fraud", severity: "critical" } as any)).toBe("permanent_ban");
    expect(recommendAction({ type: "late_shipment", severity: "minor" } as any)).toBe("warning");
    expect(recommendAction({ type: "quality_issue", severity: "major" } as any)).toBe("listing_removal");
  });

  it("computes seller operations snapshot", () => {
    const snap = computeSellerOperationsSnapshot(SEED_SELLERS, SEED_VIOLATIONS);
    expect(snap.totalSellers).toBe(3);
    expect(snap.openViolations).toBeGreaterThan(0);
    expect(snap.avgFulfillmentRate).toBeGreaterThan(0);
  });
});

// ─── Phase 5: Dispute Resolution ───────────────────────────────────────────────

describe("Dispute Resolution", () => {
  it("creates a dispute with correct initial state", () => {
    const dispute = createDispute({ type: "damaged_item", buyerId: "b1", sellerId: "s1", orderId: "o1", amount: 1500, description: "Item damaged" });
    expect(dispute.status).toBe("filed");
    expect(dispute.disputeNumber).toMatch(/^DSP-/);
    expect(dispute.timeline.length).toBe(1);
  });

  it("enforces valid dispute transitions", () => {
    expect(canTransitionDispute("filed", "evidence_collection")).toBe(true);
    expect(canTransitionDispute("filed", "resolved_buyer")).toBe(false);
    expect(canTransitionDispute("under_review", "resolved_buyer")).toBe(true);
  });

  it("allows evidence submission", () => {
    const dispute = createDispute({ type: "wrong_item", buyerId: "b1", sellerId: "s1", orderId: "o1", amount: 800, description: "Wrong" });
    const withEvidence = submitEvidence(dispute, { submittedBy: "b1", submittedByRole: "buyer", type: "image", content: "proof.jpg", description: "Photo proof" });
    expect(withEvidence.buyerEvidence.length).toBe(1);
    expect(withEvidence.timeline.length).toBe(2);
  });

  it("resolves disputes with outcome", () => {
    let dispute = createDispute({ type: "order_not_received", buyerId: "b1", sellerId: "s1", orderId: "o1", amount: 2000, description: "Never received" });
    dispute = transitionDispute(dispute, "evidence_collection", "admin", "admin", "Moving to evidence");
    dispute = transitionDispute(dispute, "under_review", "admin", "admin", "Reviewing");
    const resolved = resolveDispute(dispute, { outcome: "buyer_wins", summary: "Order confirmed not delivered", refundAmount: 2000, resolvedBy: "mediator-1" });
    expect(resolved.status).toBe("resolved_buyer");
    expect(resolved.resolution?.refundAmount).toBe(2000);
  });

  it("computes dispute analytics", () => {
    const analytics = computeDisputeAnalytics(SEED_DISPUTES);
    expect(analytics.totalDisputes).toBe(3);
    expect(analytics.openDisputes).toBeGreaterThan(0);
    expect(analytics.totalDisputeAmount).toBeGreaterThan(0);
  });
});

// ─── Phase 6: Incident Management ──────────────────────────────────────────────

describe("Incident Management", () => {
  it("creates an incident with correct initial state", () => {
    const incident = createIncident({ type: "delivery_disruption", severity: "high", title: "Carrier Down", description: "Major carrier down", impactScope: "North", impactedCustomers: 100, impactedSellers: 20, impactedOrders: 150, ownerId: "ops-1", ownerName: "Ops Lead" });
    expect(incident.status).toBe("detected");
    expect(incident.incidentNumber).toMatch(/^INC-/);
    expect(incident.responders).toContain("ops-1");
  });

  it("enforces valid incident transitions", () => {
    expect(canTransitionIncident("detected", "acknowledged")).toBe(true);
    expect(canTransitionIncident("detected", "resolved")).toBe(false);
    expect(canTransitionIncident("investigating", "resolved")).toBe(true);
  });

  it("transitions through full lifecycle", () => {
    let inc = createIncident({ type: "payment_failure", severity: "critical", title: "Payment Gateway Down", description: "Gateway 502", impactScope: "All", impactedCustomers: 500, impactedSellers: 100, impactedOrders: 300, ownerId: "o1", ownerName: "Lead" });
    inc = transitionIncident(inc, "acknowledged", "o1", "Acknowledged");
    expect(inc.acknowledgedAt).not.toBeNull();
    inc = transitionIncident(inc, "investigating", "o1", "Investigating");
    inc = transitionIncident(inc, "resolved", "o1", "Gateway restored");
    expect(inc.resolvedAt).not.toBeNull();
  });

  it("adds postmortem to resolved incident", () => {
    let inc = createIncident({ type: "seller_fraud", severity: "critical", title: "Fraud", description: "fraud ring", impactScope: "Electronics", impactedCustomers: 50, impactedSellers: 1, impactedOrders: 60, ownerId: "ts-1", ownerName: "Trust" });
    inc = transitionIncident(inc, "acknowledged", "ts-1", "Ack");
    inc = transitionIncident(inc, "investigating", "ts-1", "Investigating");
    inc = transitionIncident(inc, "resolved", "ts-1", "Seller banned");
    inc = addPostmortem(inc, { summary: "Fraud ring detected", rootCause: "Weak verification", impact: "50 customers affected", timeline: "9am-6pm", lessonsLearned: ["Improve KYC"], actionItems: [{ task: "Improve KYC", owner: "trust", deadline: "2026-06-15", status: "pending" }] });
    expect(inc.postmortem).not.toBeNull();
    expect(inc.status).toBe("post_mortem");
  });

  it("computes incident analytics", () => {
    const analytics = computeIncidentAnalytics(SEED_INCIDENTS);
    expect(analytics.totalIncidents).toBe(2);
    expect(analytics.mttr).toBeGreaterThan(0);
  });
});

// ─── Phase 7: Fulfillment Operations ───────────────────────────────────────────

describe("Fulfillment Operations", () => {
  it("assesses delivery risk correctly", () => {
    const onTrack = { ...SEED_FULFILLMENT_ORDERS[1] }; // delivered
    expect(assessDeliveryRisk(onTrack)).toBe("on_track");
  });

  it("checks fulfillment SLA", () => {
    const delivered = SEED_FULFILLMENT_ORDERS[1]; // delivered on time
    expect(checkFulfillmentSLA(delivered, 5)).toBe(true);
  });

  it("computes fulfillment snapshot", () => {
    const snap = computeFulfillmentSnapshot(SEED_FULFILLMENT_ORDERS);
    expect(snap.totalOrders).toBe(5);
    expect(snap.delivered).toBeGreaterThan(0);
    expect(snap.onTimeRate).toBeGreaterThanOrEqual(0);
    expect(snap.carrierPerformance.length).toBeGreaterThan(0);
  });
});

// ─── Phase 8: Refund & Cancellation Governance ─────────────────────────────────

describe("Refund & Cancellation Governance", () => {
  it("computes refund risk scores", () => {
    const lowRisk = computeRefundRisk({ amount: 200, customerRefundCount30Days: 0, customerLifetimeRefunds: 1, customerLifetimeOrders: 20, daysSinceOrder: 3, category: "defective", isRepeatProduct: false });
    expect(lowRisk.riskLevel).toBe("low");

    const highRisk = computeRefundRisk({ amount: 8000, customerRefundCount30Days: 4, customerLifetimeRefunds: 10, customerLifetimeOrders: 15, daysSinceOrder: 35, category: "duplicate", isRepeatProduct: true });
    expect(highRisk.riskLevel).toBe("fraud_suspected");
    expect(highRisk.riskFactors.length).toBeGreaterThan(3);
  });

  it("auto-approves low-risk refunds below threshold", () => {
    const risk = computeRefundRisk({ amount: 300, customerRefundCount30Days: 0, customerLifetimeRefunds: 1, customerLifetimeOrders: 10, daysSinceOrder: 2, category: "defective", isRepeatProduct: false });
    const request = createRefundRequest({ orderId: "o1", customerId: "c1", sellerId: "s1", amount: 300, reason: "Defective", category: "defective", ...risk, rules: DEFAULT_REFUND_RULES });
    expect(request.autoApproved).toBe(true);
    expect(request.status).toBe("approved");
  });

  it("blocks fraud-suspected refunds", () => {
    const risk = computeRefundRisk({ amount: 9000, customerRefundCount30Days: 5, customerLifetimeRefunds: 12, customerLifetimeOrders: 14, daysSinceOrder: 40, category: "fraud", isRepeatProduct: true });
    const request = createRefundRequest({ orderId: "o2", customerId: "c2", sellerId: "s2", amount: 9000, reason: "Fraud claim", category: "fraud", ...risk, rules: DEFAULT_REFUND_RULES });
    expect(request.status).toBe("rejected");
    expect(request.autoApproved).toBe(false);
  });

  it("manually approves and rejects refunds", () => {
    const risk = computeRefundRisk({ amount: 2000, customerRefundCount30Days: 2, customerLifetimeRefunds: 3, customerLifetimeOrders: 8, daysSinceOrder: 10, category: "changed_mind", isRepeatProduct: false });
    const request = createRefundRequest({ orderId: "o3", customerId: "c3", sellerId: "s3", amount: 2000, reason: "Changed mind", category: "changed_mind", ...risk, rules: DEFAULT_REFUND_RULES });
    expect(request.status).toBe("under_review");

    const approved = approveRefund(request, "admin-1");
    expect(approved.status).toBe("approved");
    expect(approved.approvedBy).toBe("admin-1");

    const rejected = rejectRefund(request, "admin-2", "Insufficient evidence");
    expect(rejected.status).toBe("rejected");
    expect(rejected.rejectionReason).toBe("Insufficient evidence");
  });

  it("creates cancellation requests with auto-approve for customers", () => {
    const cancel = createCancellationRequest({ orderId: "o4", requestedBy: "c4", requestedByRole: "customer", reason: "Found cheaper", category: "customer_request" });
    expect(cancel.status).toBe("approved"); // auto-approved
  });

  it("computes refund analytics", () => {
    const analytics = computeRefundAnalytics(SEED_REFUND_REQUESTS);
    expect(analytics.totalRefunds).toBe(4);
    expect(analytics.approvedRefunds).toBeGreaterThan(0);
    expect(analytics.autoApprovalRate).toBeGreaterThan(0);
  });
});

// ─── Phase 9-10: Operations Center ─────────────────────────────────────────────

describe("Operations Center", () => {
  const support = computeSupportAnalytics(SEED_TICKETS);
  const disputes = computeDisputeAnalytics(SEED_DISPUTES);
  const incidents = computeIncidentAnalytics(SEED_INCIDENTS);
  const fulfillment = computeFulfillmentSnapshot(SEED_FULFILLMENT_ORDERS);
  const sellers = computeSellerOperationsSnapshot(SEED_SELLERS, SEED_VIOLATIONS);
  const customers = computeCustomerOperationsSnapshot(SEED_CUSTOMERS, SEED_CUSTOMER_ISSUES);
  const refunds = computeRefundAnalytics(SEED_REFUND_REQUESTS);

  it("computes domain health scores (0-100)", () => {
    const supportHealth = computeDomainHealth("support", { support });
    expect(supportHealth).toBeGreaterThanOrEqual(0);
    expect(supportHealth).toBeLessThanOrEqual(100);
  });

  it("generates KPIs for all domains", () => {
    const kpis = generateKPIs({ support, disputes, incidents, fulfillment, sellers, customers, refunds });
    expect(kpis.length).toBeGreaterThanOrEqual(8);
    for (const kpi of kpis) {
      expect(kpi.status).toMatch(/^(good|warning|critical)$/);
    }
  });

  it("generates alerts based on thresholds", () => {
    const alerts = generateAlerts({ support, disputes, incidents, fulfillment, sellers, refunds });
    expect(Array.isArray(alerts)).toBe(true);
    // With seed data, at least some alerts should fire (incidents are open)
    expect(alerts.length).toBeGreaterThan(0);
  });

  it("computes unified marketplace operations snapshot", () => {
    const snapshot = computeMarketplaceOperationsSnapshot({ support, disputes, incidents, fulfillment, sellers, customers, refunds });
    expect(snapshot.overallHealth).toBeGreaterThan(0);
    expect(snapshot.overallHealth).toBeLessThanOrEqual(100);
    expect(Object.keys(snapshot.healthByDomain).length).toBe(7);
    expect(snapshot.kpis.length).toBeGreaterThanOrEqual(8);
  });
});

// ─── Phase 11: Operational Intelligence ────────────────────────────────────────

describe("Operational Intelligence", () => {
  const support = computeSupportAnalytics(SEED_TICKETS);
  const disputes = computeDisputeAnalytics(SEED_DISPUTES);
  const incidents = computeIncidentAnalytics(SEED_INCIDENTS);
  const fulfillment = computeFulfillmentSnapshot(SEED_FULFILLMENT_ORDERS);
  const sellers = computeSellerOperationsSnapshot(SEED_SELLERS, SEED_VIOLATIONS);
  const customers = computeCustomerOperationsSnapshot(SEED_CUSTOMERS, SEED_CUSTOMER_ISSUES);
  const refunds = computeRefundAnalytics(SEED_REFUND_REQUESTS);
  const snapshot = computeMarketplaceOperationsSnapshot({ support, disputes, incidents, fulfillment, sellers, customers, refunds });

  it("detects operational risks from data", () => {
    const risks = detectOperationalRisks({ support, disputes, incidents, fulfillment, sellers, customers, refunds });
    expect(Array.isArray(risks)).toBe(true);
    // With seed data that has open incidents, should detect risk
    expect(risks.length).toBeGreaterThan(0);
    for (const risk of risks) {
      expect(risk.confidence).toBeGreaterThan(0);
      expect(risk.confidence).toBeLessThanOrEqual(1);
      expect(risk.recommendation).toBeDefined();
    }
  });

  it("generates forecasts for key metrics", () => {
    const forecasts = generateForecasts({ support, disputes, fulfillment, refunds });
    expect(forecasts.length).toBe(4);
    for (const f of forecasts) {
      expect(f.confidence).toBeGreaterThan(0);
      expect(f.forecastPeriod).toBeTruthy();
    }
  });

  it("generates recommendations sorted by priority", () => {
    const risks = detectOperationalRisks({ support, disputes, incidents, fulfillment, sellers, customers, refunds });
    const recs = generateRecommendations(risks, snapshot.healthByDomain);
    expect(recs.length).toBeGreaterThan(0);
    // Should be sorted: critical/high before medium/low
    for (let i = 1; i < recs.length; i++) {
      const order = { critical: 0, urgent: 1, high: 2, medium: 3, low: 4 };
      expect(order[recs[i].priority] ?? 5).toBeGreaterThanOrEqual(order[recs[i - 1].priority] ?? 5);
    }
  });

  it("computes full operational intelligence snapshot", () => {
    const intel = computeOperationalIntelligence({ support, disputes, incidents, fulfillment, sellers, customers, refunds, healthScores: snapshot.healthByDomain });
    expect(intel.risks.length).toBeGreaterThan(0);
    expect(intel.recommendations.length).toBeGreaterThan(0);
    expect(intel.forecasts.length).toBe(4);
    expect(intel.healthTrend.length).toBe(7);
    expect(intel.topConcerns.length).toBeGreaterThan(0);
  });
});

// ─── Seed Data Integrity ───────────────────────────────────────────────────────

describe("Seed Data Integrity", () => {
  it("all seed data arrays are non-empty", () => {
    expect(SEED_TICKETS.length).toBeGreaterThan(0);
    expect(SEED_DISPUTES.length).toBeGreaterThan(0);
    expect(SEED_INCIDENTS.length).toBeGreaterThan(0);
    expect(SEED_FULFILLMENT_ORDERS.length).toBeGreaterThan(0);
    expect(SEED_REFUND_REQUESTS.length).toBeGreaterThan(0);
    expect(SEED_CANCELLATIONS.length).toBeGreaterThan(0);
    expect(SEED_CUSTOMERS.length).toBeGreaterThan(0);
    expect(SEED_CUSTOMER_ISSUES.length).toBeGreaterThan(0);
    expect(SEED_SELLERS.length).toBeGreaterThan(0);
    expect(SEED_VIOLATIONS.length).toBeGreaterThan(0);
  });

  it("seed tickets have valid structure", () => {
    for (const t of SEED_TICKETS) {
      expect(t.id).toBeTruthy();
      expect(t.ticketNumber).toMatch(/^TKT-/);
      expect(t.category).toBeTruthy();
      expect(t.priority).toBeTruthy();
      expect(t.status).toBeTruthy();
    }
  });

  it("seed disputes have valid structure", () => {
    for (const d of SEED_DISPUTES) {
      expect(d.id).toBeTruthy();
      expect(d.disputeNumber).toMatch(/^DSP-/);
      expect(d.amount).toBeGreaterThan(0);
    }
  });

  it("seed incidents have valid structure", () => {
    for (const i of SEED_INCIDENTS) {
      expect(i.id).toBeTruthy();
      expect(i.incidentNumber).toMatch(/^INC-/);
      expect(i.severity).toBeTruthy();
    }
  });
});
