/**
 * MCP-1E Phase 6 — Incident Management System
 * Marketplace-level incidents, severity, response, postmortem
 */

import { createHash } from "crypto";
import type { IncidentAnalytics, IncidentEvent, IncidentSeverity, IncidentStatus, IncidentType, MarketplaceIncident, Postmortem } from "./types";

function generateId(seed: string): string {
  return createHash("sha256").update(seed).digest("hex").slice(0, 16);
}

function generateIncidentNumber(seed: string): string {
  const hash = createHash("sha256").update(seed).digest("hex").slice(0, 6).toUpperCase();
  return `INC-${hash}`;
}

// ─── Incident Status Machine ───────────────────────────────────────────────────

const VALID_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  detected: ["acknowledged"],
  acknowledged: ["investigating"],
  investigating: ["mitigating", "resolved"],
  mitigating: ["resolved"],
  resolved: ["post_mortem", "closed"],
  post_mortem: ["closed"],
  closed: [],
};

export function canTransitionIncident(from: IncidentStatus, to: IncidentStatus): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}

// ─── Incident Creation ─────────────────────────────────────────────────────────

export function createIncident(input: {
  type: IncidentType;
  severity: IncidentSeverity;
  title: string;
  description: string;
  impactScope: string;
  impactedCustomers: number;
  impactedSellers: number;
  impactedOrders: number;
  ownerId: string;
  ownerName: string;
}): MarketplaceIncident {
  const now = new Date().toISOString();
  const id = generateId(`incident-${input.type}-${now}`);

  return {
    id,
    incidentNumber: generateIncidentNumber(id),
    type: input.type,
    severity: input.severity,
    status: "detected",
    title: input.title,
    description: input.description,
    impactScope: input.impactScope,
    impactedCustomers: input.impactedCustomers,
    impactedSellers: input.impactedSellers,
    impactedOrders: input.impactedOrders,
    detectedAt: now,
    acknowledgedAt: null,
    resolvedAt: null,
    ownerId: input.ownerId,
    ownerName: input.ownerName,
    responders: [input.ownerId],
    timeline: [{ id: generateId(`event-${id}-detected`), action: "incident_detected", actor: "system", detail: `${input.severity} incident detected: ${input.title}`, timestamp: now }],
    postmortem: null,
    createdAt: now,
    updatedAt: now,
  };
}

// ─── Incident Transitions ──────────────────────────────────────────────────────

export function transitionIncident(incident: MarketplaceIncident, newStatus: IncidentStatus, actor: string, detail: string): MarketplaceIncident {
  if (!canTransitionIncident(incident.status, newStatus)) {
    throw new Error(`Invalid incident transition: ${incident.status} → ${newStatus}`);
  }
  const now = new Date().toISOString();
  const event: IncidentEvent = { id: generateId(`event-${incident.id}-${now}`), action: `status_${newStatus}`, actor, detail, timestamp: now };

  return {
    ...incident,
    status: newStatus,
    acknowledgedAt: newStatus === "acknowledged" ? now : incident.acknowledgedAt,
    resolvedAt: newStatus === "resolved" ? now : incident.resolvedAt,
    timeline: [...incident.timeline, event],
    updatedAt: now,
  };
}

// ─── Add Responder ─────────────────────────────────────────────────────────────

export function addResponder(incident: MarketplaceIncident, responderId: string): MarketplaceIncident {
  if (incident.responders.includes(responderId)) return incident;
  return { ...incident, responders: [...incident.responders, responderId], updatedAt: new Date().toISOString() };
}

// ─── Postmortem ────────────────────────────────────────────────────────────────

export function addPostmortem(incident: MarketplaceIncident, postmortem: Omit<Postmortem, "publishedAt">): MarketplaceIncident {
  const now = new Date().toISOString();
  return {
    ...incident,
    postmortem: { ...postmortem, publishedAt: now },
    status: "post_mortem" as IncidentStatus,
    updatedAt: now,
    timeline: [...incident.timeline, { id: generateId(`event-pm-${now}`), action: "postmortem_published", actor: incident.ownerId, detail: "Postmortem published", timestamp: now }],
  };
}

// ─── Incident Analytics ────────────────────────────────────────────────────────

export function computeIncidentAnalytics(incidents: MarketplaceIncident[]): IncidentAnalytics {
  const totalIncidents = incidents.length;
  const openIncidents = incidents.filter((i) => !["resolved", "post_mortem", "closed"].includes(i.status)).length;

  const resolved = incidents.filter((i) => i.resolvedAt);
  const avgResolutionHours = resolved.length > 0
    ? resolved.reduce((sum, i) => sum + (new Date(i.resolvedAt!).getTime() - new Date(i.detectedAt).getTime()) / (60 * 60 * 1000), 0) / resolved.length
    : 0;

  const acknowledged = incidents.filter((i) => i.acknowledgedAt);
  const mtta = acknowledged.length > 0
    ? acknowledged.reduce((sum, i) => sum + (new Date(i.acknowledgedAt!).getTime() - new Date(i.detectedAt).getTime()) / 60000, 0) / acknowledged.length
    : 0;

  const incidentsByType = {} as Record<IncidentType, number>;
  const incidentsBySeverity = {} as Record<IncidentSeverity, number>;
  for (const i of incidents) {
    incidentsByType[i.type] = (incidentsByType[i.type] ?? 0) + 1;
    incidentsBySeverity[i.severity] = (incidentsBySeverity[i.severity] ?? 0) + 1;
  }

  const withPostmortem = resolved.filter((i) => i.postmortem).length;
  const postmortemCompletionRate = resolved.length > 0 ? withPostmortem / resolved.length : 0;

  return {
    totalIncidents,
    openIncidents,
    avgResolutionHours: Number(avgResolutionHours.toFixed(1)),
    incidentsByType,
    incidentsBySeverity,
    mttr: Number(avgResolutionHours.toFixed(1)),
    mtta: Number(mtta.toFixed(1)),
    postmortemCompletionRate: Number(postmortemCompletionRate.toFixed(3)),
  };
}
