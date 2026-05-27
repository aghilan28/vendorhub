import type { AutonomousIncident, AutonomousSignalInput, ContainmentPlan } from "./types";

export function planCascadingFailureContainment(input: {
  incidents: AutonomousIncident[];
  signals: AutonomousSignalInput;
}): ContainmentPlan {
  const criticalDomains = input.incidents.filter((incident) => incident.severity === "critical").map((incident) => incident.domain);
  const replayPressure = input.signals.replayDuplicates > 0 || input.signals.financeReplayRate > 0.08 || input.signals.webhookRetryRate > 0.12;
  const queuePressure = input.signals.queueDepth > 500 || input.signals.queueLatencySeconds > 300;
  const realtimePressure = input.signals.realtimeReconnects > 25 || input.signals.activeRealtimeChannels > 80;
  const tenantRisk = input.signals.tenantLeakageSignals > 0;
  const active = criticalDomains.length > 0 || replayPressure || queuePressure || realtimePressure || tenantRisk;
  const quarantinedDomains = [...new Set([
    ...(replayPressure ? ["async" as const, "finance" as const, "developer_platform" as const] : []),
    ...(tenantRisk ? ["governance" as const, "developer_platform" as const] : []),
  ])];
  const throttledDomains = [...new Set([
    ...(queuePressure ? ["async" as const, "ai" as const] : []),
    ...(realtimePressure ? ["realtime" as const] : []),
    ...(input.signals.edgeInvalidationBacklog > 500 ? ["edge" as const] : []),
  ])];
  const driftDetected = input.incidents.some((incident) => incident.domain === "observability" && incident.severity === "critical")
    || input.signals.observabilityLagSeconds > 420
    || input.signals.failoverFlaps > 3;

  return {
    active,
    quarantinedDomains,
    throttledDomains,
    degradedModes: [
      ...(input.signals.aiFallbackRate > 0.25 ? ["ai_keyword_fallback"] : []),
      ...(input.signals.regionalOutages > 0 ? ["regional_read_only_for_critical_writes"] : []),
      ...(input.signals.webhookDeadLetters > 0 ? ["webhook_dead_letter_recovery"] : []),
      ...(tenantRisk ? ["tenant_scoped_manual_approval"] : []),
    ],
    maxRetryBudget: criticalDomains.length ? 2 : 4,
    reason: criticalDomains.length
      ? `critical domains: ${criticalDomains.join(",")}`
      : replayPressure
        ? "replay pressure requires quarantine"
        : queuePressure || realtimePressure
          ? "traffic pressure requires throttling"
          : "containment not required",
    replayDiagnostics: [
      `${input.signals.replayDuplicates} duplicate replay signals`,
      `${Math.round(input.signals.financeReplayRate * 100)}% finance replay rate`,
      `${Math.round(input.signals.webhookRetryRate * 100)}% webhook retry rate`,
    ],
    recoveryValidation: [
      "accepted replay cursors are drained only after quarantine clears",
      "critical writes remain frozen when tenant or finance truth is uncertain",
      "observability lag is checked before containment release",
    ],
    quarantineRecoveryActions: quarantinedDomains.map((domain) => `validate ${domain} replay cursor before quarantine release`),
    adaptiveThrottlePercent: active ? Math.min(90, 25 + throttledDomains.length * 15 + criticalDomains.length * 10) : 0,
    driftDetected,
  };
}

export function detectRemediationLoop(input: {
  plansInWindow: number;
  repeatedSuppressionKeys: number;
  failedHealingAttempts: number;
}) {
  const loopRisk = input.plansInWindow > 8 || input.repeatedSuppressionKeys > 3 || input.failedHealingAttempts > 2;

  return {
    loopRisk,
    safeToContinue: !loopRisk,
    action: loopRisk ? "stop autonomous remediation loop and escalate incident commander review" : "continue bounded remediation",
  };
}
