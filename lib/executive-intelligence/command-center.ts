import { GLOBAL_REGIONS, globalReplayKey, type GlobalRegion } from "@/lib/global-infrastructure";
import { detectForecastDrift, generateExecutiveForecasts } from "./forecasting";
import { generateDecisionSupport } from "./decision-support";
import { buildExecutiveTimeline, correlateStrategicAnomalies } from "./strategic-observability";
import type {
  ExecutiveCommandCenterSnapshot,
  ExecutiveCommerceSignals,
  ExecutiveSeverity,
  ExecutiveValidationReport,
} from "./types";

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function overallSeverity(snapshot: Pick<ExecutiveCommandCenterSnapshot, "anomalies" | "forecasts">): ExecutiveSeverity {
  if (snapshot.anomalies.some((anomaly) => anomaly.severity === "critical") || snapshot.forecasts.some((forecast) => forecast.driftRisk === "critical")) return "critical";
  if (snapshot.anomalies.some((anomaly) => anomaly.severity === "watch") || snapshot.forecasts.some((forecast) => forecast.driftRisk === "watch")) return "watch";
  return "info";
}

function strategicScore(signals: ExecutiveCommerceSignals) {
  const risk =
    signals.inventoryStockoutRate * 16 +
    signals.fulfillmentDelayRate * 14 +
    signals.financeReplayFrequency * 16 +
    signals.aiFallbackRate * 10 +
    signals.governanceHighRiskSignals * 0.8 +
    signals.regionalOutages * 8 +
    signals.platformApiErrorRate * 18 +
    signals.autonomousCriticalIncidents * 2 +
    Math.min(12, signals.observabilityLagSeconds / 45);
  return clamp(100 - risk);
}

function executiveSummary(input: {
  severity: ExecutiveSeverity;
  score: number;
  signals: ExecutiveCommerceSignals;
  anomalyCount: number;
  recommendationCount: number;
}) {
  const tone = input.severity === "critical" ? "Critical executive attention required" : input.severity === "watch" ? "Executive watch active" : "Executive operations stable";
  return `${tone}: strategic score ${input.score}/100 with ${input.anomalyCount} strategic anomalies and ${input.recommendationCount} advisory decisions. Demand, inventory, logistics, finance, governance, platform, and resilience signals remain explainable from operational telemetry.`;
}

export function buildExecutiveCommandCenter(input: {
  signals: ExecutiveCommerceSignals;
  regions?: GlobalRegion[];
  now?: Date;
  aggregationStartedAt?: number;
}): ExecutiveCommandCenterSnapshot {
  const now = input.now ?? new Date();
  const startedAt = input.aggregationStartedAt ?? Date.now();
  const regions = input.regions?.length ? input.regions : [...GLOBAL_REGIONS];
  const forecasts = generateExecutiveForecasts(input.signals, now);
  const drift = detectForecastDrift(forecasts);
  const anomalies = correlateStrategicAnomalies(input.signals);
  const recommendations = generateDecisionSupport({ signals: input.signals, forecasts, anomalies });
  const timeline = buildExecutiveTimeline({ anomalies, regions, now });
  const severity = overallSeverity({ anomalies, forecasts });
  const score = strategicScore(input.signals);
  const replayDiagnostics = [
    globalReplayKey(["executive-command", now.toISOString().slice(0, 16), forecasts.length, anomalies.length]),
    ...forecasts.slice(0, 3).map((forecast) => forecast.replaySnapshotKey),
  ];

  return {
    generatedAt: now.toISOString(),
    tenantSafe: input.signals.tenantLeakageSignals === 0,
    replaySafe: input.signals.replayAnomalyRate <= 0.08 && forecasts.every((forecast) => forecast.replaySnapshotKey.length === 64),
    overallSeverity: severity,
    executiveSummary: executiveSummary({
      severity,
      score,
      signals: input.signals,
      anomalyCount: anomalies.length,
      recommendationCount: recommendations.length,
    }),
    strategicScore: score,
    regions,
    forecasts,
    anomalies,
    recommendations,
    timeline,
    observability: {
      aggregationLatencyMs: Math.max(0, Date.now() - startedAt),
      staleForecasts: forecasts.filter((forecast) => forecast.stale).length,
      driftWarnings: drift.drifted.length,
      alertGroups: new Set(anomalies.map((anomaly) => `${anomaly.domain}:${anomaly.severity}`)).size,
      replayDiagnostics,
      explainability: [
        "Forecasts use current operational signals, short historical run-rate proxies, and explicit assumptions.",
        "Recommendations are advisory decision support and never replace human executives or governance approval.",
        "Executive timelines use replay keys to avoid duplicate strategic events during telemetry floods.",
      ],
    },
  };
}

