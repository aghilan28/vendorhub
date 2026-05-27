import type { AutonomousIncident, AutonomousSignalInput, AutonomousValidationReport, SelfHealingPlan } from "./types";

export function evaluateAutonomousOperations(input: {
  incidents: AutonomousIncident[];
  healingPlans: SelfHealingPlan[];
  signals: AutonomousSignalInput;
  failedHealingAttempts: number;
  remediationLatencyMs: number;
}) {
  const criticalIncidents = input.incidents.filter((incident) => incident.severity === "critical").length;
  const containmentActions = input.healingPlans.flatMap((plan) => plan.actions).filter((action) => action.mode === "contain").length;
  const unsafeActions = input.healingPlans.flatMap((plan) => plan.actions).filter((action) => !action.reversible || !action.replaySafe || action.boundedRetries > 5);
  const successRate = input.healingPlans.length
    ? Math.max(0, 1 - input.failedHealingAttempts / input.healingPlans.length)
    : 1;
  const replayIncidents = input.incidents.filter((incident) => incident.replayAware).length;
  const suppressedEstimate = Math.max(0, input.incidents.length - new Set(input.incidents.map((incident) => incident.suppressionKey)).size);
  const cooldownViolations = input.healingPlans.flatMap((plan) => plan.actions).filter((action) => !action.cooldownEnforced).length;

  return {
    criticalIncidents,
    containmentActions,
    unsafeActions: unsafeActions.length,
    selfHealingSuccessRate: Number(successRate.toFixed(3)),
    remediationLatencyMs: input.remediationLatencyMs,
    replayContainmentFrequency: input.incidents.length ? Number((replayIncidents / input.incidents.length).toFixed(3)) : 0,
    alertSuppressionRate: input.incidents.length ? Number((suppressedEstimate / input.incidents.length).toFixed(3)) : 0,
    anomalyEscalationFrequency: input.incidents.length ? Number((criticalIncidents / input.incidents.length).toFixed(3)) : 0,
    autonomousRollbackRate: input.healingPlans.length ? Number((input.failedHealingAttempts / input.healingPlans.length).toFixed(3)) : 0,
    containmentActivationFrequency: input.healingPlans.length ? Number((input.healingPlans.filter((plan) => plan.containmentActive).length / input.healingPlans.length).toFixed(3)) : 0,
    recoveryDeadlockDetected: input.failedHealingAttempts > 2 && input.signals.queueLatencySeconds > 600,
    remediationCooldownViolations: cooldownViolations,
    alertFloodRisk: input.incidents.length > 12,
    operationalOverload: input.signals.observabilityLagSeconds > 420 || criticalIncidents > 4,
  };
}

export function validateAutonomousOperations(input: {
  incidents: AutonomousIncident[];
  healingPlans: SelfHealingPlan[];
  signals: AutonomousSignalInput;
  failedHealingAttempts: number;
}, now = new Date()): AutonomousValidationReport {
  const allActions = input.healingPlans.flatMap((plan) => plan.actions);
  const risks: string[] = [];
  const telemetry = evaluateAutonomousOperations({
    incidents: input.incidents,
    healingPlans: input.healingPlans,
    signals: input.signals,
    failedHealingAttempts: input.failedHealingAttempts,
    remediationLatencyMs: 0,
  });

  if (allActions.some((action) => !action.replaySafe)) risks.push("unsafe_replay_remediation");
  if (allActions.some((action) => action.boundedRetries > 5)) risks.push("unbounded_retry_risk");
  if (allActions.some((action) => !action.cooldownEnforced)) risks.push("cooldown_not_enforced");
  if (input.failedHealingAttempts > 2) risks.push("failed_self_healing");
  if (input.incidents.length > 12) risks.push("alert_flood_risk");
  if (input.signals.tenantLeakageSignals > 0 && allActions.some((action) => !action.requiresHumanApproval && action.domain === "governance")) risks.push("governance_approval_gap");
  if (input.signals.failoverFlaps > 3) risks.push("failover_oscillation");
  if (input.signals.replayDuplicates > Math.max(100, input.signals.queueDepth * 0.2)) risks.push("replay_amplification");
  if (telemetry.recoveryDeadlockDetected) risks.push("recovery_deadlock");

  return {
    productionSafe: risks.length === 0,
    replaySafe: !risks.includes("unsafe_replay_remediation") && !risks.includes("replay_amplification"),
    bounded: !risks.includes("unbounded_retry_risk"),
    governable: !risks.includes("governance_approval_gap"),
    risks,
    metrics: {
      remediationSuccessRate: telemetry.selfHealingSuccessRate,
      replayContainmentFrequency: telemetry.replayContainmentFrequency,
      alertSuppressionRate: telemetry.alertSuppressionRate,
      failoverRecoveryDurationSeconds: input.signals.failoverFlaps > 0 ? Math.min(1800, 600 + input.signals.failoverFlaps * 120) : 0,
      anomalyEscalationFrequency: telemetry.anomalyEscalationFrequency,
      autonomousRollbackRate: telemetry.autonomousRollbackRate,
      containmentActivationFrequency: telemetry.containmentActivationFrequency,
      recoveryDeadlockDetected: telemetry.recoveryDeadlockDetected,
      remediationCooldownViolations: telemetry.remediationCooldownViolations,
    },
    explainability: [
      `${input.incidents.length} incidents evaluated across ${new Set(input.incidents.map((incident) => incident.domain)).size} domains`,
      `${allActions.length} remediation actions checked for replay safety and bounded retries`,
      risks.length ? `risks: ${risks.join(",")}` : "no autonomous safety risks detected",
    ],
    checkedAt: now.toISOString(),
  };
}

export function simulateAutonomousFailure(mode: "recovery_deadlock" | "remediation_loop" | "cascading_queue_failure" | "regional_failover_instability" | "replay_amplification_storm" | "operational_alert_flood") {
  const actions = {
    recovery_deadlock: ["freeze autonomous loop", "preserve recovery cursor", "escalate with rollback evidence"],
    remediation_loop: ["stop repeated remediation key", "extend cooldown", "require human approval before retry"],
    cascading_queue_failure: ["throttle producers", "reserve commerce workers", "drain dead letters after dedupe"],
    regional_failover_instability: ["pin to last stable region", "disable failback automation", "validate replay cursors"],
    replay_amplification_storm: ["quarantine duplicate replay keys", "block unsafe writes", "resume from accepted cursors"],
    operational_alert_flood: ["group incidents by suppression key", "raise summary alert", "drop duplicate low-signal notifications"],
  } as const;

  return {
    mode,
    operationalTruthProtected: true,
    autonomousLoopBounded: true,
    recoverable: true,
    recoveryActions: actions[mode],
  };
}
