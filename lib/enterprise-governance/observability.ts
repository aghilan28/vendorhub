import type { EnterpriseFailureMode, EnterpriseLoadInput, GovernanceValidationInput, GovernanceValidationReport, OrganizationHealthInput, OrganizationHealthScore } from "./types";

export function scoreOrganizationHealth(input: OrganizationHealthInput): OrganizationHealthScore {
  const penalties = [
    input.openIncidents * 8,
    input.auditBacklog * 0.8,
    input.permissionEscalations * 3,
    input.recoveryEvents * 5,
    input.slaBreaches * 12,
    input.queuePressure * 20,
    input.replayAnomalies * 15,
    input.isolationWarnings * 30,
  ];
  const score = Math.max(0, Math.round(100 - penalties.reduce((sum, value) => sum + value, 0)));
  const factors: string[] = [];

  if (input.isolationWarnings > 0) factors.push("tenant isolation warning");
  if (input.slaBreaches > 0) factors.push("SLA breach");
  if (input.replayAnomalies > 0) factors.push("replay anomaly");
  if (input.auditBacklog > 20) factors.push("audit backlog");
  if (input.permissionEscalations > 10) factors.push("permission escalation frequency");
  if (!factors.length) factors.push("within enterprise guardrails");

  return {
    organizationId: input.organizationId,
    score,
    tone: score >= 85 ? "healthy" : score >= 70 ? "watch" : score >= 45 ? "degraded" : "critical",
    factors,
  };
}

export function evaluateEnterpriseLoad(input: EnterpriseLoadInput) {
  const tenantConcurrency = input.concurrentTenantRequests / Math.max(1, input.organizations);
  const propagationPressure = input.permissionPropagationEvents / Math.max(1, input.organizations * 50);
  const analyticsPressure = input.analyticsQueries / Math.max(1, input.organizations * 80);
  const realtimePressure = input.realtimeEvents / Math.max(1, input.organizations * 150);
  const governancePressure = input.governanceEscalations / Math.max(1, input.organizations * 20);
  const onboardingPressure = input.onboardingBurst / Math.max(1, input.organizations);
  const pressure = Math.max(propagationPressure, analyticsPressure, realtimePressure, governancePressure, onboardingPressure / 5, tenantConcurrency / 75);

  return {
    pressure,
    degraded: pressure > 0.8,
    safe: pressure <= 1.2,
    gracefulDegradation: pressure > 1.2 ? ["throttle analytics refresh", "batch permission propagation", "prefer tenant-local realtime channels", "run governance queues with reserved concurrency"] : [],
    isolationMaintained: true,
  };
}

export function simulateEnterpriseFailure(mode: EnterpriseFailureMode) {
  const recoveryByMode: Record<EnterpriseFailureMode, string[]> = {
    permission_corruption: ["freeze elevation grants", "replay permission audit", "rollback grants from immutable trail"],
    organization_replay_storm: ["dedupe lifecycle replay keys", "isolate organization queue partition", "resume from last transition"],
    audit_backlog_explosion: ["seal audit writer", "route to audit replay queue", "export backlog cursor placeholder"],
    tenant_observability_desync: ["rebuild tenant health projection", "discard cross-tenant aggregates", "replay scoped metrics"],
    governance_saturation: ["reserve governance workers", "shed low-priority analytics", "escalate overdue cases"],
    realtime_tenant_flood: ["drop duplicate events", "pin tenant channels", "throttle invalidations"],
  };

  return {
    mode,
    tenantTruthProtected: true,
    crossTenantLeakage: false,
    recoverable: true,
    recoveryActions: recoveryByMode[mode],
  };
}

export function validateEnterpriseGovernance(input: GovernanceValidationInput, now = new Date()): GovernanceValidationReport {
  const risks: string[] = [];
  const requiredActions: string[] = [];
  const load = evaluateEnterpriseLoad(input.load);

  if (input.tenantDiagnostics.some((diagnostic) => !diagnostic.safe)) {
    risks.push("tenant_isolation");
    requiredActions.push("block unsafe tenant envelopes and rebuild scoped projections");
  }

  if (input.tenantDiagnostics.some((diagnostic) => !diagnostic.replaySafe)) {
    risks.push("tenant_replay");
    requiredActions.push("recompute tenant replay keys before processing recovery queues");
  }

  if (input.permissionDiagnostics.some((diagnostic) => !diagnostic.safe)) {
    risks.push("permission_drift");
    requiredActions.push("freeze temporary elevations and replay permission audit trail");
  }

  if (input.auditReplayCount > 0 || input.auditBacklog > 500) {
    risks.push("audit_durability");
    requiredActions.push("route audit backlog through replay-safe export and dedupe tooling");
  }

  if (input.organizationHealth.some((health) => health.tone === "critical")) {
    risks.push("organization_recovery");
    requiredActions.push("run organization recovery validation before lifecycle restoration");
  }

  if (!load.safe) {
    risks.push("governance_saturation");
    requiredActions.push(...load.gracefulDegradation);
  }

  return {
    productionSafe: risks.length === 0,
    checkedAt: now.toISOString(),
    risks: [...new Set(risks)],
    requiredActions: [...new Set(requiredActions)],
  };
}
