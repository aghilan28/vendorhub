/**
 * MCP-1E Phase 11 — Operational Intelligence
 * Risk detection, forecasts, recommendations, marketplace health intelligence
 */

import type {
  DisputeAnalytics,
  CustomerOperationsSnapshot,
  FulfillmentSnapshot,
  HealthScore,
  IncidentAnalytics,
  MarketplaceHealthDomain,
  OperationalForecast,
  OperationalIntelligenceSnapshot,
  OperationalRecommendation,
  OperationalRisk,
  OperationalRiskType,
  Priority,
  RefundAnalytics,
  SellerOperationsSnapshot,
  SupportAnalytics,
} from "./types";

// ─── Risk Detection ────────────────────────────────────────────────────────────

export function detectOperationalRisks(data: {
  support: SupportAnalytics;
  disputes: DisputeAnalytics;
  incidents: IncidentAnalytics;
  fulfillment: FulfillmentSnapshot;
  sellers: SellerOperationsSnapshot;
  customers: CustomerOperationsSnapshot;
  refunds: RefundAnalytics;
}): OperationalRisk[] {
  const risks: OperationalRisk[] = [];
  const now = new Date().toISOString();

  // Support spike risk
  if (data.support.openTickets > data.support.totalTickets * 0.4) {
    risks.push({
      id: "risk-support-spike",
      type: "support_spike",
      severity: "high",
      title: "Support Ticket Backlog Growing",
      description: `${data.support.openTickets} open tickets (${Math.round((data.support.openTickets / Math.max(data.support.totalTickets, 1)) * 100)}% of total). SLA breaches likely within 24h.`,
      affectedDomain: "support",
      confidence: 0.85,
      detectedAt: now,
      recommendation: { id: "rec-support-spike", title: "Scale Support Capacity", description: "Add temporary agents or enable auto-responses for low-priority tickets", domain: "support", priority: "high", expectedImpact: "Reduce open ticket backlog by 40% within 48h", effort: "medium", status: "proposed" },
    });
  }

  // Dispute surge risk
  if (data.disputes.openDisputes > 15) {
    risks.push({
      id: "risk-dispute-surge",
      type: "dispute_surge",
      severity: "high",
      title: "Dispute Volume Surge",
      description: `${data.disputes.openDisputes} open disputes. Average resolution time: ${data.disputes.avgResolutionDays} days.`,
      affectedDomain: "disputes",
      confidence: 0.8,
      detectedAt: now,
      recommendation: { id: "rec-dispute-surge", title: "Accelerate Dispute Resolution", description: "Assign dedicated mediators and enable fast-track for clear-cut cases", domain: "disputes", priority: "high", expectedImpact: "Reduce dispute backlog by 50% within 7 days", effort: "medium", status: "proposed" },
    });
  }

  // Fulfillment degradation
  if (data.fulfillment.onTimeRate < 0.9) {
    risks.push({
      id: "risk-fulfillment-deg",
      type: "fulfillment_degradation",
      severity: "critical",
      title: "Fulfillment Performance Critically Low",
      description: `On-time delivery at ${(data.fulfillment.onTimeRate * 100).toFixed(0)}%. ${data.fulfillment.slaBreachCount} SLA breaches detected.`,
      affectedDomain: "fulfillment",
      confidence: 0.92,
      detectedAt: now,
      recommendation: { id: "rec-fulfillment-deg", title: "Enforce Seller Fulfillment SLAs", description: "Issue warnings to underperforming sellers and activate backup carriers", domain: "fulfillment", priority: "critical", expectedImpact: "Restore on-time rate to 95% within 14 days", effort: "high", status: "proposed" },
    });
  }

  // Seller risk cluster
  if (data.sellers.probationSellers + data.sellers.suspendedSellers > data.sellers.totalSellers * 0.1) {
    risks.push({
      id: "risk-seller-cluster",
      type: "seller_risk_cluster",
      severity: "medium",
      title: "Elevated Seller Risk Concentration",
      description: `${data.sellers.probationSellers + data.sellers.suspendedSellers} sellers on probation/suspended (${Math.round(((data.sellers.probationSellers + data.sellers.suspendedSellers) / Math.max(data.sellers.totalSellers, 1)) * 100)}% of marketplace).`,
      affectedDomain: "sellers",
      confidence: 0.75,
      detectedAt: now,
      recommendation: { id: "rec-seller-cluster", title: "Seller Recovery Program", description: "Launch targeted seller improvement workshops and clear violation backlogs", domain: "sellers", priority: "medium", expectedImpact: "Rehabilitate 60% of at-risk sellers within 30 days", effort: "high", status: "proposed" },
    });
  }

  // Customer churn wave
  if (data.customers.churningCustomers > data.customers.totalCustomers * 0.15) {
    risks.push({
      id: "risk-churn-wave",
      type: "customer_churn_wave",
      severity: "high",
      title: "Customer Churn Risk Elevated",
      description: `${data.customers.churningCustomers} customers in churning state (${Math.round((data.customers.churningCustomers / Math.max(data.customers.totalCustomers, 1)) * 100)}%).`,
      affectedDomain: "customers",
      confidence: 0.78,
      detectedAt: now,
      recommendation: { id: "rec-churn-wave", title: "Customer Retention Campaign", description: "Target churning customers with personalized win-back offers and proactive support outreach", domain: "customers", priority: "high", expectedImpact: "Recover 30% of churning customers within 21 days", effort: "medium", status: "proposed" },
    });
  }

  // Refund fraud pattern
  if (data.refunds.fraudDetectedCount > 5) {
    risks.push({
      id: "risk-refund-fraud",
      type: "refund_fraud_pattern",
      severity: "critical",
      title: "Refund Fraud Pattern Detected",
      description: `${data.refunds.fraudDetectedCount} fraud-suspected refund requests. Potential financial exposure: ₹${data.refunds.totalAmount}.`,
      affectedDomain: "refunds",
      confidence: 0.88,
      detectedAt: now,
      recommendation: { id: "rec-refund-fraud", title: "Tighten Refund Controls", description: "Reduce auto-approve threshold, increase verification for flagged accounts, and investigate patterns", domain: "refunds", priority: "critical", expectedImpact: "Block 90% of fraudulent refunds", effort: "low", status: "proposed" },
    });
  }

  // Incident precursor (multiple open incidents)
  if (data.incidents.openIncidents > 2) {
    risks.push({
      id: "risk-incident-precursor",
      type: "incident_precursor",
      severity: "critical",
      title: "Multiple Active Incidents Indicate Systemic Issue",
      description: `${data.incidents.openIncidents} incidents active simultaneously. Pattern may indicate a larger systemic failure.`,
      affectedDomain: "incidents",
      confidence: 0.7,
      detectedAt: now,
      recommendation: { id: "rec-incident-precursor", title: "Incident Correlation Review", description: "Investigate common root causes across active incidents and consider declaring a major incident", domain: "incidents", priority: "critical", expectedImpact: "Identify systemic root cause and prevent cascading failures", effort: "medium", status: "proposed" },
    });
  }

  return risks.sort((a, b) => {
    const severityOrder: Record<Priority, number> = { critical: 0, urgent: 1, high: 2, medium: 3, low: 4 };
    return (severityOrder[a.severity] ?? 5) - (severityOrder[b.severity] ?? 5);
  });
}

