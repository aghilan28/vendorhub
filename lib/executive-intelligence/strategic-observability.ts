import { globalReplayKey, type GlobalRegion } from "@/lib/global-infrastructure";
import type {
  ExecutiveCommerceSignals,
  ExecutiveDomain,
  ExecutiveSeverity,
  ExecutiveTimelineEvent,
  StrategicAnomaly,
} from "./types";

function severity(score: number): ExecutiveSeverity {
  if (score >= 75) return "critical";
  if (score >= 35) return "watch";
  return "info";
}

function anomaly(input: {
  domain: ExecutiveDomain;
  title: string;
  score: number;
  correlatedDomains: ExecutiveDomain[];
  evidence: string[];
  explanation: string;
  recommendedAction: string;
}): StrategicAnomaly | null {
  const anomalySeverity = severity(input.score);
  if (anomalySeverity === "info") return null;
  const replayTraceKey = globalReplayKey(["executive-anomaly", input.domain, input.title, input.evidence.join("|")]);

  return {
    id: replayTraceKey.slice(0, 24),
    domain: input.domain,
    severity: anomalySeverity,
    title: input.title,
    businessImpactScore: Math.min(100, Math.round(input.score)),
    correlatedDomains: input.correlatedDomains,
    replayTraceKey,
    evidence: input.evidence,
    explanation: input.explanation,
    recommendedAction: input.recommendedAction,
  };
}

