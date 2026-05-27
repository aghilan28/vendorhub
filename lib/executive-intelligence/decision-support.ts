import { globalReplayKey } from "@/lib/global-infrastructure";
import type {
  ExecutiveCommerceSignals,
  ExecutiveDecisionRecommendation,
  ExecutiveDomain,
  ExecutiveForecast,
  StrategicAnomaly,
} from "./types";

function recommendation(input: {
  domain: ExecutiveDomain;
  title: string;
  recommendation: string;
  businessImpactScore: number;
  governanceSafe: boolean;
  requiresHumanApproval?: boolean;
  reasoning: string[];
}): ExecutiveDecisionRecommendation {
  const replayTraceKey = globalReplayKey(["executive-decision", input.domain, input.title, input.reasoning.join("|")]);
  return {
    id: replayTraceKey.slice(0, 24),
    priority: Math.max(1, Math.min(100, Math.round(input.businessImpactScore))),
    domain: input.domain,
    title: input.title,
    recommendation: input.recommendation,
    businessImpactScore: Math.max(0, Math.min(100, Math.round(input.businessImpactScore))),
    governanceSafe: input.governanceSafe,
    requiresHumanApproval: input.requiresHumanApproval ?? (input.businessImpactScore >= 75 || !input.governanceSafe),
    reasoning: input.reasoning,
    replayTraceKey,
  };
}

function forecastValue(forecasts: ExecutiveForecast[], metric: string) {
  return forecasts.find((forecast) => forecast.metric === metric);
}

export function generateDecisionSupport(input: {
  signals: ExecutiveCommerceSignals;
  forecasts: ExecutiveForecast[];
  anomalies: StrategicAnomaly[];
}): ExecutiveDecisionRecommendation[] {
  const recommendations: ExecutiveDecisionRecommendation[] = [];
  const stockout = forecastValue(input.forecasts, "stockout_pressure");
  const logistics = forecastValue(input.forecasts, "logistics_saturation");
  const payout = forecastValue(input.forecasts, "payout_risk");
  const demand = forecastValue(input.forecasts, "order_demand");
  const overload = forecastValue(input.forecasts, "operational_overload");

  if ((stockout?.predictedValue ?? 0) > 0.25 || input.signals.inventoryStockoutRate > 0.18) {
    recommendations.push(recommendation({
      domain: "inventory",
      title: "Prioritize inventory pressure before growth",
      recommendation: "Focus restock planning on high-demand categories and pause optional visibility pushes for stockout-prone segments.",
      businessImpactScore: 70 + input.signals.inventoryStockoutRate * 40,
      governanceSafe: true,
      reasoning: [
        stockout?.explanation ?? "Stockout forecast unavailable.",
        `${Math.round(input.signals.inventoryStockoutRate * 100)}% current stockout pressure`,
        "Recommendation is advisory and does not place purchase orders.",
      ],
    }));
  }

  if ((logistics?.predictedValue ?? 0) > 0.7 || input.signals.logisticsDispatchBacklog > 100) {
    recommendations.push(recommendation({
      domain: "logistics",
      title: "Protect delivery capacity",
      recommendation: "Reserve dispatch capacity, widen promise windows where needed, and review zone-level saturation before demand campaigns.",
      businessImpactScore: 68 + input.signals.logisticsZonePressure * 30,
      governanceSafe: true,
      reasoning: [
        logistics?.explanation ?? "Logistics forecast unavailable.",
        `${input.signals.logisticsDispatchBacklog} dispatch backlog`,
        "Provider failover remains controlled by logistics and resilience systems.",
      ],
    }));
  }

  if ((payout?.predictedValue ?? 0) > 0.65 || input.signals.financeReplayFrequency > 0.08) {
    recommendations.push(recommendation({
      domain: "finance",
      title: "Keep finance actions reconciliation-first",
      recommendation: "Prioritize reconciliation backlog and replay diagnostics before payout release or seller-facing financial promises.",
      businessImpactScore: 72 + input.signals.financeReplayFrequency * 60,
      governanceSafe: true,
      requiresHumanApproval: true,
      reasoning: [
        payout?.explanation ?? "Finance forecast unavailable.",
        `${Math.round(input.signals.financeReplayFrequency * 100)}% finance replay frequency`,
        "Finance recommendations do not bypass ledger or approval controls.",
      ],
    }));
  }

  if (input.signals.governanceHighRiskSignals > 0 || input.signals.tenantLeakageSignals > 0) {
    recommendations.push(recommendation({
      domain: "governance",
      title: "Sequence governance review before broad automation",
      recommendation: "Prioritize tenant-safe review queues and keep high-risk enforcement approval-gated.",
      businessImpactScore: 80 + input.signals.tenantLeakageSignals * 20,
      governanceSafe: input.signals.tenantLeakageSignals === 0,
      requiresHumanApproval: true,
      reasoning: [
        `${input.signals.governanceHighRiskSignals} high-risk governance signals`,
        `${input.signals.tenantLeakageSignals} tenant leakage signals`,
        "Executive intelligence must not expose or act on unsafe organizational state.",
      ],
    }));
  }

  if ((demand?.direction === "up" && input.signals.sellerHealthScore < 72) || input.signals.fulfillmentDelayRate > 0.12) {
    recommendations.push(recommendation({
      domain: "seller",
      title: "Support sellers before scaling demand",
      recommendation: "Route seller enablement toward fulfillment delay, stock coverage, and listing quality before accelerating demand.",
      businessImpactScore: 58 + input.signals.fulfillmentDelayRate * 70,
      governanceSafe: true,
      reasoning: [
        demand?.explanation ?? "Demand forecast unavailable.",
        `${input.signals.sellerHealthScore}/100 seller health score`,
        "Decision support is operational guidance, not automated seller intervention.",
      ],
    }));
  }

  if ((overload?.predictedValue ?? 0) > 0.5 || input.signals.autonomousCriticalIncidents > 2) {
    recommendations.push(recommendation({
      domain: "autonomous",
      title: "Group executive alerts around resilience traces",
      recommendation: "Reduce executive alert noise by grouping anomalies by replay trace and showing containment status first.",
      businessImpactScore: 74 + input.signals.autonomousCriticalIncidents * 4,
      governanceSafe: true,
      reasoning: [
        overload?.explanation ?? "Operational overload forecast unavailable.",
        `${input.signals.autonomousCriticalIncidents} critical autonomous incidents`,
        "Executive layer observes Phase 38 recovery without overriding bounded remediation.",
      ],
    }));
  }

  for (const anomaly of input.anomalies.slice(0, 3)) {
    if (recommendations.some((item) => item.domain === anomaly.domain)) continue;
    recommendations.push(recommendation({
      domain: anomaly.domain,
      title: `Review ${anomaly.title.toLowerCase()}`,
      recommendation: anomaly.recommendedAction,
      businessImpactScore: anomaly.businessImpactScore,
      governanceSafe: anomaly.domain !== "governance" || input.signals.tenantLeakageSignals === 0,
      requiresHumanApproval: anomaly.severity === "critical",
      reasoning: [anomaly.explanation, ...anomaly.evidence],
    }));
  }

  return recommendations.sort((a, b) => b.priority - a.priority).slice(0, 8);
}