// ─── Operational Forecasts ─────────────────────────────────────────────────────

export function generateForecasts(data: {
  support: SupportAnalytics;
  disputes: DisputeAnalytics;
  fulfillment: FulfillmentSnapshot;
  refunds: RefundAnalytics;
}): OperationalForecast[] {
  return [
    {
      domain: "support",
      metric: "Ticket Volume (7d forecast)",
      currentValue: data.support.totalTickets,
      forecastValue: Math.round(data.support.totalTickets * (data.support.openTickets > data.support.totalTickets * 0.3 ? 1.2 : 1.05)),
      forecastPeriod: "7 days",
      confidence: 0.72,
      trend: data.support.openTickets > data.support.totalTickets * 0.3 ? "degrading" : "stable",
      riskIfUnaddressed: "SLA breaches will increase by 20% if ticket volume grows without capacity increase",
    },
    {
      domain: "disputes",
      metric: "Dispute Resolution Time",
      currentValue: data.disputes.avgResolutionDays,
      forecastValue: Number((data.disputes.avgResolutionDays * (data.disputes.openDisputes > 10 ? 1.15 : 0.95)).toFixed(1)),
      forecastPeriod: "14 days",
      confidence: 0.68,
      trend: data.disputes.openDisputes > 10 ? "degrading" : "improving",
      riskIfUnaddressed: "Disputes unresolved past SLA may trigger regulatory attention",
    },
    {
      domain: "fulfillment",
      metric: "On-Time Delivery Rate",
      currentValue: data.fulfillment.onTimeRate * 100,
      forecastValue: Number((data.fulfillment.onTimeRate * 100 * (data.fulfillment.slaBreachCount > 5 ? 0.95 : 1.02)).toFixed(1)),
      forecastPeriod: "7 days",
      confidence: 0.75,
      trend: data.fulfillment.slaBreachCount > 5 ? "degrading" : "improving",
      riskIfUnaddressed: "Delivery failures drive disputes and customer churn",
    },
    {
      domain: "refunds",
      metric: "Refund Processing Time",
      currentValue: data.refunds.avgProcessingHours,
      forecastValue: Number((data.refunds.avgProcessingHours * (data.refunds.fraudDetectedCount > 3 ? 1.3 : 0.9)).toFixed(1)),
      forecastPeriod: "7 days",
      confidence: 0.7,
      trend: data.refunds.fraudDetectedCount > 3 ? "degrading" : "improving",
      riskIfUnaddressed: "Slow refund processing drives support tickets and customer dissatisfaction",
    },
  ];
}