export function correlateStrategicAnomalies(signals: ExecutiveCommerceSignals): StrategicAnomaly[] {
  const anomalies = [
    anomaly({
      domain: "marketplace",
      title: "Marketplace throughput pressure",
      score: signals.fulfillmentDelayRate * 55 + signals.inventoryStockoutRate * 45 + Math.max(0, signals.orders24h - signals.orders7d / 7) * 0.4,
      correlatedDomains: ["inventory", "logistics", "seller"],
      evidence: [`${signals.orders24h} orders in 24h`, `${Math.round(signals.inventoryStockoutRate * 100)}% stockout rate`, `${Math.round(signals.fulfillmentDelayRate * 100)}% fulfillment delay rate`],
      explanation: "Demand pressure is operationally meaningful when inventory and fulfillment are stressed at the same time.",
      recommendedAction: "Prioritize stockout categories, protect fulfillment speed, and delay optional growth pushes until capacity is ready.",
    }),
    anomaly({
      domain: "finance",
      title: "Finance volatility escalation",
      score: signals.financeReplayFrequency * 120 + signals.reconciliationBacklog * 0.35 + signals.payoutLatencyHours * 0.35,
      correlatedDomains: ["governance", "autonomous"],
      evidence: [`${Math.round(signals.financeReplayFrequency * 100)}% finance replay`, `${signals.reconciliationBacklog} reconciliation backlog`, `${signals.payoutLatencyHours}h payout latency`],
      explanation: "Finance volatility affects payout safety, seller trust, and executive risk posture.",
      recommendedAction: "Keep payout decisions reconciliation-first and group finance anomalies by replay trace.",
    }),
    anomaly({
      domain: "logistics",
      title: "Logistics overload prediction",
      score: signals.logisticsDispatchBacklog * 0.18 + signals.logisticsZonePressure * 70 + signals.realtimeReconnects * 0.1,
      correlatedDomains: ["marketplace", "global"],
      evidence: [`${signals.logisticsDispatchBacklog} dispatch backlog`, `${Math.round(signals.logisticsZonePressure * 100)}% zone pressure`, `${signals.realtimeReconnects} realtime reconnects`],
      explanation: "Dispatch backlog and zone pressure indicate buyer-visible delivery degradation before orders fail.",
      recommendedAction: "Reserve dispatch capacity, tune promise windows, and watch region-level queue pressure.",
    }),
    anomaly({
      domain: "ai",
      title: "AI commerce degradation trend",
      score: signals.aiFallbackRate * 85 + signals.aiRankingDrift * 55 + signals.replayAnomalyRate * 40,
      correlatedDomains: ["marketplace", "platform"],
      evidence: [`${Math.round(signals.aiFallbackRate * 100)}% AI fallback`, `${Math.round(signals.aiRankingDrift * 100)}% ranking drift`, `${Math.round(signals.replayAnomalyRate * 100)}% replay anomalies`],
      explanation: "AI degradation is treated as operational friction, not speculative insight.",
      recommendedAction: "Freeze risky ranking changes, prefer deterministic retrieval fallback, and refresh source diagnostics.",
    }),
    anomaly({
      domain: "governance",
      title: "Governance risk escalation",
      score: signals.governanceBacklog * 0.32 + signals.governanceHighRiskSignals * 4 + signals.tenantLeakageSignals * 100,
      correlatedDomains: ["seller", "finance", "platform"],
      evidence: [`${signals.governanceBacklog} governance backlog`, `${signals.governanceHighRiskSignals} high-risk signals`, `${signals.tenantLeakageSignals} tenant leakage signals`],
      explanation: "Governance pressure becomes executive-critical when backlog, high-risk signals, or tenant leakage appear.",
      recommendedAction: "Keep tenant-safe review queues approval-gated and prioritize high-risk cases before broad automation.",
    }),
    anomaly({
      domain: "global",
      title: "Regional instability trend",
      score: signals.regionalOutages * 45 + signals.regionalQueuePressure * 55 + signals.observabilityLagSeconds * 0.08,
      correlatedDomains: ["autonomous", "observability", "platform"],
      evidence: [`${signals.regionalOutages} regional outages`, `${Math.round(signals.regionalQueuePressure * 100)}% regional queue pressure`, `${signals.observabilityLagSeconds}s observability lag`],
      explanation: "Global pressure is executive-visible when routing, queue pressure, and observability are degraded together.",
      recommendedAction: "Hold failback decisions until replay cursors and regional health projections are coherent.",
    }),
    anomaly({
      domain: "platform",
      title: "Developer ecosystem reliability risk",
      score: signals.platformApiErrorRate * 120 + signals.webhookRetryRate * 80 + signals.replayAnomalyRate * 40,
      correlatedDomains: ["marketplace", "observability"],
      evidence: [`${Math.round(signals.platformApiErrorRate * 100)}% API errors`, `${Math.round(signals.webhookRetryRate * 100)}% webhook retry`, `${Math.round(signals.replayAnomalyRate * 100)}% replay anomalies`],
      explanation: "External platform instability can amplify commerce operations through webhook and API retry pressure.",
      recommendedAction: "Throttle unstable integrations, preserve tenant-scoped cursors, and group external alerts by replay key.",
    }),
    anomaly({
      domain: "autonomous",
      title: "Autonomous recovery executive watch",
      score: signals.autonomousCriticalIncidents * 12 + signals.remediationLoopSignals * 35 + signals.replayAnomalyRate * 55,
      correlatedDomains: ["observability", "global", "platform"],
      evidence: [`${signals.autonomousCriticalIncidents} critical incidents`, `${signals.remediationLoopSignals} loop signals`, `${Math.round(signals.replayAnomalyRate * 100)}% replay anomalies`],
      explanation: "Executive intelligence observes recovery health and does not replace bounded remediation orchestration.",
      recommendedAction: "Keep remediation bounded, group executive alerts, and preserve recovery trace evidence.",
    }),
  ].filter((item): item is StrategicAnomaly => Boolean(item));

  return anomalies.sort((a, b) => b.businessImpactScore - a.businessImpactScore);
}

export function buildExecutiveTimeline(input: {
  anomalies: StrategicAnomaly[];
  regions: GlobalRegion[];
  now?: Date;
}): ExecutiveTimelineEvent[] {
  const now = input.now ?? new Date();
  return input.anomalies.slice(0, 8).map((anomaly, index) => ({
    id: globalReplayKey(["executive-timeline", anomaly.id, index]).slice(0, 24),
    at: new Date(now.getTime() - index * 60_000).toISOString(),
    domain: anomaly.domain,
    severity: anomaly.severity,
    summary: `${anomaly.title} across ${anomaly.correlatedDomains.join(", ") || "single domain"} in ${input.regions.join("/")}`,
    replayTraceKey: anomaly.replayTraceKey,
  }));
}