export function validateExecutiveCommandCenter(snapshot: ExecutiveCommandCenterSnapshot, signals: ExecutiveCommerceSignals, now = new Date()): ExecutiveValidationReport {
  const risks: string[] = [];
  const drifted = snapshot.forecasts.filter((forecast) => forecast.driftRisk !== "info" || forecast.stale);
  const replaySafe = snapshot.replaySafe && snapshot.timeline.every((event) => event.replayTraceKey.length === 64);
  const tenantSafe = snapshot.tenantSafe && signals.tenantLeakageSignals === 0;
  const forecastObservable = snapshot.forecasts.every((forecast) => forecast.assumptions.length > 0 && forecast.explanation.length > 0 && forecast.confidence >= 0);

  if (!replaySafe) risks.push("executive_replay_instability");
  if (!tenantSafe) risks.push("tenant_intelligence_leakage_risk");
  if (!forecastObservable) risks.push("forecast_explainability_gap");
  if (snapshot.observability.staleForecasts > Math.max(1, snapshot.forecasts.length / 3)) risks.push("stale_forecast_risk");
  if (snapshot.observability.alertGroups > 8) risks.push("executive_alert_overload");
  if (signals.observabilityLagSeconds > 600) risks.push("executive_observability_fragmentation");

  return {
    productionSafe: risks.length === 0,
    replaySafe,
    tenantSafe,
    forecastObservable,
    risks,
    metrics: {
      forecastAccuracyProxy: Number((snapshot.forecasts.reduce((sum, forecast) => sum + forecast.confidence, 0) / Math.max(1, snapshot.forecasts.length)).toFixed(3)),
      forecastDriftRate: Number((drifted.length / Math.max(1, snapshot.forecasts.length)).toFixed(3)),
      strategicAnomalyFrequency: Number((snapshot.anomalies.length / 10).toFixed(3)),
      marketplaceGrowthPressure: Number(Math.max(0, signals.orders24h / Math.max(1, signals.orders7d / 7) - 1).toFixed(3)),
      infrastructureSaturationTrend: Number(Math.max(signals.regionalQueuePressure, signals.platformApiErrorRate, signals.observabilityLagSeconds / 900).toFixed(3)),
      regionalOperationalPressure: Number((signals.regionalOutages + signals.regionalQueuePressure).toFixed(3)),
      financeVolatilityIndicator: Number((signals.financeReplayFrequency + signals.reconciliationBacklog / 500 + signals.payoutLatencyHours / 120).toFixed(3)),
      logisticsDemandSpike: Number((signals.logisticsZonePressure + signals.logisticsDispatchBacklog / 500).toFixed(3)),
    },
    checkedAt: now.toISOString(),
  };
}

export function simulateExecutiveIntelligenceFailure(mode: "forecasting_drift_explosion" | "executive_alert_overload" | "intelligence_desynchronization" | "replay_inconsistency" | "anomaly_amplification" | "observability_fragmentation") {
  const actions = {
    forecasting_drift_explosion: ["mark forecasts advisory", "refresh source telemetry", "preserve forecast replay snapshots"],
    executive_alert_overload: ["group alerts by business impact", "suppress duplicate executive timelines", "surface top remediation owner"],
    intelligence_desynchronization: ["rebuild executive snapshot from domain truth", "discard stale aggregates", "show source freshness"],
    replay_inconsistency: ["quarantine duplicate strategic events", "recompute replay-safe timeline", "block derived forecast promotion"],
    anomaly_amplification: ["correlate anomalies across domains", "raise summary alert", "avoid duplicate executive notifications"],
    observability_fragmentation: ["fall back to regional and subsystem truth", "flag stale forecasts", "preserve operational evidence"],
  } as const;

  return {
    mode,
    executiveTruthProtected: true,
    autonomousReplacement: false,
    recoverable: true,
    recoveryActions: actions[mode],
  };
}
