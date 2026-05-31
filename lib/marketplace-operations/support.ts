/**
 * MCP-1E Phase 2 — Support Platform Engine
 * Deterministic support ticket management with SLA, escalation, and analytics
 */

import { createHash } from "crypto";
import type {
  AgentPerformance,
  AuditEntry,
  OperationsRole,
  Priority,
  SLAPolicy,
  SupportAnalytics,
  SupportTicket,
  TicketCategory,
  TicketChannel,
  TicketMessage,
  TicketResolution,
  TicketSLA,
  TicketStatus,
} from "./types";

// ─── SLA Policies ──────────────────────────────────────────────────────────────

export const SLA_POLICIES: Record<Priority, SLAPolicy> = {
  critical: { priority: "critical", firstResponseMinutes: 15, resolutionMinutes: 120, escalationMinutes: 30 },
  urgent: { priority: "urgent", firstResponseMinutes: 30, resolutionMinutes: 240, escalationMinutes: 60 },
  high: { priority: "high", firstResponseMinutes: 60, resolutionMinutes: 480, escalationMinutes: 120 },
  medium: { priority: "medium", firstResponseMinutes: 120, resolutionMinutes: 1440, escalationMinutes: 480 },
  low: { priority: "low", firstResponseMinutes: 480, resolutionMinutes: 4320, escalationMinutes: 1440 },
};

// ─── Ticket Number Generation ──────────────────────────────────────────────────

function generateTicketNumber(seed: string): string {
  const hash = createHash("sha256").update(seed).digest("hex").slice(0, 8).toUpperCase();
  return `TKT-${hash}`;
}

function generateId(seed: string): string {
  return createHash("sha256").update(seed).digest("hex").slice(0, 16);
}

// ─── Ticket Priority Routing ───────────────────────────────────────────────────

export function determinePriority(category: TicketCategory, description: string): Priority {
  const urgentKeywords = ["fraud", "scam", "urgent", "emergency", "stolen", "hacked"];
  const highKeywords = ["payment failed", "not received", "wrong item", "damaged"];
  const lowerDesc = description.toLowerCase();

  if (category === "payment_issue" && lowerDesc.includes("fraud")) return "critical";
  if (urgentKeywords.some((k) => lowerDesc.includes(k))) return "urgent";
  if (category === "payment_issue" || category === "delivery_issue") return "high";
  if (highKeywords.some((k) => lowerDesc.includes(k))) return "high";
  if (category === "general_inquiry" || category === "technical_issue") return "low";
  return "medium";
}

export function determineTeam(category: TicketCategory): string {
  const routing: Record<TicketCategory, string> = {
    order_issue: "order_support",
    payment_issue: "payment_support",
    delivery_issue: "logistics_support",
    product_issue: "catalog_support",
    account_issue: "account_support",
    seller_complaint: "seller_relations",
    refund_request: "refund_team",
    cancellation: "order_support",
    general_inquiry: "general_support",
    technical_issue: "technical_support",
  };
  return routing[category];
}

// ─── Ticket Creation ───────────────────────────────────────────────────────────

export function createTicket(input: {
  subject: string;
  description: string;
  category: TicketCategory;
  channel: TicketChannel;
  createdBy: string;
  createdByRole: "customer" | "seller";
  relatedOrderId?: string;
  relatedProductId?: string;
  relatedSellerId?: string;
}): SupportTicket {
  const now = new Date().toISOString();
  const id = generateId(`${input.createdBy}-${input.subject}-${now}`);
  const priority = determinePriority(input.category, input.description);
  const slaPolicy = SLA_POLICIES[priority];
  const team = determineTeam(input.category);

  const sla: TicketSLA = {
    policy: slaPolicy,
    firstResponseDue: new Date(Date.now() + slaPolicy.firstResponseMinutes * 60000).toISOString(),
    resolutionDue: new Date(Date.now() + slaPolicy.resolutionMinutes * 60000).toISOString(),
    firstResponseAt: null,
    isBreached: false,
    breachType: null,
  };

  return {
    id,
    ticketNumber: generateTicketNumber(id),
    subject: input.subject,
    description: input.description,
    category: input.category,
    priority,
    status: "open",
    channel: input.channel,
    createdBy: input.createdBy,
    createdByRole: input.createdByRole,
    assignedTo: null,
    assignedTeam: team,
    relatedOrderId: input.relatedOrderId ?? null,
    relatedProductId: input.relatedProductId ?? null,
    relatedSellerId: input.relatedSellerId ?? null,
    tags: [],
    messages: [],
    sla,
    escalationLevel: 0,
    resolution: null,
    audit: [{ id: generateId(`audit-${id}-create`), timestamp: now, actor: input.createdBy, actorRole: input.createdByRole, action: "ticket_created", detail: `Ticket created: ${input.subject}` }],
    createdAt: now,
    updatedAt: now,
    closedAt: null,
  };
}

