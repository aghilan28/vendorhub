import { createHash } from "crypto";
import type { EnterpriseAuditEvent, GovernanceSeverity, TenantEnvelope } from "./types";
import { redactTenantMetadata, tenantScopedReplayKey } from "./tenant-isolation";
import type { Json } from "@/types/database";

function auditMetadata(metadata?: Record<string, unknown>): Record<string, Json | undefined> {
  return redactTenantMetadata(metadata ?? {}) as Record<string, Json | undefined>;
}

export function buildEnterpriseAuditEvent(input: {
  eventType: string;
  tenant: TenantEnvelope;
  subjectType: string;
  subjectId?: string | null;
  actorId?: string | null;
  severity?: GovernanceSeverity;
  metadata?: Record<string, unknown>;
  eventId?: string | null;
  now?: Date;
}): EnterpriseAuditEvent {
  const replayKey = tenantScopedReplayKey({
    tenant: input.tenant,
    action: input.eventType,
    subjectType: input.subjectType,
    subjectId: input.subjectId,
    eventId: input.eventId,
  });

  return {
    id: createHash("sha256").update(`audit:${replayKey}`).digest("hex"),
    eventType: input.eventType,
    severity: input.severity ?? "info",
    actorId: input.actorId ?? input.tenant.actorId ?? null,
    tenant: input.tenant,
    subjectType: input.subjectType,
    subjectId: input.subjectId ?? null,
    replayKey,
    immutable: true,
    metadata: auditMetadata(input.metadata),
    createdAt: (input.now ?? new Date()).toISOString(),
  };
}

export function dedupeAuditReplay(events: EnterpriseAuditEvent[]) {
  const seen = new Set<string>();
  const accepted: EnterpriseAuditEvent[] = [];
  const replayed: EnterpriseAuditEvent[] = [];

  for (const event of events) {
    if (seen.has(event.replayKey)) {
      replayed.push(event);
      continue;
    }
    seen.add(event.replayKey);
    accepted.push(event);
  }

  return { accepted, replayed, replayCount: replayed.length };
}

export function validateAuditRecovery(events: EnterpriseAuditEvent[]) {
  const { accepted, replayed, replayCount } = dedupeAuditReplay(events);
  const mutableEvents = events.filter((event) => event.immutable !== true);
  const missingTenantEvents = events.filter((event) => !event.tenant.organizationId);
  const crossTenantReplayKeys = events.filter((event) => accepted.some((acceptedEvent) => acceptedEvent.replayKey === event.replayKey && acceptedEvent.tenant.organizationId !== event.tenant.organizationId));

  return {
    safe: mutableEvents.length === 0 && missingTenantEvents.length === 0 && crossTenantReplayKeys.length === 0,
    accepted,
    replayed,
    replayCount,
    anomalies: {
      mutableEvents: mutableEvents.length,
      missingTenantEvents: missingTenantEvents.length,
      crossTenantReplayKeys: crossTenantReplayKeys.length,
    },
  };
}

export function retentionCursorForAuditExport(input: { tenant: TenantEnvelope; retentionDays: number; now?: Date }) {
  const now = input.now ?? new Date();
  const retainAfter = new Date(now.getTime() - input.retentionDays * 24 * 60 * 60 * 1000);

  return {
    organizationId: input.tenant.organizationId,
    workspaceId: input.tenant.workspaceId ?? null,
    vendorId: input.tenant.vendorId ?? null,
    retainAfter: retainAfter.toISOString(),
    exportPartition: `${input.tenant.organizationId}/${input.tenant.workspaceId ?? "organization"}/${input.tenant.vendorId ?? "all"}`,
  };
}

export function searchAuditEvents(events: EnterpriseAuditEvent[], query: { organizationId: string; workspaceId?: string | null; vendorId?: string | null; eventType?: string; actorId?: string; severity?: GovernanceSeverity }) {
  return events.filter((event) => {
    if (event.tenant.organizationId !== query.organizationId) return false;
    if (query.workspaceId && event.tenant.workspaceId !== query.workspaceId) return false;
    if (query.vendorId && event.tenant.vendorId !== query.vendorId) return false;
    if (query.eventType && event.eventType !== query.eventType) return false;
    if (query.actorId && event.actorId !== query.actorId) return false;
    if (query.severity && event.severity !== query.severity) return false;
    return true;
  });
}
