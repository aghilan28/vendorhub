/**
 * EC-2 Phase 6 — Customer Support Completion (bridge)
 * Support ticket lifecycle already exists in lib/marketplace-operations (MCP-1E).
 * EC-2 does NOT rebuild it — it re-exports the canonical engine and adds the
 * DB-shape mapping needed to persist to the existing `support_tickets` table.
 */

import type { SupportTicket, TicketStatus } from "@/lib/marketplace-operations";

// Re-export the canonical MCP-1E support engine surface for commerce-core consumers.
export {
  createTicket,
  assignTicket,
  escalateTicket,
  resolveTicket,
  addMessage,
  transitionTicket,
  computeSupportAnalytics,
  determinePriority,
  determineTeam,
} from "@/lib/marketplace-operations";

// Map the engine ticket status → the DB `support_status` enum used by the existing table.
const DB_STATUS_MAP: Record<TicketStatus, "open" | "in_progress" | "waiting" | "resolved" | "closed"> = {
  open: "open",
  assigned: "in_progress",
  in_progress: "in_progress",
  waiting_customer: "waiting",
  waiting_internal: "waiting",
  escalated: "in_progress",
  resolved: "resolved",
  closed: "closed",
};

export function toDbSupportStatus(status: TicketStatus): "open" | "in_progress" | "waiting" | "resolved" | "closed" {
  return DB_STATUS_MAP[status];
}

export function toDbSupportRow(ticket: SupportTicket) {
  return {
    user_id: ticket.createdByRole === "customer" ? ticket.createdBy : null,
    vendor_id: ticket.relatedSellerId,
    order_id: ticket.relatedOrderId,
    subject: ticket.subject,
    body: ticket.description,
    priority: ticket.priority === "critical" || ticket.priority === "urgent" ? "urgent" : ticket.priority === "high" ? "high" : ticket.priority === "medium" ? "medium" : "low",
    status: toDbSupportStatus(ticket.status),
  };
}
