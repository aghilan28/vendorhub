import { createHash } from "crypto";
import type { AutonomousDomain, AutonomousIncident, AutonomousSignalInput, IncidentSeverity } from "./types";

function incidentId(parts: Array<string | number | boolean>) {
  return createHash("sha256").update(parts.join(":")).digest("hex").slice(0, 24);
}

function severityFor(value: number, watch: number, critical: number): IncidentSeverity {
  if (value >= critical) return "critical";
  if (value >= watch) return "watch";
  return "info";
}

function escalationCooldownFor(severity: IncidentSeverity) {
  if (severity === "critical") return 900;
  if (severity === "watch") return 300;
  return 60;
}

function anomalyScoreFor(severity: IncidentSeverity, correlatedSignals: string[]) {
  const severityWeight = severity === "critical" ? 1 : severity === "watch" ? 0.6 : 0.2;
  return Number(Math.min(1, severityWeight + correlatedSignals.length * 0.04).toFixed(3));
}

export function diagnoseAnomalyReplay(input: AutonomousSignalInput) {
  const replayRatio = input.replayDuplicates / Math.max(1, input.queueDepth + input.retryCount);
  const externalReplayRatio = Math.max(input.financeReplayRate, input.webhookRetryRate);
  const diagnostics = [
    `queue replay ratio ${Math.round(replayRatio * 100)}%`,
    `finance replay ${Math.round(input.financeReplayRate * 100)}%`,
    `webhook retry ${Math.round(input.webhookRetryRate * 100)}%`,
  ];

  return {
    replayRatio: Number(replayRatio.toFixed(3)),
    externalReplayRatio: Number(externalReplayRatio.toFixed(3)),
    severe: replayRatio > 0.2 || externalReplayRatio > 0.3 || input.deadLetters > 0,
    diagnostics,
  };
}

function buildIncident(input: {
  domain: AutonomousDomain;
  severity: IncidentSeverity;
  title: string;
  signal: string;
  correlatedSignals: string[];
  replayAware?: boolean;
  tenantSafe?: boolean;
  diagnostics?: string[];
  now: Date;
}): AutonomousIncident {
  const anomalyScore = anomalyScoreFor(input.severity, input.correlatedSignals);
  const groupKey = `${input.domain}:${input.correlatedSignals.slice().sort().join("+")}`;
  return {
    id: incidentId([input.domain, input.title, input.signal, input.now.toISOString().slice(0, 16)]),
    domain: input.domain,
    severity: input.severity,
    title: input.title,
    signal: input.signal,
    correlatedSignals: input.correlatedSignals,
    anomalyScore,
    groupKey,
    replayAware: input.replayAware ?? false,
    tenantSafe: input.tenantSafe ?? true,
    suppressionKey: `${input.domain}:${input.title}`,
    escalationCooldownSeconds: escalationCooldownFor(input.severity),
    diagnostics: input.diagnostics ?? [`${input.correlatedSignals.length} correlated signals`, `anomaly score ${anomalyScore}`],
    explainability: {
      summary: `${input.title} classified as ${input.severity} for ${input.domain}.`,
      evidence: [input.signal, ...input.correlatedSignals],
      operatorAction: input.severity === "critical" ? "escalate with containment evidence and keep remediation bounded" : "monitor grouped signals and allow bounded remediation",
    },
    detectedAt: input.now.toISOString(),
  };
}

