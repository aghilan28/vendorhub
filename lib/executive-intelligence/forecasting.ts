import { globalReplayKey } from "@/lib/global-infrastructure";
import type { ExecutiveCommerceSignals, ExecutiveDomain, ExecutiveForecast, ForecastHorizon } from "./types";

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function direction(currentValue: number, predictedValue: number): ExecutiveForecast["direction"] {
  if (predictedValue > currentValue * 1.05) return "up";
  if (predictedValue < currentValue * 0.95) return "down";
  return "flat";
}

function driftRisk(confidence: number, replayAnomalyRate: number, observabilityLagSeconds: number) {
  if (confidence < 0.5 || replayAnomalyRate > 0.08 || observabilityLagSeconds > 420) return "critical";
  if (confidence < 0.68 || replayAnomalyRate > 0.02 || observabilityLagSeconds > 180) return "watch";
  return "info";
}

function forecast(input: {
  signals: ExecutiveCommerceSignals;
  domain: ExecutiveDomain;
  metric: string;
  horizon: ForecastHorizon;
  currentValue: number;
  predictedValue: number;
  confidence: number;
  assumptions: string[];
  explanation: string;
  operationalImpact: string;
  now: Date;
}): ExecutiveForecast {
  const replaySnapshotKey = globalReplayKey([
    "executive-forecast",
    input.domain,
    input.metric,
    input.horizon,
    round(input.currentValue, 3),
    round(input.predictedValue, 3),
  ]);

  return {
    id: replaySnapshotKey.slice(0, 24),
    domain: input.domain,
    horizon: input.horizon,
    metric: input.metric,
    currentValue: round(input.currentValue),
    predictedValue: round(input.predictedValue),
    direction: direction(input.currentValue, input.predictedValue),
    confidence: round(clamp(input.confidence), 3),
    stale: input.signals.observabilityLagSeconds > 300,
    driftRisk: driftRisk(input.confidence, input.signals.replayAnomalyRate, input.signals.observabilityLagSeconds),
    replaySnapshotKey,
    assumptions: input.assumptions,
    explanation: input.explanation,
    operationalImpact: input.operationalImpact,
    observedAt: input.now.toISOString(),
  };
}

