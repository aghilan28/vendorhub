/**
 * MCP-1E Phase 9–10 — Marketplace Operations Center & Admin Governance
 * Unified dashboard, KPIs, alerts, health scoring, action center
 */

import type {
  DisputeAnalytics,
  CustomerOperationsSnapshot,
  FulfillmentSnapshot,
  HealthScore,
  IncidentAnalytics,
  MarketplaceHealthDomain,
  MarketplaceKPI,
  MarketplaceOperationsSnapshot,
  OperationalAlert,
  Priority,
  RefundAnalytics,
  SellerOperationsSnapshot,
  SupportAnalytics,
} from "./types";

// ─── Domain Health Scoring ─────────────────────────────────────────────────────

export function computeDomainHealth(domain: MarketplaceHealthDomain, data: {
  support?: SupportAnalytics;
  disputes?: DisputeAnalytics;
  incidents?: IncidentAnalytics;
  fulfillment?: FulfillmentSnapshot;
  sellers?: SellerOperationsSnapshot;
  customers?: CustomerOperationsSnapshot;
  refunds?: RefundAnalytics;
}): HealthScore {
  switch (domain) {
    case "support": {
      const s = data.support;
      if (!s) return 50;
      let score = 70;
      score += s.slaComplianceRate * 15;
      score += s.satisfactionAverage * 3;
      score -= s.escalationRate * 20;
      if (s.openTickets > s.totalTickets * 0.3) score -= 15;
      return Math.max(0, Math.min(100, Math.round(score)));
    }
    case "disputes": {
      const d = data.disputes;
      if (!d) return 50;
      let score = 80;
      if (d.avgResolutionDays > 7) score -= 20;
      else if (d.avgResolutionDays > 4) score -= 10;
      score -= d.escalationRate * 15;
      if (d.openDisputes > d.totalDisputes * 0.4) score -= 15;
      return Math.max(0, Math.min(100, Math.round(score)));
    }
    case "incidents": {
      const i = data.incidents;
      if (!i) return 80;
      let score = 90;
      score -= i.openIncidents * 10;
      if (i.mttr > 24) score -= 15;
      if (i.mtta > 30) score -= 10;
      score += i.postmortemCompletionRate * 10;
      return Math.max(0, Math.min(100, Math.round(score)));
    }
    case "fulfillment": {
      const f = data.fulfillment;
      if (!f) return 50;
      let score = 60;
      score += f.onTimeRate * 30;
      score -= f.slaBreachCount * 2;
      score -= f.exceptionCount * 1;
      if (f.avgDeliveryDays > 5) score -= 10;
      return Math.max(0, Math.min(100, Math.round(score)));
    }
    case "sellers": {
      const sl = data.sellers;
      if (!sl) return 50;
      let score = 70;
      score += sl.avgFulfillmentRate * 15;
      score += (sl.avgCustomerRating / 5) * 10;
      score -= (sl.probationSellers + sl.suspendedSellers) * 2;
      score -= sl.openViolations * 3;
      return Math.max(0, Math.min(100, Math.round(score)));
    }
    case "customers": {
      const c = data.customers;
      if (!c) return 50;
      let score = 70;
      const healthyRate = c.totalCustomers > 0 ? c.healthyCustomers / c.totalCustomers : 0.5;
      score += healthyRate * 20;
      score += (c.avgSatisfaction / 5) * 10;
      score -= (c.openComplaints + c.pendingRefunds) * 2;
      return Math.max(0, Math.min(100, Math.round(score)));
    }
    case "refunds": {
      const r = data.refunds;
      if (!r) return 70;
      let score = 75;
      score += r.autoApprovalRate * 10;
      score -= r.fraudDetectedCount * 5;
      if (r.avgProcessingHours > 48) score -= 15;
      else if (r.avgProcessingHours > 24) score -= 5;
      return Math.max(0, Math.min(100, Math.round(score)));
    }
    default:
      return 50;
  }
}

// ─── KPI Generation ────────────────────────────────────────────────────────────

