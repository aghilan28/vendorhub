/**
 * MCP-1G — Pilot Launch Tests
 * Validates: readiness audit, pilot targets, market validation, go/no-go, MCP-1 certification
 */

import { describe, it, expect } from "vitest";
import {
  auditPilotReadiness,
  getSellerPilotTarget,
  getCustomerPilotTarget,
  createIntelligenceValidationFramework,
  evaluateMarketValidation,
  computeGoNoGoDecision,
  generateMCP1FinalCertification,
} from "@/lib/pilot-launch";

describe("Pilot Readiness Audit", () => {
  it("returns ready when all env configured", () => {
    const audit = auditPilotReadiness({
      hasSupabaseUrl: true, hasSupabaseKey: true, hasRazorpayKey: true,
      hasRazorpaySecret: true, hasSentryDsn: true, hasOpenAiKey: true,
      hasDomain: true, hasSSL: true, hasMigrations: true, hasBackups: true,
      hasRLS: true, hasRateLimiting: true, hasSecurityHeaders: true,
      hasEmailConfig: true, hasPushConfig: true,
    });
    expect(audit.overallStatus).toBe("ready");
    expect(audit.notReadyCount).toBe(0);
  });

  it("returns not_ready when critical items missing", () => {
    const audit = auditPilotReadiness({
      hasSupabaseUrl: false, hasSupabaseKey: false, hasRazorpayKey: false,
      hasRazorpaySecret: false, hasSentryDsn: false, hasOpenAiKey: false,
      hasDomain: false, hasSSL: false, hasMigrations: false, hasBackups: false,
      hasRLS: false, hasRateLimiting: true, hasSecurityHeaders: false,
      hasEmailConfig: false, hasPushConfig: false,
    });
    expect(audit.overallStatus).toBe("not_ready");
    expect(audit.notReadyCount).toBeGreaterThan(2);
  });

  it("all checks have required fields", () => {
    const audit = auditPilotReadiness({
      hasSupabaseUrl: true, hasSupabaseKey: true, hasRazorpayKey: true,
      hasRazorpaySecret: true, hasSentryDsn: true, hasOpenAiKey: true,
      hasDomain: true, hasSSL: true, hasMigrations: true, hasBackups: true,
      hasRLS: true, hasRateLimiting: true, hasSecurityHeaders: true,
      hasEmailConfig: true, hasPushConfig: true,
    });
    for (const check of audit.checks) {
      expect(check.id).toBeTruthy();
      expect(check.category).toBeTruthy();
      expect(check.name).toBeTruthy();
      expect(["ready", "conditionally_ready", "not_ready"]).toContain(check.status);
    }
  });
});

describe("Seller Pilot Target", () => {
  it("defines realistic targets", () => {
    const target = getSellerPilotTarget();
    expect(target.minSellers).toBe(5);
    expect(target.maxSellers).toBe(20);
    expect(target.categories.length).toBeGreaterThanOrEqual(5);
    expect(target.requirements.length).toBeGreaterThanOrEqual(5);
    expect(target.trainingItems.length).toBeGreaterThanOrEqual(5);
  });
});

describe("Customer Pilot Target", () => {
  it("defines realistic targets", () => {
    const target = getCustomerPilotTarget();
    expect(target.minCustomers).toBe(25);
    expect(target.maxCustomers).toBe(100);
    expect(target.sources.length).toBeGreaterThanOrEqual(4);
    expect(target.feedbackLoop.length).toBeGreaterThanOrEqual(3);
  });
});

describe("Intelligence Validation Framework", () => {
  it("covers all 7 engines", () => {
    const framework = createIntelligenceValidationFramework();
    expect(framework.length).toBe(7);
    for (const result of framework) {
      expect(result.engine).toBeTruthy();
      expect(["high", "medium", "low"]).toContain(result.practicalValue);
      expect(result.feedback.length).toBeGreaterThan(10);
    }
  });
});

describe("Market Validation", () => {
  it("scores strong market signals positively", () => {
    const { score, signals } = evaluateMarketValidation({
      sellerRetention: 0.9, customerRetention: 0.5, repeatOrderRate: 0.4,
      marketplaceLiquidity: 0.8, productAvailability: 0.95,
      deliveryPerformance: 0.92, customerSatisfaction: 4.3,
      sellerSatisfaction: 4.1, totalRevenue: 50000, weekOverWeekGrowth: 0.15,
    });
    expect(score).toBeGreaterThan(75);
    expect(signals.length).toBeGreaterThan(3);
  });

  it("scores weak market signals poorly", () => {
    const { score, concerns } = evaluateMarketValidation({
      sellerRetention: 0.3, customerRetention: 0.1, repeatOrderRate: 0.05,
      marketplaceLiquidity: 0.2, productAvailability: 0.5,
      deliveryPerformance: 0.6, customerSatisfaction: 2.5,
      sellerSatisfaction: 2.0, totalRevenue: 1000, weekOverWeekGrowth: -0.1,
    });
    expect(score).toBeLessThan(40);
    expect(concerns.length).toBeGreaterThan(3);
  });
});

