import { createHash } from "crypto";
import type { EnterpriseActor, TenantEnvelope, TenantIsolationDiagnostic } from "./types";

function stableHash(parts: Array<string | null | undefined>) {
  return createHash("sha256").update(parts.map((part) => part ?? "none").join(":")).digest("hex");
}

export function createTenantEnvelope(input: {
  organizationId: string;
  workspaceId?: string | null;
  vendorId?: string | null;
  actorId?: string | null;
  scopeLevel?: TenantEnvelope["scopeLevel"];
}): TenantEnvelope {
  const organizationId = input.organizationId?.trim();
  if (!organizationId) throw new Error("Tenant envelope requires an organization id.");

  return {
    organizationId,
    workspaceId: input.workspaceId ?? null,
    vendorId: input.vendorId ?? null,
    actorId: input.actorId ?? null,
    scopeLevel: input.scopeLevel ?? (input.vendorId ? "vendor" : input.workspaceId ? "workspace" : "organization"),
    isolationKey: stableHash([organizationId, input.workspaceId, input.vendorId]),
  };
}

export function assertTenantMatch(left: TenantEnvelope, right: TenantEnvelope) {
  if (left.organizationId !== right.organizationId) {
    throw new Error("Cross-tenant access blocked: organization scope mismatch.");
  }

  if (left.workspaceId && right.workspaceId && left.workspaceId !== right.workspaceId) {
    throw new Error("Cross-workspace access blocked: workspace scope mismatch.");
  }

  if (left.vendorId && right.vendorId && left.vendorId !== right.vendorId) {
    throw new Error("Cross-vendor access blocked: vendor scope mismatch.");
  }
}

export function tenantScopeContains(grantScope: TenantEnvelope, targetScope: TenantEnvelope) {
  if (grantScope.organizationId !== targetScope.organizationId) return false;
  if (grantScope.workspaceId && grantScope.workspaceId !== targetScope.workspaceId) return false;
  if (grantScope.vendorId && grantScope.vendorId !== targetScope.vendorId) return false;
  return true;
}

export function actorCanEnterTenant(actor: EnterpriseActor, tenant: TenantEnvelope) {
  if (actor.roles.includes("ORG_OWNER") && actor.organizationId === tenant.organizationId) return true;
  if (actor.organizationId && actor.organizationId !== tenant.organizationId) return false;
  if (tenant.workspaceId && actor.workspaceIds?.length && !actor.workspaceIds.includes(tenant.workspaceId)) return false;
  if (tenant.vendorId && actor.vendorIds?.length && !actor.vendorIds.includes(tenant.vendorId)) return false;
  return actor.organizationId === tenant.organizationId;
}

export function validateTenantIsolation(input: {
  tenant: TenantEnvelope;
  replayKey?: string;
  expectedIsolationKey?: string | null;
  now?: Date;
}): TenantIsolationDiagnostic {
  const warnings: string[] = [];

  if (!input.tenant.organizationId) warnings.push("missing_organization_id");
  if (input.expectedIsolationKey && input.expectedIsolationKey !== input.tenant.isolationKey) warnings.push("isolation_key_mismatch");
  if (input.tenant.scopeLevel === "workspace" && !input.tenant.workspaceId) warnings.push("workspace_scope_missing_workspace_id");
  if (input.tenant.scopeLevel === "vendor" && !input.tenant.vendorId) warnings.push("vendor_scope_missing_vendor_id");
  if (input.tenant.vendorId && !input.tenant.workspaceId) warnings.push("vendor_scope_without_workspace");

  const replaySafe = Boolean(input.replayKey?.startsWith(input.tenant.organizationId) === false || input.replayKey);

  return {
    safe: warnings.length === 0,
    replaySafe,
    tenant: input.tenant,
    checkedAt: (input.now ?? new Date()).toISOString(),
    warnings,
  };
}

export function tenantScopedReplayKey(parts: {
  tenant: TenantEnvelope;
  action: string;
  subjectType: string;
  subjectId?: string | null;
  eventId?: string | null;
}) {
  return stableHash([parts.tenant.organizationId, parts.tenant.workspaceId, parts.tenant.vendorId, parts.action, parts.subjectType, parts.subjectId, parts.eventId]);
}

export function tenantScopedQueuePartition(tenant: TenantEnvelope, partition = "default") {
  return `${tenant.organizationId}:${tenant.workspaceId ?? "workspace"}:${tenant.vendorId ?? "tenant"}:${partition}`;
}

export function redactTenantMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  const sensitive = /(organizationSecret|tenantSecret|token|credential|authorization|cookie|key|document|kyc|pan|aadhaar|phone|address)/i;
  return Object.fromEntries(
    Object.entries(metadata).map(([key, value]) => {
      if (sensitive.test(key)) return [key, "[redacted]"];
      if (value && typeof value === "object" && !Array.isArray(value)) return [key, redactTenantMetadata(value as Record<string, unknown>)];
      return [key, value];
    }),
  );
}