export function generateKPIs(data: {
  support: SupportAnalytics;
  disputes: DisputeAnalytics;
  incidents: IncidentAnalytics;
  fulfillment: FulfillmentSnapshot;
  sellers: SellerOperationsSnapshot;
  customers: CustomerOperationsSnapshot;
  refunds: RefundAnalytics;
}): MarketplaceKPI[] {
  const kpis: MarketplaceKPI[] = [
    { id: "kpi-sla-compliance", name: "SLA Compliance Rate", domain: "support", value: data.support.slaComplianceRate * 100, target: 95, unit: "%", trend: data.support.slaComplianceRate >= 0.95 ? "improving" : "degrading", status: data.support.slaComplianceRate >= 0.95 ? "good" : data.support.slaComplianceRate >= 0.85 ? "warning" : "critical" },
    { id: "kpi-csat", name: "Customer Satisfaction", domain: "support", value: data.support.satisfactionAverage, target: 4.2, unit: "/5", trend: data.support.satisfactionAverage >= 4.2 ? "improving" : "degrading", status: data.support.satisfactionAverage >= 4.2 ? "good" : data.support.satisfactionAverage >= 3.5 ? "warning" : "critical" },
    { id: "kpi-dispute-resolution", name: "Avg Dispute Resolution", domain: "disputes", value: data.disputes.avgResolutionDays, target: 5, unit: "days", trend: data.disputes.avgResolutionDays <= 5 ? "improving" : "degrading", status: data.disputes.avgResolutionDays <= 5 ? "good" : data.disputes.avgResolutionDays <= 7 ? "warning" : "critical" },
    { id: "kpi-on-time-delivery", name: "On-Time Delivery Rate", domain: "fulfillment", value: data.fulfillment.onTimeRate * 100, target: 95, unit: "%", trend: data.fulfillment.onTimeRate >= 0.95 ? "improving" : "degrading", status: data.fulfillment.onTimeRate >= 0.95 ? "good" : data.fulfillment.onTimeRate >= 0.85 ? "warning" : "critical" },
    { id: "kpi-seller-health", name: "Avg Seller Rating", domain: "sellers", value: data.sellers.avgCustomerRating, target: 4.3, unit: "/5", trend: data.sellers.avgCustomerRating >= 4.3 ? "improving" : "stable", status: data.sellers.avgCustomerRating >= 4.3 ? "good" : data.sellers.avgCustomerRating >= 3.8 ? "warning" : "critical" },
    { id: "kpi-incident-mttr", name: "Incident MTTR", domain: "incidents", value: data.incidents.mttr, target: 4, unit: "hrs", trend: data.incidents.mttr <= 4 ? "improving" : "degrading", status: data.incidents.mttr <= 4 ? "good" : data.incidents.mttr <= 12 ? "warning" : "critical" },
    { id: "kpi-refund-fraud", name: "Fraud Detection Count", domain: "refunds", value: data.refunds.fraudDetectedCount, target: 0, unit: "cases", trend: data.refunds.fraudDetectedCount === 0 ? "stable" : "degrading", status: data.refunds.fraudDetectedCount === 0 ? "good" : data.refunds.fraudDetectedCount <= 3 ? "warning" : "critical" },
    { id: "kpi-customer-health", name: "Healthy Customers", domain: "customers", value: data.customers.totalCustomers > 0 ? Math.round((data.customers.healthyCustomers / data.customers.totalCustomers) * 100) : 0, target: 80, unit: "%", trend: "stable", status: (data.customers.healthyCustomers / Math.max(data.customers.totalCustomers, 1)) >= 0.8 ? "good" : "warning" },
  ];
  return kpis;
}

// ─── Alert Generation ──────────────────────────────────────────────────────────

