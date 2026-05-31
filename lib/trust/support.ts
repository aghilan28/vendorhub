// MCP-0D — Support Operations engine (priority routing, SLA, analytics)

import type { SupportSummary, SupportTicketInput } from "./types";

/** SLA first-response target (minutes) by priority. */
export const SLA_MINUTES: Record<SupportTicketInput["priority"], number> = {
  urgent: 30,
  high: 120,
  medium: 480,
  low: 1440,
};

const PRIORITY_RANK: Record<SupportTicketInput["priority"], number> = { urgent: 0, high: 1, medium: 2, low: 3 };
const OPEN_STATUSES: SupportTicketInput["status"][] = ["open", "in_progress", "waiting"];

/** Routes the queue: urgent first, then by age (created order preserved). */
export function routeTickets(tickets: SupportTicketInput[]): SupportTicketInput[] {
  return [...tickets].sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
}

export function isSlaBreached(ticket: SupportTicketInput): boolean {
  if (ticket.firstResponseMinutes === undefined) return OPEN_STATUSES.includes(ticket.status);
  return ticket.firstResponseMinutes > SLA_MINUTES[ticket.priority];
}

export function summariseSupport(tickets: SupportTicketInput[]): SupportSummary {
  const open = tickets.filter((t) => OPEN_STATUSES.includes(t.status)).length;
  const urgent = tickets.filter((t) => t.priority === "urgent" && OPEN_STATUSES.includes(t.status)).length;
  const responded = tickets.filter((t) => t.firstResponseMinutes !== undefined);
  const avgFirstResponseMinutes = responded.length
    ? Math.round(responded.reduce((s, t) => s + (t.firstResponseMinutes ?? 0), 0) / responded.length)
    : 0;
  const slaBreaches = tickets.filter(isSlaBreached).length;

  const catMap = new Map<string, number>();
  for (const t of tickets) catMap.set(t.category, (catMap.get(t.category) ?? 0) + 1);
  const byCategory = [...catMap.entries()].map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count);

  return { open, urgent, avgFirstResponseMinutes, slaBreaches, byCategory };
}