describe("Go/No-Go Decision", () => {
  it("recommends scale for excellent metrics", () => {
    const decision = computeGoNoGoDecision({
      sellers: { onboarded: 15, active: 12, productsListed: 500, avgProductsPerSeller: 35, verificationRate: 0.95, satisfactionScore: 4.5, topIssues: [] },
      customers: { registered: 80, active: 60, ordersPlaced: 200, repeatCustomers: 30, satisfactionScore: 4.3, nps: 65, topComplaints: [], topRequests: [] },
      orders: { totalOrders: 200, totalRevenue: 85000, avgOrderValue: 425, conversionRate: 0.08, cancellationRate: 0.03, refundRate: 0.02, deliverySuccessRate: 0.95, repeatOrderRate: 0.35 },
      delivery: { totalDeliveries: 190, onTimeRate: 0.93, avgDeliveryMinutes: 45, failedDeliveries: 5, customerSatisfaction: 4.4, etaAccuracy: 0.85, topFailureReasons: [] },
      operations: { ticketsCreated: 20, ticketsResolved: 18, avgResolutionHours: 4, slaCompliance: 0.9, disputesRaised: 3, disputesResolved: 2, incidents: 1, incidentsResolved: 1, escalations: 1 },
      marketValidation: { sellerRetention: 0.9, customerRetention: 0.5, repeatOrderRate: 0.35, marketplaceLiquidity: 0.8, productAvailability: 0.9, deliveryPerformance: 0.93, customerSatisfaction: 4.3, sellerSatisfaction: 4.5, totalRevenue: 85000, weekOverWeekGrowth: 0.12 },
    });
    expect(decision.decision).toBe("scale");
    expect(decision.overallScore).toBeGreaterThan(70);
  });

  it("recommends continue_pilot for moderate metrics", () => {
    const decision = computeGoNoGoDecision({
      sellers: { onboarded: 8, active: 5, productsListed: 100, avgProductsPerSeller: 20, verificationRate: 0.8, satisfactionScore: 3.8, topIssues: ["Slow payouts"] },
      customers: { registered: 30, active: 15, ordersPlaced: 40, repeatCustomers: 5, satisfactionScore: 3.6, nps: 30, topComplaints: ["Delivery delays"], topRequests: ["More products"] },
      orders: { totalOrders: 40, totalRevenue: 15000, avgOrderValue: 375, conversionRate: 0.04, cancellationRate: 0.08, refundRate: 0.05, deliverySuccessRate: 0.85, repeatOrderRate: 0.15 },
      delivery: { totalDeliveries: 34, onTimeRate: 0.8, avgDeliveryMinutes: 65, failedDeliveries: 4, customerSatisfaction: 3.5, etaAccuracy: 0.7, topFailureReasons: ["Wrong address"] },
      operations: { ticketsCreated: 15, ticketsResolved: 10, avgResolutionHours: 12, slaCompliance: 0.7, disputesRaised: 5, disputesResolved: 3, incidents: 2, incidentsResolved: 1, escalations: 3 },
      marketValidation: { sellerRetention: 0.7, customerRetention: 0.3, repeatOrderRate: 0.15, marketplaceLiquidity: 0.5, productAvailability: 0.7, deliveryPerformance: 0.8, customerSatisfaction: 3.6, sellerSatisfaction: 3.8, totalRevenue: 15000, weekOverWeekGrowth: 0.05 },
    });
    expect(decision.decision).toBe("continue_pilot");
    expect(decision.nextSteps.length).toBeGreaterThan(0);
  });

  it("recommends pause for poor metrics", () => {
    const decision = computeGoNoGoDecision({
      sellers: { onboarded: 3, active: 1, productsListed: 20, avgProductsPerSeller: 7, verificationRate: 0.5, satisfactionScore: 2.5, topIssues: ["Everything"] },
      customers: { registered: 10, active: 3, ordersPlaced: 5, repeatCustomers: 0, satisfactionScore: 2.0, nps: -20, topComplaints: ["Nothing works"], topRequests: [] },
      orders: { totalOrders: 5, totalRevenue: 1500, avgOrderValue: 300, conversionRate: 0.01, cancellationRate: 0.4, refundRate: 0.3, deliverySuccessRate: 0.5, repeatOrderRate: 0 },
      delivery: { totalDeliveries: 3, onTimeRate: 0.3, avgDeliveryMinutes: 120, failedDeliveries: 2, customerSatisfaction: 2.0, etaAccuracy: 0.3, topFailureReasons: ["No delivery partner"] },
      operations: { ticketsCreated: 10, ticketsResolved: 2, avgResolutionHours: 48, slaCompliance: 0.2, disputesRaised: 5, disputesResolved: 0, incidents: 3, incidentsResolved: 0, escalations: 5 },
      marketValidation: { sellerRetention: 0.3, customerRetention: 0.1, repeatOrderRate: 0, marketplaceLiquidity: 0.1, productAvailability: 0.3, deliveryPerformance: 0.3, customerSatisfaction: 2.0, sellerSatisfaction: 2.5, totalRevenue: 1500, weekOverWeekGrowth: -0.2 },
    });
    expect(["pause", "pivot"]).toContain(decision.decision);
  });
});

describe("MCP-1 Final Certification", () => {
  it("generates complete certification", () => {
    const cert = generateMCP1FinalCertification();
    expect(cert.phases.length).toBe(7); // 1A through 1G
    expect(cert.whatWasBuilt.length).toBeGreaterThan(5);
    expect(cert.whatWasProven.length).toBeGreaterThan(3);
    expect(cert.whatWasLearned.length).toBeGreaterThan(3);
    expect(cert.whatRemains.length).toBeGreaterThan(3);
    expect(cert.futureRoadmap.length).toBeGreaterThan(3);
    expect(cert.finalVerdict.length).toBeGreaterThan(50);
  });

  it("MCP-1G is marked in progress", () => {
    const cert = generateMCP1FinalCertification();
    const phase1g = cert.phases.find((p) => p.phase === "MCP-1G");
    expect(phase1g?.status).toBe("In Progress");
  });
});
