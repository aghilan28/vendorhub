// MCP-0F.8 — Post-Purchase Experience engine (deterministic, pure).
//
// Review / return / refund / support flows + resolution tracking, built on the
// MCP-0D trust shapes (ReturnInput/RefundInput/ReviewInput/SupportTicketInput/
// DisputeInput) so it reuses the existing trust layer rather than duplicating it.

import type {
  DisputeInput,
  RefundInput,
  RefundState,
  ReturnInput,
  ReturnState,
  ReviewInput,
  SupportTicketInput,
} from "@/lib/trust/types";
import type { PostPurchaseSummary, ResolutionStep, ReturnEligibility, TransactionState, TxOrder } from "./types";

const RETURN_WINDOW_DAYS = 7;

function daysBetween(fromIso: string, toIso: string): number {
  return Math.floor((new Date(toIso).getTime() - new Date(fromIso).getTime()) / (24 * 60 * 60 * 1000));
}

/** Whether an order is eligible to start a return, and how long remains. */
export function returnEligibility(order: TxOrder, now?: string, windowDays = RETURN_WINDOW_DAYS): ReturnEligibility {
  const stamp = now ?? new Date().toISOString();
  const settled: TransactionState[] = ["delivered", "completed"];
  if (!settled.includes(order.state)) {
    return { eligible: false, windowDays, daysRemaining: 0, reason: "Returns open after the order is delivered." };
  }
  const deliveredEvent = [...order.events].reverse().find((e) => e.to === "delivered");
  const since = deliveredEvent?.at ?? order.updatedAt;
  const elapsed = daysBetween(since, stamp);
  const daysRemaining = Math.max(0, windowDays - elapsed);
  if (daysRemaining <= 0) {
    return { eligible: false, windowDays, daysRemaining: 0, reason: `Return window of ${windowDays} days has closed.` };
  }
  return { eligible: true, windowDays, daysRemaining, reason: `${daysRemaining} day(s) left to return.` };
}

/** Whether a buyer can leave a review for an order. */
export function canReview(order: TxOrder): boolean {
  return order.state === "delivered" || order.state === "completed";
}

// ── Resolution tracking (return / refund) ──────────────────────────────────────

const RETURN_FLOW: ReturnState[] = ["requested", "approved", "in_transit", "received", "resolved"];
const REFUND_FLOW: RefundState[] = ["requested", "approved", "processing", "refunded"];

export function returnResolutionSteps(state: ReturnState): ResolutionStep[] {
  if (state === "rejected" || state === "cancelled") {
    return [
      { label: "Requested", done: true, current: false },
      { label: state === "rejected" ? "Rejected" : "Cancelled", done: true, current: true },
    ];
  }
  const idx = RETURN_FLOW.indexOf(state);
  return RETURN_FLOW.map((s, i) => ({ label: titleCase(s), done: i <= idx, current: i === idx }));
}

export function refundResolutionSteps(state: RefundState): ResolutionStep[] {
  if (state === "rejected" || state === "failed") {
    return [
      { label: "Requested", done: true, current: false },
      { label: state === "rejected" ? "Rejected" : "Failed", done: true, current: true },
    ];
  }
  const idx = REFUND_FLOW.indexOf(state);
  return REFUND_FLOW.map((s, i) => ({ label: titleCase(s), done: i <= idx, current: i === idx }));
}

function titleCase(value: string): string {
  return value
    .split("_")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

// ── Summary ────────────────────────────────────────────────────────────────────

const OPEN_RETURN: ReturnState[] = ["requested", "approved", "in_transit", "received"];
const OPEN_REFUND: RefundState[] = ["requested", "approved", "processing"];

export interface PostPurchaseInput {
  orders: TxOrder[];
  returns: ReturnInput[];
  refunds: RefundInput[];
  reviews: ReviewInput[];
  tickets: SupportTicketInput[];
  disputes: DisputeInput[];
}

export function buildPostPurchaseSummary(input: PostPurchaseInput): PostPurchaseSummary {
  const reviewable = input.orders.filter((o) => canReview(o)).length;
  const openReturns = input.returns.filter((r) => OPEN_RETURN.includes(r.status)).length;
  const resolvedReturns = input.returns.filter((r) => r.status === "resolved").length;
  const openRefunds = input.refunds.filter((r) => OPEN_REFUND.includes(r.status)).length;
  const refundedValue = input.refunds.filter((r) => r.status === "refunded").reduce((sum, r) => sum + r.amount, 0);
  const openTickets = input.tickets.filter((t) => t.status === "open" || t.status === "in_progress" || t.status === "waiting").length;
  const openDisputes = input.disputes.filter((d) => d.state === "open" || d.state === "evidence" || d.state === "arbitration").length;

  return { reviewable, openReturns, openRefunds, openTickets, openDisputes, resolvedReturns, refundedValue };
}
