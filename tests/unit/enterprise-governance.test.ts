import { describe, expect, it } from "vitest";
import {
  buildEnterpriseAuditEvent,
  createTenantEnvelope,
  diagnosePermissionDrift,
  evaluateEnterpriseLoad,
  evaluatePermission,
  retentionCursorForAuditExport,
  scoreOrganizationHealth,
  simulateEnterpriseFailure,
  validateAuditRecovery,
  validateEnterpriseGovernance,
  validateTenantIsolation,
} from "@/lib/enterprise-governance";
import { evaluateOperationalAlerts } from "@/lib/observability/alerts";

const quietSignals = {
  checkoutFailureRate: 0,
  paymentMismatchCount: 0,
  webhookRetryCount: 0,
  openIntegrityAlerts: 0,
  realtimeReconnects: 0,
  activeRealtimeChannels: 0,
  aiFallbackRate: 0,
  staleEmbeddingCount: 0,
  dbFailedWrites: 0,
  authFailureCount: 0,
  refundOpenCount: 0,
  deliveryDelayedCount: 0,
  moderationBacklog: 0,
};

describe("phase 35 enterprise governance hardening", () => {
  it("blocks lower-scope permission grants from escalating across workspaces", () => {
    const actor = {
      id: "actor-1",
      roles: [],
      organizationId: "org-1",
      workspaceIds: ["workspace-a", "workspace-b"],
    };
    const grantScope = createTenantEnvelope({ organizationId: "org-1", workspaceId: "workspace-a" });
    const targetScope = createTenantEnvelope({ organizationId: "org-1", workspaceId: "workspace-b" });

    const decision = evaluatePermission({
      actor,
      tenant: targetScope,
      permission: "finance.write",
      temporaryGrants: [{ permission: "finance.write", scope: grantScope, source: "temporary_elevation", expiresAt: "2030-01-01T00:00:00.000Z", approvalId: "approval-1" }],
      approvalId: "approval-1",
      now: new Date("2026-05-27T00:00:00.000Z"),
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("No matching scoped permission grant.");
  });

  it("detects permission drift before replaying elevation state", () => {
    const tenant = createTenantEnvelope({ organizationId: "org-1", workspaceId: "workspace-a" });
    const drift = diagnosePermissionDrift({
      actor: { id: "actor-1", roles: ["ORG_ADMIN"], organizationId: "org-1" },
      tenant,
      grants: [
        { permission: "permission.elevate", scope: tenant, source: "temporary_elevation", expiresAt: "2026-01-01T00:00:00.000Z" },
        { permission: "finance.write", scope: createTenantEnvelope({ organizationId: "org-2" }), source: "direct" },
      ],
      now: new Date("2026-05-27T00:00:00.000Z"),
    });

    expect(drift.safe).toBe(false);
    expect(drift.warnings).toEqual(expect.arrayContaining(["expired_temporary_grants", "unapproved_temporary_elevations", "cross_scope_grants"]));
  });

  it("keeps audit replay immutable and tenant-searchable", () => {
    const tenant = createTenantEnvelope({ organizationId: "org-1", workspaceId: "workspace-a", vendorId: "vendor-1" });
    const event = buildEnterpriseAuditEvent({
      eventType: "permission.elevate",
      tenant,
      subjectType: "permission",
      subjectId: "grant-1",
      actorId: "actor-1",
      metadata: { token: "secret", visible: "kept" },
      eventId: "approval-1",
      now: new Date("2026-05-27T00:00:00.000Z"),
    });

    const recovery = validateAuditRecovery([event, event]);
    const cursor = retentionCursorForAuditExport({ tenant, retentionDays: 30, now: new Date("2026-05-27T00:00:00.000Z") });

    expect(event.metadata.token).toBe("[redacted]");
    expect(recovery.safe).toBe(true);
    expect(recovery.replayCount).toBe(1);
    expect(cursor.exportPartition).toBe("org-1/workspace-a/vendor-1");
  });

  it("surfaces production safety risks across tenant, audit, health, and load signals", () => {
    const tenant = createTenantEnvelope({ organizationId: "org-1", workspaceId: "workspace-a" });
    const tenantDiagnostic = validateTenantIsolation({
      tenant,
      replayKey: "replay-1",
      expectedIsolationKey: "wrong-key",
      now: new Date("2026-05-27T00:00:00.000Z"),
    });
    const health = scoreOrganizationHealth({
      organizationId: "org-1",
      openIncidents: 4,
      auditBacklog: 600,
      permissionEscalations: 20,
      recoveryEvents: 5,
      slaBreaches: 3,
      queuePressure: 2,
      replayAnomalies: 3,
      isolationWarnings: 1,
    });
    const report = validateEnterpriseGovernance(
      {
        tenantDiagnostics: [tenantDiagnostic],
        permissionDiagnostics: [],
        auditBacklog: 600,
        auditReplayCount: 1,
        organizationHealth: [health],
        load: {
          organizations: 2,
          onboardingBurst: 40,
          permissionPropagationEvents: 500,
          analyticsQueries: 900,
          governanceEscalations: 200,
          realtimeEvents: 1000,
          concurrentTenantRequests: 800,
        },
      },
      new Date("2026-05-27T00:00:00.000Z"),
    );

    expect(report.productionSafe).toBe(false);
    expect(report.risks).toEqual(expect.arrayContaining(["tenant_isolation", "audit_durability", "organization_recovery", "governance_saturation"]));
    expect(evaluateEnterpriseLoad({
      organizations: 1,
      onboardingBurst: 0,
      permissionPropagationEvents: 0,
      analyticsQueries: 0,
      governanceEscalations: 0,
      realtimeEvents: 0,
      concurrentTenantRequests: 0,
    }).isolationMaintained).toBe(true);
  });

  it("maps enterprise failure and alert signals to safe recovery actions", () => {
    expect(simulateEnterpriseFailure("governance_saturation")).toMatchObject({
      tenantTruthProtected: true,
      crossTenantLeakage: false,
      recoverable: true,
    });

    const alerts = evaluateOperationalAlerts({
      ...quietSignals,
      tenantIsolationWarnings: 1,
      permissionAbuseSignals: 3,
      organizationRecoveryFailures: 1,
      auditInconsistencyCount: 1,
      tenantSaturationCount: 2,
    });

    expect(alerts.map((alert) => alert.id)).toEqual(expect.arrayContaining(["tenant-isolation-risk", "permission-abuse-risk", "enterprise-recovery-risk", "tenant-saturation-risk"]));
  });
});