export function detectAutonomousIncidents(input: AutonomousSignalInput, now = new Date()): AutonomousIncident[] {
  const incidents: AutonomousIncident[] = [];
  const replayDiagnostics = diagnoseAnomalyReplay(input);
  const queueSeverity = severityFor(Math.max(input.queueDepth / 500, input.queueLatencySeconds / 300, input.retryCount / 40), 1, 1.8);
  const replaySeverity = severityFor(input.replayDuplicates / Math.max(1, input.queueDepth + input.retryCount), 0.08, 0.2);
  const globalSeverity = severityFor(input.regionalOutages + input.failoverFlaps / 3, 1, 2);
  const realtimeSeverity = severityFor(Math.max(input.realtimeReconnects / 25, input.activeRealtimeChannels / 80), 1, 1.8);
  const financeSeverity = severityFor(Math.max(input.financeReplayRate / 0.08, input.reconciliationBacklog / 80), 1, 1.8);
  const platformSeverity = severityFor(Math.max(input.webhookRetryRate / 0.12, input.webhookDeadLetters / 10), 1, 1.8);

  if (queueSeverity !== "info") {
    incidents.push(buildIncident({
      domain: "async",
      severity: queueSeverity,
      title: "Distributed queue saturation",
      signal: `${input.queueDepth} queued, ${input.queueLatencySeconds}s latency, ${input.retryCount} retries`,
      correlatedSignals: ["queue_depth", "queue_latency", "retry_count"],
      replayAware: input.replayDuplicates > 0,
      diagnostics: ["queue saturation pressure exceeded", ...replayDiagnostics.diagnostics],
      now,
    }));
  }
  if (replaySeverity !== "info" || input.deadLetters > 0) {
    incidents.push(buildIncident({
      domain: "async",
      severity: input.deadLetters > 0 ? "critical" : replaySeverity,
      title: "Replay amplification risk",
      signal: `${input.replayDuplicates} duplicate replay signals, ${input.deadLetters} dead letters`,
      correlatedSignals: ["replay_duplicates", "dead_letters"],
      replayAware: true,
      diagnostics: replayDiagnostics.diagnostics,
      now,
    }));
  }
  if (globalSeverity !== "info") {
    incidents.push(buildIncident({
      domain: "global",
      severity: globalSeverity,
      title: "Regional failover instability",
      signal: `${input.regionalOutages} outages, ${input.failoverFlaps} failover flaps`,
      correlatedSignals: ["regional_outages", "failover_flaps"],
      replayAware: true,
      diagnostics: [`failover flap count ${input.failoverFlaps}`, ...replayDiagnostics.diagnostics],
      now,
    }));
  }
  if (input.edgeInvalidationBacklog > 500) {
    incidents.push(buildIncident({
      domain: "edge",
      severity: input.edgeInvalidationBacklog > 1200 ? "critical" : "watch",
      title: "Edge invalidation backlog",
      signal: `${input.edgeInvalidationBacklog} pending invalidations`,
      correlatedSignals: ["edge_backlog"],
      replayAware: true,
      diagnostics: ["edge invalidation backlog can amplify stale cache replay"],
      now,
    }));
  }
  if (realtimeSeverity !== "info") {
    incidents.push(buildIncident({
      domain: "realtime",
      severity: realtimeSeverity,
      title: "Realtime saturation",
      signal: `${input.realtimeReconnects} reconnects, ${input.activeRealtimeChannels} channels`,
      correlatedSignals: ["realtime_reconnects", "active_channels"],
      replayAware: input.replayDuplicates > 0,
      diagnostics: ["realtime fanout pressure detected", ...replayDiagnostics.diagnostics],
      now,
    }));
  }
  if (input.aiFallbackRate >= 0.25) {
    incidents.push(buildIncident({
      domain: "ai",
      severity: input.aiFallbackRate >= 0.45 ? "critical" : "watch",
      title: "AI degradation cascade",
      signal: `${Math.round(input.aiFallbackRate * 100)}% AI fallback`,
      correlatedSignals: ["ai_fallback"],
      diagnostics: ["AI fallback rate breached adaptive recovery threshold"],
      now,
    }));
  }
  if (financeSeverity !== "info") {
    incidents.push(buildIncident({
      domain: "finance",
      severity: financeSeverity,
      title: "Finance replay or reconciliation overload",
      signal: `${Math.round(input.financeReplayRate * 100)}% finance replay, ${input.reconciliationBacklog} reconciliation backlog`,
      correlatedSignals: ["finance_replay", "reconciliation_backlog"],
      replayAware: true,
      diagnostics: ["finance recovery must preserve ledger truth", ...replayDiagnostics.diagnostics],
      now,
    }));
  }
  if (input.logisticsProviderOutages > 0) {
    incidents.push(buildIncident({
      domain: "logistics",
      severity: input.logisticsProviderOutages > 1 ? "critical" : "watch",
      title: "Logistics provider outage",
      signal: `${input.logisticsProviderOutages} unhealthy providers`,
      correlatedSignals: ["provider_outage"],
      diagnostics: ["provider failover requires cooldown before broad reroute"],
      now,
    }));
  }
  if (input.governanceBacklog > 50 || input.tenantLeakageSignals > 0) {
    incidents.push(buildIncident({
      domain: "governance",
      severity: input.tenantLeakageSignals > 0 || input.governanceBacklog > 120 ? "critical" : "watch",
      title: "Governance remediation pressure",
      signal: `${input.governanceBacklog} governance backlog, ${input.tenantLeakageSignals} tenant leakage signals`,
      correlatedSignals: ["governance_backlog", "tenant_leakage"],
      tenantSafe: input.tenantLeakageSignals === 0,
      replayAware: true,
      diagnostics: [`tenant leakage signals ${input.tenantLeakageSignals}`, "governance remediation remains approval-gated"],
      now,
    }));
  }
  if (platformSeverity !== "info") {
    incidents.push(buildIncident({
      domain: "developer_platform",
      severity: platformSeverity,
      title: "Developer platform webhook instability",
      signal: `${Math.round(input.webhookRetryRate * 100)}% retry rate, ${input.webhookDeadLetters} dead letters`,
      correlatedSignals: ["webhook_retry", "webhook_dead_letters"],
      replayAware: true,
      diagnostics: ["external replay containment required before webhook drain", ...replayDiagnostics.diagnostics],
      now,
    }));
  }
  if (input.observabilityLagSeconds > 180) {
    incidents.push(buildIncident({
      domain: "observability",
      severity: input.observabilityLagSeconds > 420 ? "critical" : "watch",
      title: "Observability lag",
      signal: `${input.observabilityLagSeconds}s lag`,
      correlatedSignals: ["observability_lag"],
      diagnostics: ["global health projection may be fragmented"],
      now,
    }));
  }

  return suppressIncidentFloods(incidents);
}

export function suppressIncidentFloods(incidents: AutonomousIncident[], maxPerSuppressionKey = 1) {
  const seen = new Map<string, number>();
  return incidents.filter((incident) => {
    const count = seen.get(incident.suppressionKey) ?? 0;
    seen.set(incident.suppressionKey, count + 1);
    return count < maxPerSuppressionKey;
  });
}

export function groupCorrelatedIncidents(incidents: AutonomousIncident[]) {
  return incidents.reduce<Record<string, AutonomousIncident[]>>((groups, incident) => {
    groups[incident.groupKey] = [...(groups[incident.groupKey] ?? []), incident];
    return groups;
  }, {});
}
