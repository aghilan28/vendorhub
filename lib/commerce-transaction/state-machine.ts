// MCP-0F.5 — Order Lifecycle Engine (the 12-state transaction machine).
//
// A guarded, audited state machine that is a SUPERSET of the live 9-state order
// machine (features/transactions/lifecycle.ts). It adds draft / placed /
// completed / returned / disputed and maps cleanly onto the DB order statuses
// used by lib/actions/orders.ts.

import type { StateMeta, TransactionActor, TransactionEvent, TransactionState } from "./types";

/** Legal forward/branch transitions for every state. */
export const TRANSITIONS: Record<TransactionState, TransactionState[]> = {
  draft: ["placed", "cancelled"],
  placed: ["confirmed", "cancelled"],
  confirmed: ["packed", "cancelled"],
  packed: ["shipped", "cancelled"],
  shipped: ["out_for_delivery", "cancelled"],
  out_for_delivery: ["delivered", "cancelled"],
  delivered: ["completed", "returned", "disputed"],
  completed: ["returned", "disputed"],
  cancelled: ["refunded"],
  returned: ["refunded", "disputed"],
  disputed: ["refunded", "completed"],
  refunded: [],
};

export const STATE_META: Record<TransactionState, StateMeta> = {
  draft: { label: "Draft", buyerLabel: "In checkout", tone: "watch", terminal: false, settled: false },
  placed: { label: "Placed", buyerLabel: "Order placed", tone: "watch", terminal: false, settled: false },
  confirmed: { label: "Confirmed", buyerLabel: "Confirmed by seller", tone: "healthy", terminal: false, settled: false },
  packed: { label: "Packed", buyerLabel: "Packed", tone: "healthy", terminal: false, settled: false },
  shipped: { label: "Shipped", buyerLabel: "Shipped", tone: "healthy", terminal: false, settled: false },
  out_for_delivery: { label: "Out for delivery", buyerLabel: "Out for delivery", tone: "healthy", terminal: false, settled: false },
  delivered: { label: "Delivered", buyerLabel: "Delivered", tone: "healthy", terminal: false, settled: true },
  completed: { label: "Completed", buyerLabel: "Completed", tone: "healthy", terminal: false, settled: true },
  cancelled: { label: "Cancelled", buyerLabel: "Cancelled", tone: "degraded", terminal: false, settled: false },
  returned: { label: "Returned", buyerLabel: "Returned", tone: "degraded", terminal: false, settled: false },
  disputed: { label: "Disputed", buyerLabel: "Under dispute", tone: "critical", terminal: false, settled: false },
  refunded: { label: "Refunded", buyerLabel: "Refunded", tone: "degraded", terminal: true, settled: false },
};

/** The happy-path order the buyer expects to see (for progress bars). */
export const HAPPY_PATH: TransactionState[] = [
  "placed",
  "confirmed",
  "packed",
  "shipped",
  "out_for_delivery",
  "delivered",
  "completed",
];

export function canTransition(from: TransactionState, to: TransactionState): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function nextStates(from: TransactionState): TransactionState[] {
  return TRANSITIONS[from] ?? [];
}

export function isTerminal(state: TransactionState): boolean {
  return STATE_META[state].terminal;
}

/** The forward (non-cancel/return) next states a seller can act on. */
export function sellerNextStates(from: TransactionState): TransactionState[] {
  const fulfillment: TransactionState[] = ["confirmed", "packed", "shipped", "out_for_delivery", "delivered"];
  return nextStates(from).filter((next) => fulfillment.includes(next));
}

export interface TransitionResult {
  ok: boolean;
  state: TransactionState;
  event?: TransactionEvent;
  error?: string;
}

let monotonicCounter = 0;

/**
 * Apply a guarded transition. Returns the new state plus an audited event, or
 * an error result if the transition is illegal. Pure (never throws) so it is
 * safe to call from UI handlers and reducers.
 */
export function applyTransition(
  current: TransactionState,
  to: TransactionState,
  actor: TransactionActor,
  note: string,
  at?: string,
): TransitionResult {
  if (!canTransition(current, to)) {
    return { ok: false, state: current, error: `Illegal transition ${current} → ${to}` };
  }
  const stamp = at ?? new Date().toISOString();
  monotonicCounter += 1;
  const event: TransactionEvent = {
    id: `tx-evt-${stamp}-${monotonicCounter}`,
    from: current,
    to,
    actor,
    note,
    at: stamp,
  };
  return { ok: true, state: to, event };
}

/** Progress 0..100 along the happy path (settled states are 100). */
export function lifecycleProgress(state: TransactionState): number {
  if (state === "completed" || state === "delivered") return 100;
  if (state === "cancelled" || state === "refunded" || state === "returned" || state === "disputed") return 0;
  const idx = HAPPY_PATH.indexOf(state);
  if (idx < 0) return 0;
  return Math.round(((idx + 1) / HAPPY_PATH.length) * 100);
}

// ── Mapping to the live DB order machine (features/transactions/lifecycle.ts) ──
// The DB uses uppercase OrderStatus without draft/placed/completed/returned/
// disputed. We map the richer engine state onto the closest DB status so the
// engine can drive the real updateOrderStatusAction.

const DB_STATUS: Record<TransactionState, string> = {
  draft: "PENDING",
  placed: "PENDING",
  confirmed: "CONFIRMED",
  packed: "PACKED",
  shipped: "SHIPPED",
  out_for_delivery: "OUT_FOR_DELIVERY",
  delivered: "DELIVERED",
  completed: "DELIVERED",
  cancelled: "CANCELLED",
  returned: "DELIVERED",
  refunded: "REFUNDED",
  disputed: "DELIVERED",
};

export function toDbOrderStatus(state: TransactionState): string {
  return DB_STATUS[state];
}

export function fromDbOrderStatus(status: string): TransactionState {
  switch (status.toUpperCase()) {
    case "PENDING":
      return "placed";
    case "CONFIRMED":
      return "confirmed";
    case "PROCESSING":
      return "confirmed";
    case "PACKED":
      return "packed";
    case "SHIPPED":
      return "shipped";
    case "OUT_FOR_DELIVERY":
      return "out_for_delivery";
    case "DELIVERED":
      return "delivered";
    case "COMPLETED":
      return "completed";
    case "CANCELLED":
      return "cancelled";
    case "RETURNED":
      return "returned";
    case "REFUNDED":
      return "refunded";
    case "DISPUTED":
      return "disputed";
    default:
      return "placed";
  }
}