export function generateAlerts(data: {
  support: SupportAnalytics;
  disputes: DisputeAnalytics;
  incidents: IncidentAnalytics;
  fulfillment: FulfillmentSnapshot;
  sellers: SellerOperationsSnapshot;
  refunds: RefundAnalytics;
}): OperationalAlert[] {
  const alerts: OperationalAlert[] = [];
  const now = new Date().toISOString();

  if (data.support.slaComplianceRate < 0.85) {
    alerts.push({ id: "alert-sla-breach", domain: "support", severity: "critical", title: "SLA Compliance Below Threshold", description: `SLA compliance at ${(data.support.slaComplianceRate * 100).toFixed(0)}%, below 85% threshold`, metric: "sla_compliance_rate", threshold: 85, currentValue: data.support.slaComplianceRate * 100, suggestedAction: "Add more agents to high-priority queues", createdAt: now, acknowledgedAt: null });
  }

  if (data.disputes.openDisputes > 20) {
    alerts.push({ id: "alert-dispute-backlog", domain: "disputes", severity: "high", title: "High Dispute Backlog", description: `${data.disputes.openDisputes} open disputes exceeds threshold`, metric: "open_disputes", threshold: 20, currentValue: data.disputes.openDisputes, suggestedAction: "Assign additional mediators to dispute queue", createdAt: now, acknowledgedAt: null });
  }

  if (data.incidents.openIncidents > 0) {
    alerts.push({ id: "alert-active-incidents", domain: "incidents", severity: "urgent" as Priority, title: "Active Incidents", description: `${data.incidents.openIncidents} incident(s) currently active`, metric: "open_incidents", threshold: 0, currentValue: data.incidents.openIncidents, suggestedAction: "Review and respond to active incidents", createdAt: now, acknowledgedAt: null });
  }

  if (data.fulfillment.onTimeRate < 0.9) {
    alerts.push({ id: "alert-delivery-rate", domain: "fulfillment", severity: "high", title: "Delivery Performance Degraded", description: `On-time delivery at ${(data.fulfillment.onTimeRate * 100).toFixed(0)}%`, metric: "on_time_delivery", threshold: 90, currentValue: data.fulfillment.onTimeRate * 100, suggestedAction: "Investigate carrier performance and seller fulfillment SLAs", createdAt: now, acknowledgedAt: null });
  }

  if (data.sellers.suspendedSellers > 0) {
    alerts.push({ id: "alert-suspended-sellers", domain: "sellers", severity: "medium", title: "Suspended Sellers", description: `${data.sellers.suspendedSellers} seller(s) currently suspended`, metric: "suspended_sellers", threshold: 0, currentValue: data.sellers.suspendedSellers, suggestedAction: "Review suspended seller cases for resolution", createdAt: now, acknowledgedAt: null });
  }

  if (data.refunds.fraudDetectedCount > 3) {
    alerts.push({ id: "alert-refund-fraud", domain: "refunds", severity: "critical", title: "Refund Fraud Spike", description: `${data.refunds.fraudDetectedCount} fraud-suspected refund requests detected`, metric: "fraud_count", threshold: 3, currentValue: data.refunds.fraudDetectedCount, suggestedAction: "Investigate fraud patterns and tighten refund controls", createdAt: now, acknowledgedAt: null });
  }

  return alerts;
}

// ─── Unified Marketplace Operations Snapshot ───────────────────────────────────

export function computeMarketplaceOperationsSnapshot(data: {
  support: SupportAnalytics;
  disputes: DisputeAnalytics;
  incidents: IncidentAnalytics;
  fulfillment: FulfillmentSnapshot;
  sellers: SellerOperationsSnapshot;
  customers: CustomerOperationsSnapshot;
  refunds: RefundAnalytics;
}): MarketplaceOperationsSnapshot {
  const domains: MarketplaceHealthDomain[] = ["support", "disputes", "incidents", "fulfillment", "sellers", "customers", "refunds"];
  const healthByDomain = {} as Record<MarketplaceHealthDomain, HealthScore>;

  for (const domain of domains) {
    healthByDomain[domain] = computeDomainHealth(domain, data);
  }

  const overallHealth = Math.round(Object.values(healthByDomain).reduce((a, b) => a + b, 0) / domains.length);

  return {
    overallHealth,
    healthByDomain,
    kpis: generateKPIs(data),
    activeAlerts: generateAlerts(data),
    supportSnapshot: data.support,
    customerSnapshot: data.customers,
    sellerSnapshot: data.sellers,
    disputeSnapshot: data.disputes,
    incidentSnapshot: data.incidents,
    fulfillmentSnapshot: data.fulfillment,
    refundSnapshot: data.refunds,
  };
}