// ─── Ticket Transitions ────────────────────────────────────────────────────────

const VALID_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  open: ["assigned", "in_progress", "escalated", "closed"],
  assigned: ["in_progress", "escalated", "open"],
  in_progress: ["waiting_customer", "waiting_internal", "escalated", "resolved"],
  waiting_customer: ["in_progress", "closed"],
  waiting_internal: ["in_progress", "escalated"],
  escalated: ["in_progress", "resolved"],
  resolved: ["closed", "in_progress"],
  closed: [],
};

export function canTransition(from: TicketStatus, to: TicketStatus): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}

export function transitionTicket(ticket: SupportTicket, newStatus: TicketStatus, actor: string, actorRole: OperationsRole): SupportTicket {
  if (!canTransition(ticket.status, newStatus)) {
    throw new Error(`Invalid transition: ${ticket.status} → ${newStatus}`);
  }
  const now = new Date().toISOString();
  const audit: AuditEntry = { id: generateId(`audit-${ticket.id}-${now}`), timestamp: now, actor, actorRole, action: "status_change", detail: `${ticket.status} → ${newStatus}` };

  return {
    ...ticket,
    status: newStatus,
    updatedAt: now,
    closedAt: newStatus === "closed" ? now : ticket.closedAt,
    audit: [...ticket.audit, audit],
  };
}

// ─── Assignment ────────────────────────────────────────────────────────────────

export function assignTicket(ticket: SupportTicket, agentId: string, agentRole: OperationsRole): SupportTicket {
  const now = new Date().toISOString();
  return {
    ...ticket,
    assignedTo: agentId,
    status: ticket.status === "open" ? "assigned" : ticket.status,
    updatedAt: now,
    audit: [...ticket.audit, { id: generateId(`audit-${ticket.id}-assign-${now}`), timestamp: now, actor: agentId, actorRole: agentRole, action: "assigned", detail: `Assigned to ${agentId}` }],
  };
}

// ─── Escalation ────────────────────────────────────────────────────────────────

export function escalateTicket(ticket: SupportTicket, actor: string, reason: string): SupportTicket {
  const now = new Date().toISOString();
  return {
    ...ticket,
    status: "escalated" as TicketStatus,
    escalationLevel: ticket.escalationLevel + 1,
    updatedAt: now,
    audit: [...ticket.audit, { id: generateId(`audit-${ticket.id}-escalate-${now}`), timestamp: now, actor, actorRole: "agent", action: "escalated", detail: reason }],
  };
}

// ─── Resolution ────────────────────────────────────────────────────────────────

export function resolveTicket(ticket: SupportTicket, resolution: Omit<TicketResolution, "resolvedAt">): SupportTicket {
  const now = new Date().toISOString();
  return {
    ...ticket,
    status: "resolved" as TicketStatus,
    resolution: { ...resolution, resolvedAt: now },
    updatedAt: now,
    audit: [...ticket.audit, { id: generateId(`audit-${ticket.id}-resolve-${now}`), timestamp: now, actor: resolution.resolvedBy, actorRole: "agent", action: "resolved", detail: resolution.summary }],
  };
}

// ─── Messages ──────────────────────────────────────────────────────────────────

export function addMessage(ticket: SupportTicket, message: Omit<TicketMessage, "id" | "ticketId" | "createdAt">): SupportTicket {
  const now = new Date().toISOString();
  const msg: TicketMessage = { ...message, id: generateId(`msg-${ticket.id}-${now}`), ticketId: ticket.id, createdAt: now };
  const sla: TicketSLA = ticket.sla.firstResponseAt === null && message.senderRole === "agent"
    ? { ...ticket.sla, firstResponseAt: now }
    : ticket.sla;
  return { ...ticket, messages: [...ticket.messages, msg], sla, updatedAt: now };
}

// ─── SLA Check ─────────────────────────────────────────────────────────────────

