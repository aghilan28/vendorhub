// MCP-0D — Returns / Refunds / Disputes state machines

import type { DisputeState, RefundState, ReturnState } from "./types";

export const RETURN_TRANSITIONS: Record<ReturnState, ReturnState[]> = {
  requested: ["approved", "rejected", "cancelled"],
  approved: ["in_transit", "cancelled"],
  rejected: [],
  in_transit: ["received"],
  received: ["resolved"],
  resolved: [],
  cancelled: [],
};

export const REFUND_TRANSITIONS: Record<RefundState, RefundState[]> = {
  requested: ["approved", "rejected"],
  approved: ["processing"],
  rejected: [],
  processing: ["refunded", "failed"],
  refunded: [],
  failed: ["processing"],
};

export const DISPUTE_TRANSITIONS: Record<DisputeState, DisputeState[]> = {
  open: ["evidence", "dismissed"],
  evidence: ["arbitration", "dismissed"],
  arbitration: ["resolved_buyer", "resolved_seller", "dismissed"],
  resolved_buyer: [],
  resolved_seller: [],
  dismissed: [],
};

export function canTransitionReturn(from: ReturnState, to: ReturnState): boolean {
  return RETURN_TRANSITIONS[from]?.includes(to) ?? false;
}
export function canTransitionRefund(from: RefundState, to: RefundState): boolean {
  return REFUND_TRANSITIONS[from]?.includes(to) ?? false;
}
export function canTransitionDispute(from: DisputeState, to: DisputeState): boolean {
  return DISPUTE_TRANSITIONS[from]?.includes(to) ?? false;
}

export interface TransitionResult<S> {
  ok: boolean;
  state: S;
  error?: string;
}

export function transitionReturn(from: ReturnState, to: ReturnState): TransitionResult<ReturnState> {
  return canTransitionReturn(from, to) ? { ok: true, state: to } : { ok: false, state: from, error: `illegal_return_transition:${from}->${to}` };
}
export function transitionRefund(from: RefundState, to: RefundState): TransitionResult<RefundState> {
  return canTransitionRefund(from, to) ? { ok: true, state: to } : { ok: false, state: from, error: `illegal_refund_transition:${from}->${to}` };
}
export function transitionDispute(from: DisputeState, to: DisputeState): TransitionResult<DisputeState> {
  return canTransitionDispute(from, to) ? { ok: true, state: to } : { ok: false, state: from, error: `illegal_dispute_transition:${from}->${to}` };
}

const OPEN_RETURN: ReturnState[] = ["requested", "approved", "in_transit", "received"];
const OPEN_REFUND: RefundState[] = ["requested", "approved", "processing"];
const OPEN_DISPUTE: DisputeState[] = ["open", "evidence", "arbitration"];

export const isOpenReturn = (s: ReturnState) => OPEN_RETURN.includes(s);
export const isOpenRefund = (s: RefundState) => OPEN_REFUND.includes(s);
export const isOpenDispute = (s: DisputeState) => OPEN_DISPUTE.includes(s);
