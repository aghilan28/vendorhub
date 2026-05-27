import { createHash } from "crypto";
import type { EnterpriseActor, EnterprisePermission, EnterpriseRole, PermissionDecision, PermissionDriftDiagnostic, PermissionGrant, TenantEnvelope } from "./types";
import { actorCanEnterTenant, tenantScopeContains } from "./tenant-isolation";

export const rolePermissionMap: Record<EnterpriseRole, EnterprisePermission[]> = {
  ORG_OWNER: [
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
  ],
  ORG_ADMIN: [
    "organization.read",
    "organization.update",
    "workspace.read",
    "workspace.write",
    "support.read",
    "support.write",
    "moderation.read",
    "moderation.write",
    "analytics.read",
    "audit.read",
    "permission.read",
    "observability.read",
    "incident.write",
    "recovery.execute",
  ],
  FINANCE_ADMIN: ["organization.read", "finance.read", "finance.write", "finance.recover", "analytics.read", "audit.read", "observability.read", "incident.write"],
  LOGISTICS_ADMIN: ["organization.read", "logistics.read", "logistics.write", "logistics.override", "analytics.read", "audit.read", "observability.read", "incident.write"],
  SUPPORT_ADMIN: ["organization.read", "support.read", "support.write", "analytics.read", "audit.read", "observability.read", "incident.write"],
  MODERATION_ADMIN: ["organization.read", "moderation.read", "moderation.write", "audit.read", "observability.read", "incident.write"],
  OPERATIONAL_ANALYST: ["organization.read", "workspace.read", "finance.read", "logistics.read", "support.read", "moderation.read", "analytics.read", "audit.read", "observability.read"],
  READ_ONLY: ["organization.read", "workspace.read", "finance.read", "logistics.read", "support.read", "moderation.read", "analytics.read", "audit.read", "observability.read"],
};

const approvalRequired = new Set<EnterprisePermission>(["organization.suspend", "organization.archive", "organization.recover", "permission.elevate", "permission.rollback", "finance.recover", "recovery.execute"]);
const writeDeniedForReadOnly = new Set<EnterprisePermission>([
  "organization.create",
  "organization.update",
  "organization.suspend",
  "organization.recover",
  "organization.archive",
  "workspace.write",
  "finance.write",
  "finance.recover",
  "logistics.write",
  "logistics.override",
  "support.write",
  "moderation.write",
  "permission.write",
  "permission.elevate",
  "permission.rollback",
  "incident.write",
  "recovery.execute",
]);

function replayKey(actorId: string, permission: EnterprisePermission, tenant: TenantEnvelope) {
  return createHash("sha256").update(`${tenant.organizationId}:${tenant.workspaceId ?? ""}:${tenant.vendorId ?? ""}:${actorId}:${permission}`).digest("hex");
}

export function inheritedRolePermissions(roles: EnterpriseRole[]) {
  return [...new Set(roles.flatMap((role) => rolePermissionMap[role] ?? []))];
}

export function buildPermissionGrants(actor: EnterpriseActor, tenant: TenantEnvelope, temporaryGrants: PermissionGrant[] = []): PermissionGrant[] {
  const roleGrants = inheritedRolePermissions(actor.roles).map((permission) => ({
    permission,
    scope: tenant,
    source: "role" as const,
  }));

  const directGrants = (actor.permissions ?? []).map((permission) => ({
    permission,
    scope: tenant,
    source: "direct" as const,
  }));

  return [...roleGrants, ...directGrants, ...temporaryGrants];
}

function grantMatchesTenant(grant: PermissionGrant, tenant: TenantEnvelope) {
  return tenantScopeContains(grant.scope, tenant);
}

export function diagnosePermissionDrift(input: {
  actor: EnterpriseActor;
  tenant: TenantEnvelope;
  grants: PermissionGrant[];
  now?: Date;
}): PermissionDriftDiagnostic {
  const now = input.now ?? new Date();
  const warnings: string[] = [];
  const expiredTemporaryGrants = input.grants.filter((grant) => grant.source === "temporary_elevation" && grant.expiresAt && new Date(grant.expiresAt).getTime() <= now.getTime()).length;
  const unapprovedElevations = input.grants.filter((grant) => grant.source === "temporary_elevation" && !grant.approvalId).length;
  const crossScopeGrants = input.grants.filter((grant) => !grantMatchesTenant(grant, input.tenant)).length;

  if (expiredTemporaryGrants) warnings.push("expired_temporary_grants");
  if (unapprovedElevations) warnings.push("unapproved_temporary_elevations");
  if (crossScopeGrants) warnings.push("cross_scope_grants");

  return {
    actorId: input.actor.id,
    tenant: input.tenant,
    checkedAt: now.toISOString(),
    expiredTemporaryGrants,
    unapprovedElevations,
    crossScopeGrants,
    safe: warnings.length === 0,
    warnings,
  };
}

export function evaluatePermission(input: {
  actor: EnterpriseActor;
  tenant: TenantEnvelope;
  permission: EnterprisePermission;
  temporaryGrants?: PermissionGrant[];
  approvalId?: string;
  now?: Date;
}): PermissionDecision {
  const observedAt = (input.now ?? new Date()).toISOString();
  const warnings: string[] = [];

  if (!actorCanEnterTenant(input.actor, input.tenant)) {
    return {
      allowed: false,
      permission: input.permission,
      reason: "Actor is outside the tenant boundary.",
      replayKey: replayKey(input.actor.id, input.permission, input.tenant),
      observedAt,
      warnings: ["tenant_scope_mismatch"],
    };
  }

  if (input.actor.roles.includes("READ_ONLY") && writeDeniedForReadOnly.has(input.permission) && input.actor.roles.length === 1) {
    return {
      allowed: false,
      permission: input.permission,
      reason: "Read-only role cannot perform write or recovery operations.",
      replayKey: replayKey(input.actor.id, input.permission, input.tenant),
      observedAt,
      warnings: ["read_only_boundary"],
    };
  }

  const grants = buildPermissionGrants(input.actor, input.tenant, input.temporaryGrants);
  const now = input.now ?? new Date();
  const matchedGrant = grants.find((grant) => {
    if (grant.permission !== input.permission) return false;
    if (!grantMatchesTenant(grant, input.tenant)) return false;
    if (grant.expiresAt && new Date(grant.expiresAt).getTime() <= now.getTime()) return false;
    return true;
  });

  if (!matchedGrant) {
    return {
      allowed: false,
      permission: input.permission,
      reason: "No matching scoped permission grant.",
      replayKey: replayKey(input.actor.id, input.permission, input.tenant),
      observedAt,
      warnings,
    };
  }

  if (approvalRequired.has(input.permission) && !input.approvalId && !matchedGrant.approvalId) {
    return {
      allowed: false,
      permission: input.permission,
      reason: "Permission requires approval-gated elevation.",
      matchedGrant,
      replayKey: replayKey(input.actor.id, input.permission, input.tenant),
      observedAt,
      warnings: ["approval_required"],
    };
  }

  if (matchedGrant.source === "temporary_elevation") warnings.push("temporary_elevation_used");

  return {
    allowed: true,
    permission: input.permission,
    reason: "Scoped permission allowed.",
    matchedGrant,
    replayKey: replayKey(input.actor.id, input.permission, input.tenant),
    observedAt,
    warnings,
  };
}