export function checkSLA(ticket: SupportTicket, now: Date = new Date()): TicketSLA {
  const sla = { ...ticket.sla };
  if (ticket.status === "closed" || ticket.status === "resolved") return sla;

  if (!sla.firstResponseAt && now.toISOString() > sla.firstResponseDue) {
    sla.isBreached = true;
    sla.breachType = "first_response";
  } else if (now.toISOString() > sla.resolutionDue) {
    sla.isBreached = true;
    sla.breachType = "resolution";
  }
  return sla;
}

// ─── Analytics ─────────────────────────────────────────────────────────────────

export function computeSupportAnalytics(tickets: SupportTicket[]): SupportAnalytics {
  const totalTickets = tickets.length;
  const openTickets = tickets.filter((t) => !["resolved", "closed"].includes(t.status)).length;

  const resolved = tickets.filter((t) => t.resolution);
  const avgResolutionMinutes = resolved.length > 0
    ? resolved.reduce((sum, t) => {
        const created = new Date(t.createdAt).getTime();
        const resolvedAt = new Date(t.resolution!.resolvedAt).getTime();
        return sum + (resolvedAt - created) / 60000;
      }, 0) / resolved.length
    : 0;

  const withSla = tickets.filter((t) => t.sla);
  const slaComplianceRate = withSla.length > 0 ? withSla.filter((t) => !t.sla.isBreached).length / withSla.length : 1;
  const firstResponseCompliance = withSla.length > 0 ? withSla.filter((t) => t.sla.firstResponseAt && t.sla.firstResponseAt <= t.sla.firstResponseDue).length / withSla.length : 1;

  const ticketsByCategory = {} as Record<TicketCategory, number>;
  const ticketsByPriority = {} as Record<Priority, number>;
  const ticketsByStatus = {} as Record<TicketStatus, number>;

  for (const t of tickets) {
    ticketsByCategory[t.category] = (ticketsByCategory[t.category] ?? 0) + 1;
    ticketsByPriority[t.priority] = (ticketsByPriority[t.priority] ?? 0) + 1;
    ticketsByStatus[t.status] = (ticketsByStatus[t.status] ?? 0) + 1;
  }

  const escalated = tickets.filter((t) => t.escalationLevel > 0).length;
  const escalationRate = totalTickets > 0 ? escalated / totalTickets : 0;

  const satisfactionScores = resolved.filter((t) => t.resolution?.satisfactionScore != null).map((t) => t.resolution!.satisfactionScore!);
  const satisfactionAverage = satisfactionScores.length > 0 ? satisfactionScores.reduce((a, b) => a + b, 0) / satisfactionScores.length : 0;

  const agentMap = new Map<string, { tickets: SupportTicket[] }>();
  for (const t of tickets) {
    if (t.assignedTo) {
      if (!agentMap.has(t.assignedTo)) agentMap.set(t.assignedTo, { tickets: [] });
      agentMap.get(t.assignedTo)!.tickets.push(t);
    }
  }
  const agentPerformance: AgentPerformance[] = [...agentMap.entries()].map(([agentId, data]) => {
    const agentResolved = data.tickets.filter((t) => t.resolution);
    const agentAvgRes = agentResolved.length > 0 ? agentResolved.reduce((s, t) => s + (new Date(t.resolution!.resolvedAt).getTime() - new Date(t.createdAt).getTime()) / 60000, 0) / agentResolved.length : 0;
    const scores = agentResolved.filter((t) => t.resolution?.satisfactionScore != null).map((t) => t.resolution!.satisfactionScore!);
    return {
      agentId,
      agentName: `Agent ${agentId.slice(0, 6)}`,
      ticketsHandled: data.tickets.length,
      avgResolutionMinutes: Math.round(agentAvgRes),
      satisfactionScore: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
      slaCompliance: data.tickets.length > 0 ? data.tickets.filter((t) => !t.sla.isBreached).length / data.tickets.length : 1,
    };
  });

  return {
    totalTickets,
    openTickets,
    avgResolutionMinutes: Math.round(avgResolutionMinutes),
    slaComplianceRate: Number(slaComplianceRate.toFixed(3)),
    firstResponseComplianceRate: Number(firstResponseCompliance.toFixed(3)),
    ticketsByCategory,
    ticketsByPriority,
    ticketsByStatus,
    escalationRate: Number(escalationRate.toFixed(3)),
    satisfactionAverage: Number(satisfactionAverage.toFixed(2)),
    agentPerformance,
  };
}