// ─── Operational Recommendations ───────────────────────────────────────────────

export function generateRecommendations(risks: OperationalRisk[], healthScores: Record<MarketplaceHealthDomain, HealthScore>): OperationalRecommendation[] {
  const recs: OperationalRecommendation[] = risks.map((r) => r.recommendation);

  // Add proactive recommendations based on health scores
  const domains = Object.entries(healthScores) as Array<[MarketplaceHealthDomain, HealthScore]>;
  const weakest = domains.sort((a, b) => a[1] - b[1]).slice(0, 2);

  for (const [domain, score] of weakest) {
    if (score < 70 && !recs.some((r) => r.domain === domain)) {
      recs.push({
        id: `rec-improve-${domain}`,
        title: `Improve ${domain.charAt(0).toUpperCase() + domain.slice(1)} Operations`,
        description: `${domain} health score is ${score}/100. Review processes, staffing, and SLAs for improvement opportunities.`,
        domain,
        priority: score < 50 ? "high" : "medium",
        expectedImpact: `Improve ${domain} health score from ${score} to ${Math.min(score + 15, 100)}`,
        effort: "medium",
        status: "proposed",
      });
    }
  }

  return recs.sort((a, b) => {
    const priorityOrder: Record<Priority, number> = { critical: 0, urgent: 1, high: 2, medium: 3, low: 4 };
    return (priorityOrder[a.priority] ?? 5) - (priorityOrder[b.priority] ?? 5);
  });
}

// ─── Full Intelligence Snapshot ────────────────────────────────────────────────

export function computeOperationalIntelligence(data: {
  support: SupportAnalytics;
  disputes: DisputeAnalytics;
  incidents: IncidentAnalytics;
  fulfillment: FulfillmentSnapshot;
  sellers: SellerOperationsSnapshot;
  customers: CustomerOperationsSnapshot;
  refunds: RefundAnalytics;
  healthScores: Record<MarketplaceHealthDomain, HealthScore>;
}): OperationalIntelligenceSnapshot {
  const risks = detectOperationalRisks(data);
  const recommendations = generateRecommendations(risks, data.healthScores);
  const forecasts = generateForecasts(data);

  // Generate health trend (last 7 days simulated from current score)
  const currentAvg = Math.round(Object.values(data.healthScores).reduce((a, b) => a + b, 0) / Object.values(data.healthScores).length);
  const healthTrend = Array.from({ length: 7 }, (_, i) => ({
    date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    score: Math.max(40, Math.min(100, currentAvg + Math.round((Math.random() - 0.5) * 10))) as HealthScore,
  }));
  healthTrend[6] = { date: new Date().toISOString().split("T")[0], score: currentAvg };

  // Top concerns
  const topConcerns = risks.slice(0, 3).map((r) => r.title);
  if (topConcerns.length === 0) topConcerns.push("No critical risks detected");

  return { risks, recommendations, forecasts, healthTrend, topConcerns };
}