export function generateExecutiveForecasts(signals: ExecutiveCommerceSignals, now = new Date()): ExecutiveForecast[] {
  const demandRunRate = signals.orders7d > 0 ? signals.orders7d / 7 : signals.orders24h;
  const demandMomentum = signals.orders24h / Math.max(1, demandRunRate);
  const revenueRunRate = signals.revenue7d > 0 ? signals.revenue7d / 7 : signals.revenue24h;
  const growthPressure = clamp((demandMomentum - 1) * 0.5 + signals.inventoryStockoutRate + signals.fulfillmentDelayRate);
  const logisticsPressure = clamp(signals.logisticsZonePressure + signals.logisticsDispatchBacklog / 500);
  const financeVolatility = clamp(signals.financeReplayFrequency * 2 + signals.reconciliationBacklog / 250 + signals.payoutLatencyHours / 120);
  const anomalyPressure = clamp(signals.autonomousCriticalIncidents / 8 + signals.remediationLoopSignals / 4 + signals.replayAnomalyRate * 2);
  const confidencePenalty = clamp(signals.observabilityLagSeconds / 900 + signals.replayAnomalyRate + signals.tenantLeakageSignals * 0.25);

  return [
    forecast({
      signals,
      domain: "marketplace",
      metric: "order_demand",
      horizon: "7d",
      currentValue: signals.orders7d,
      predictedValue: Math.max(0, signals.orders7d + demandRunRate * (demandMomentum - 1) * 7),
      confidence: 0.82 - confidencePenalty - (signals.orders7d < 20 ? 0.16 : 0),
      assumptions: ["uses 24h order momentum against 7d order run rate", "does not blend tenants or unrelated seller demand"],
      explanation: `Demand momentum is ${round(demandMomentum, 2)}x the 7d run rate.`,
      operationalImpact: growthPressure > 0.5 ? "Prepare inventory, logistics, and support capacity before demand pressure reaches buyers." : "Current demand trend can be handled with normal operating cadence.",
      now,
    }),
    forecast({
      signals,
      domain: "inventory",
      metric: "stockout_pressure",
      horizon: "7d",
      currentValue: signals.inventoryStockoutRate,
      predictedValue: clamp(signals.inventoryStockoutRate + growthPressure * 0.18 + Math.max(0, 7 - signals.inventoryDaysOfCoverMedian) / 30),
      confidence: 0.78 - confidencePenalty,
      assumptions: ["uses stockout rate, median days of cover, and demand pressure", "forecast is advisory and does not trigger automatic purchasing"],
      explanation: `${round(signals.inventoryDaysOfCoverMedian, 1)} median days of cover with ${Math.round(signals.inventoryStockoutRate * 100)}% stockout pressure.`,
      operationalImpact: "Inventory pressure can reduce search eligibility, fulfillment reliability, and seller revenue capture.",
      now,
    }),
    forecast({
      signals,
      domain: "marketplace",
      metric: "revenue_pressure",
      horizon: "7d",
      currentValue: signals.revenue7d,
      predictedValue: Math.max(0, signals.revenue7d + revenueRunRate * (demandMomentum - 1) * 7),
      confidence: 0.76 - confidencePenalty - (signals.revenue7d <= 0 ? 0.18 : 0),
      assumptions: ["uses 24h revenue against 7d revenue run rate", "revenue forecast remains an operational proxy, not accounting truth"],
      explanation: `Revenue run rate is INR ${round(revenueRunRate)} per day with ${round(demandMomentum, 2)}x order momentum.`,
      operationalImpact: "Revenue pressure helps sequence seller support, inventory readiness, and finance reconciliation capacity.",
      now,
    }),
    forecast({
      signals,
      domain: "seller",
      metric: "seller_performance",
      horizon: "30d",
      currentValue: signals.sellerHealthScore,
      predictedValue: Math.max(0, signals.sellerHealthScore - signals.fulfillmentDelayRate * 18 - signals.governanceHighRiskSignals * 0.4 + Math.min(6, demandMomentum)),
      confidence: 0.74 - confidencePenalty,
      assumptions: ["uses seller health, fulfillment delay, governance risk, and demand movement", "seller guidance remains human-operated"],
      explanation: `Seller health is ${signals.sellerHealthScore}/100 with ${Math.round(signals.fulfillmentDelayRate * 100)}% fulfillment delay pressure.`,
      operationalImpact: "Declining seller performance should prioritize enablement, fulfillment support, and governance review sequencing.",
      now,
    }),
    forecast({
      signals,
      domain: "finance",
      metric: "payout_risk",
      horizon: "24h",
      currentValue: financeVolatility,
      predictedValue: clamp(financeVolatility + signals.financeReplayFrequency + signals.reconciliationBacklog / 500),
      confidence: 0.8 - confidencePenalty,
      assumptions: ["uses payout latency, replay frequency, and reconciliation backlog", "financial truth remains ledger-driven"],
      explanation: `Finance volatility combines ${signals.payoutLatencyHours}h payout latency and ${signals.reconciliationBacklog} reconciliation backlog.`,
      operationalImpact: "Higher payout risk requires reconciliation-first handling before release decisions.",
      now,
    }),
    forecast({
      signals,
      domain: "logistics",
      metric: "logistics_saturation",
      horizon: "24h",
      currentValue: logisticsPressure,
      predictedValue: clamp(logisticsPressure + signals.fulfillmentDelayRate * 0.35 + demandMomentum * 0.05),
      confidence: 0.77 - confidencePenalty,
      assumptions: ["uses dispatch backlog, zone pressure, fulfillment delay, and demand momentum", "provider failover remains cooldown-bound"],
      explanation: `Logistics pressure is driven by ${signals.logisticsDispatchBacklog} dispatch backlog and ${Math.round(signals.logisticsZonePressure * 100)}% zone pressure.`,
      operationalImpact: "Logistics saturation can become visible to buyers through delayed promises and reduced delivery confidence.",
      now,
    }),
    forecast({
      signals,
      domain: "autonomous",
      metric: "operational_overload",
      horizon: "24h",
      currentValue: anomalyPressure,
      predictedValue: clamp(anomalyPressure + signals.regionalQueuePressure * 0.2 + signals.webhookRetryRate * 0.25),
      confidence: 0.76 - confidencePenalty,
      assumptions: ["uses autonomous incident pressure, replay anomalies, queue pressure, and webhook retries", "executive layer observes recovery and does not override remediation"],
      explanation: `${signals.autonomousCriticalIncidents} critical autonomous incidents and ${signals.remediationLoopSignals} remediation-loop signals are active.`,
      operationalImpact: "Operational overload should prioritize containment, executive alert grouping, and recovery visibility.",
      now,
    }),
    forecast({
      signals,
      domain: "marketplace",
      metric: "customer_retention_pressure",
      horizon: "30d",
      currentValue: clamp(signals.fulfillmentDelayRate + signals.inventoryStockoutRate + signals.aiFallbackRate * 0.35),
      predictedValue: clamp(signals.fulfillmentDelayRate + signals.inventoryStockoutRate + signals.aiFallbackRate * 0.35 + signals.platformApiErrorRate * 0.25),
      confidence: 0.7 - confidencePenalty,
      assumptions: ["uses operational friction signals as retention pressure proxy", "does not infer personal behavior without observed signals"],
      explanation: "Retention pressure is modeled from fulfillment, inventory availability, AI fallback, and platform reliability.",
      operationalImpact: "Retention risk should be reduced through reliability, availability, and seller operations before growth campaigns.",
      now,
    }),
  ];
}

export function detectForecastDrift(forecasts: ExecutiveForecast[]) {
  const drifted = forecasts.filter((forecast) => forecast.driftRisk !== "info" || forecast.stale);
  return {
    drifted,
    driftRate: forecasts.length ? round(drifted.length / forecasts.length, 3) : 0,
    stable: drifted.every((forecast) => forecast.driftRisk !== "critical"),
    actions: drifted.length
      ? ["mark affected forecasts as advisory", "refresh source telemetry", "preserve replay snapshot before executive review"]
      : ["continue forecast monitoring"],
  };
}
