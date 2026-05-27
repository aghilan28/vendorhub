import type { EnterpriseAuditEvent, OrganizationEntity, OrganizationState, OrganizationTransition, TenantEnvelope } from "./types";
import { tenantScopedReplayKey } from "./tenant-isolation";

const allowedTransitions: Record<OrganizationState, OrganizationTransition[]> = {
  ONBOARDING: ["provision", "archive", "prepare_transfer"],
  PROVISIONING: ["activate", "suspend", "archive"],
  ACTIVE: ["suspend", "archive", "prepare_transfer"],
  SUSPENDED: ["recover", "archive"],
  RECOVERY: ["restore", "archive"],
  ARCHIVED: ["recover"],
};

const transitionState: Record<OrganizationTransition, OrganizationState> = {
  create: "ONBOARDING",
  provision: "PROVISIONING",
  activate: "ACTIVE",
  suspend: "SUSPENDED",
  recover: "RECOVERY",
  archive: "ARCHIVED",
  restore: "ACTIVE",
  prepare_transfer: "ACTIVE",
};

export function buildOrganization(input: {
  id: string;
  name: string;
  slug: string;
  workspaceIds?: string[];
  retentionDays?: number;
  slaTier?: OrganizationEntity["governance"]["slaTier"];
}): OrganizationEntity {
  return {
    id: input.id,
    name: input.name,
    slug: input.slug,
    state: "ONBOARDING",
    workspaceIds: input.workspaceIds ?? [`${input.id}-default`],
    metadata: {},
    governance: {
      riskTier: "low",
      retentionDays: input.retentionDays ?? 2555,
      slaTier: input.slaTier ?? "standard",
    },
  };
}

export function applyOrganizationTransition(input: {
  organization: OrganizationEntity;
  transition: OrganizationTransition;
  tenant: TenantEnvelope;
  actorId: string;
  reason?: string;
  approvalId?: string;
  now?: Date;
}) {
  const allowed = allowedTransitions[input.organization.state] ?? [];
  if (!allowed.includes(input.transition)) {
    throw new Error(`Invalid organization transition ${input.organization.state} -> ${input.transition}.`);
  }

  const nextState = transitionState[input.transition];
  const updated: OrganizationEntity = {
    ...input.organization,
    state: nextState,
    governance: {
      ...input.organization.governance,
      suspendedReason: input.transition === "suspend" ? input.reason ?? "Governance suspension" : undefined,
    },
    metadata: {
      ...input.organization.metadata,
      lastTransition: input.transition,
      lastTransitionAt: (input.now ?? new Date()).toISOString(),
      transferPrepared: input.transition === "prepare_transfer" ? true : input.organization.metadata.transferPrepared,
    },
  };

  const auditEvent: EnterpriseAuditEvent = {
    id: tenantScopedReplayKey({
      tenant: input.tenant,
      action: `organization.${input.transition}`,
      subjectType: "organization",
      subjectId: input.organization.id,
      eventId: input.approvalId ?? input.reason,
    }),
    eventType: `organization.${input.transition}`,
    severity: input.transition === "archive" || input.transition === "suspend" ? "warning" : "info",
    actorId: input.actorId,
    tenant: input.tenant,
    subjectType: "organization",
    subjectId: input.organization.id,
    replayKey: tenantScopedReplayKey({
      tenant: input.tenant,
      action: `organization.${input.transition}`,
      subjectType: "organization",
      subjectId: input.organization.id,
      eventId: input.approvalId ?? input.reason,
    }),
    immutable: true,
    metadata: {
      fromState: input.organization.state,
      toState: nextState,
      reason: input.reason,
      approvalId: input.approvalId,
    },
    createdAt: (input.now ?? new Date()).toISOString(),
  };

  return { organization: updated, auditEvent };
}

export function recoveryPlanForOrganization(organization: OrganizationEntity) {
  if (organization.state === "ARCHIVED") return ["validate archive retention", "restore tenant envelope", "replay immutable audit events", "activate with approval"];
  if (organization.state === "SUSPENDED") return ["verify suspension reason", "rollback unsafe permissions", "replay organization health checks", "move to recovery state"];
  if (organization.state === "RECOVERY") return ["reconcile workspace state", "validate queues and realtime scopes", "restore active state"];
  return ["snapshot governance state", "verify tenant isolation", "continue operations"];
}
