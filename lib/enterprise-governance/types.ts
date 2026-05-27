import type { Json } from "@/types/database";

export const ENTERPRISE_ROLES = [
  "ORG_OWNER",
  "ORG_ADMIN",
  "FINANCE_ADMIN",
  "LOGISTICS_ADMIN",
  "SUPPORT_ADMIN",
  "MODERATION_ADMIN",
  "OPERATIONAL_ANALYST",
  "READ_ONLY",
] as const;

export const ENTERPRISE_PERMISSIONS = [
  "organization.read",
  "organization.create",
  "organization.update",
  "organization.suspend",
  "organization.recover",
  "organization.archive",
  "organization.transfer.prepare",
  "workspace.read",
  "workspace.write",
  "finance.read",
  "finance.write",
  "finance.recover",
  "logistics.read",
  "logistics.write",
  "logistics.override",
  "support.read",
  "support.write",
  "moderation.read",
  "moderation.write",
  "analytics.read",
  "analytics.cross_org.read",
  "audit.read",
  "audit.export.prepare",
  "permission.read",
  "permission.write",
  "permission.elevate",
  "permission.rollback",
  "observability.read",
  "incident.write",
  "recovery.execute",
] as const;

export const ORGANIZATION_STATES = ["ONBOARDING", "PROVISIONING", "ACTIVE", "SUSPENDED", "RECOVERY", "ARCHIVED"] as const;
export const ORGANIZATION_TRANSITIONS = ["create", "provision", "activate", "suspend", "recover", "archive", "restore", "prepare_transfer"] as const;

export type EnterpriseRole = (typeof ENTERPRISE_ROLES)[number];
export type EnterprisePermission = (typeof ENTERPRISE_PERMISSIONS)[number];
export type OrganizationState = (typeof ORGANIZATION_STATES)[number];
export type OrganizationTransition = (typeof ORGANIZATION_TRANSITIONS)[number];
export type TenantScopeLevel = "platform" | "organization" | "workspace" | "vendor";
export type GovernanceSeverity = "info" | "warning" | "critical";

export type TenantEnvelope = {
  organizationId: string;
  workspaceId?: string | null;
  vendorId?: string | null;
  actorId?: string | null;
  scopeLevel: TenantScopeLevel;
  isolationKey: string;
};

export type TenantIsolationDiagnostic = {
  safe: boolean;
  replaySafe: boolean;
  tenant: TenantEnvelope;
  checkedAt: string;
  warnings: string[];
};

export type OrganizationEntity = {
  id: string;
  name: string;
  slug: string;
  state: OrganizationState;
  workspaceIds: string[];
  metadata: Record<string, Json | undefined>;
  governance: {
    riskTier: "low" | "medium" | "high";
    retentionDays: number;
    slaTier: "standard" | "priority" | "critical";
    suspendedReason?: string;
  };
};

export type EnterpriseActor = {
  id: string;
  roles: EnterpriseRole[];
  organizationId?: string | null;
  workspaceIds?: string[];
  vendorIds?: string[];
  permissions?: EnterprisePermission[];
};

export type PermissionGrant = {
  permission: EnterprisePermission;
  scope: TenantEnvelope;
  source: "role" | "direct" | "temporary_elevation";
  expiresAt?: string;
  approvalId?: string;
};

export type PermissionDecision = {
  allowed: boolean;
  permission: EnterprisePermission;
  reason: string;
  matchedGrant?: PermissionGrant;
  replayKey: string;
  observedAt: string;
  warnings: string[];
};

export type PermissionDriftDiagnostic = {
  actorId: string;
  tenant: TenantEnvelope;
  checkedAt: string;
  expiredTemporaryGrants: number;
  unapprovedElevations: number;
  crossScopeGrants: number;
  safe: boolean;
  warnings: string[];
};

export type EnterpriseAuditEvent = {
  id: string;
  eventType: string;
  severity: GovernanceSeverity;
  actorId?: string | null;
  tenant: TenantEnvelope;
  subjectType: string;
  subjectId?: string | null;
  replayKey: string;
  immutable: true;
  metadata: Record<string, Json | undefined>;
  createdAt: string;
};

export type OrganizationHealthInput = {
  organizationId: string;
  openIncidents: number;
  auditBacklog: number;
  permissionEscalations: number;
  recoveryEvents: number;
  slaBreaches: number;
  queuePressure: number;
  replayAnomalies: number;
  isolationWarnings: number;
};

export type OrganizationHealthScore = {
  organizationId: string;
  score: number;
  tone: "healthy" | "watch" | "degraded" | "critical";
  factors: string[];
};

export type EnterpriseLoadInput = {
  organizations: number;
  onboardingBurst: number;
  permissionPropagationEvents: number;
  analyticsQueries: number;
  governanceEscalations: number;
  realtimeEvents: number;
  concurrentTenantRequests: number;
};

export type GovernanceValidationInput = {
  tenantDiagnostics: TenantIsolationDiagnostic[];
  permissionDiagnostics: PermissionDriftDiagnostic[];
  auditBacklog: number;
  auditReplayCount: number;
  organizationHealth: OrganizationHealthScore[];
  load: EnterpriseLoadInput;
};

export type GovernanceValidationReport = {
  productionSafe: boolean;
  checkedAt: string;
  risks: string[];
  requiredActions: string[];
};

export type EnterpriseFailureMode =
  | "permission_corruption"
  | "organization_replay_storm"
  | "audit_backlog_explosion"
  | "tenant_observability_desync"
  | "governance_saturation"
  | "realtime_tenant_flood";
