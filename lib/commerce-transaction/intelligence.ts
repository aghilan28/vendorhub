// MCP-0F.9 — Transaction Intelligence engine (deterministic, pure).
//
// Detects checkout-drop / payment / fulfillment / delivery / return / refund /
// operational risks on REAL transaction activity (orders, payments, shipments,
// returns, refunds) and produces ranked action recommendations. Bridges to the
// MCP-0E IntelligenceRecommendation shape so the existing activation connectors
// (execution / governance / simulation) operate on commerce-transaction risk.

import type { IntelligenceRecommendation } from "@/lib/marketplace-intelligence/types";
import type { RefundInput, ReturnInput } from "@/lib/trust/types";
import type {
  PaymentAnalytics,
  Severity,
  Tone,
  TransactionIntelligence,
  TransactionRisk,
  TransactionRiskKind,
  TransactionThroughput,
  TxOrder,
} from "./types";
import { buildFulfillmentHealth } from "./fulfillment";
import { buildPaymentAnalytics } from "./payment";
import type { Shipment } from "./types";

function severityToScore(severity: Severity): number {
  switch (severity) {
    case "critical":
      return 92;
    case "warning":
      return 74;
    case "watch":
      return 55;
    case "opportunity":
      return 45;
    default:
      return 30;
  }
}

function makeRisk(
  kind: TransactionRiskKind,
  severity: Severity,
  scope: TransactionRisk["scope"],
  refId: string,
  title: string,
  detail: string,
  recommendedAction: string,
): TransactionRisk {
  return { id: `txr-${kind}-${refId}`, kind, severity, scope, refId, title, detail, recommendedAction, score: severityToScore(severity) };
}

// ── Throughput ──────────────────────────────────────────────────────────────

export function buildThroughput(orders: TxOrder[], returns: ReturnInput[], refunds: RefundInput[]): TransactionThroughput {
  const total = orders.length;
  const gmv = orders.reduce((sum, o) => sum + o.total, 0);
  const cancelled = orders.filter((o) => o.state === "cancelled").length;
  const fulfilled = orders.filter((o) => o.state === "delivered" || o.state === "completed").length;
  const confirmedPlus = orders.filter((o) => o.state !== "draft" && o.state !== "placed" && o.state !== "cancelled").length;
  const placed = orders.filter((o) => o.state !== "draft").length;
  const shipped = orders.filter((o) => ["shipped", "out_for_delivery", "delivered", "completed"].includes(o.state)).length;
  const delivered = orders.filter((o) => ["delivered", "completed"].includes(o.state)).length;

  return {
    orders: total,
    gmv,
    averageOrderValue: total ? Math.round(gmv / total) : 0,
    placedToConfirmed: placed ? Math.round((confirmedPlus / placed) * 100) : 0,
    shippedToDelivered: shipped ? Math.round((delivered / shipped) * 100) : 0,
    cancellationRate: total ? Math.round((cancelled / total) * 100) : 0,
    returnRate: total ? Math.round((returns.length / total) * 100) : 0,
    refundRate: total ? Math.round((refunds.length / total) * 100) : 0,
    fulfillmentRate: total ? Math.round((fulfilled / total) * 100) : 0,
  };
}

// ── Risk detection ─────────────────────────────────────────────────────────────

export interface TransactionRiskInput {
  orders: TxOrder[];
  shipments: Shipment[];
  payments: PaymentAnalytics;
  returns: ReturnInput[];
  refunds: RefundInput[];
  now?: string;
}

export function detectTransactionRisks(input: TransactionRiskInput): TransactionRisk[] {
  const now = input.now ?? new Date().toISOString();
  const risks: TransactionRisk[] = [];
  const total = input.orders.length;

  // Checkout drop: many drafts never placed.
  const drafts = input.orders.filter((o) => o.state === "draft").length;
  if (total > 0 && drafts > 0 && drafts >= Math.ceil(total * 0.2)) {
    risks.push(
      makeRisk(
        "checkout_drop",
        drafts >= Math.ceil(total * 0.4) ? "warning" : "watch",
        "marketplace",
        "marketplace",
        "Checkout drop-off detected",
        `${drafts} of ${total} carts stalled at checkout (draft).`,
        "Simplify the checkout review step and offer saved addresses + UPI to recover drop-offs.",
      ),
    );
  }

  // Payment risk.
  if (input.payments.failureRate >= 20 && input.payments.total > 0) {
    risks.push(
      makeRisk(
        "payment_risk",
        input.payments.failureRate >= 35 ? "critical" : "warning",
        "marketplace",
        "payments",
        "Elevated payment failure rate",
        `${input.payments.failureRate}% of payments failed; ₹${input.payments.recoverableValue.toLocaleString("en-IN")} is recoverable.`,
        "Trigger payment retry with UPI fallback and reconcile pending captures.",
      ),
    );
  }

  // Fulfillment risk (SLA breaches).
  const fulfillment = buildFulfillmentHealth(input.orders, input.shipments, now);
  if (fulfillment.breaches > 0) {
    risks.push(
      makeRisk(
        "fulfillment_risk",
        fulfillment.breaches >= 3 ? "critical" : "warning",
        "marketplace",
        "fulfillment",
        "Fulfillment SLA breaches",
        `${fulfillment.breaches} order(s) past their fulfillment SLA.`,
        "Escalate breached orders to the seller and offer dispatch assistance.",
      ),
    );
  }

  // Delivery risk (delayed active shipments).
  const delayed = input.shipments.filter(
    (s) => !s.deliveredAt && s.state !== "cancelled" && new Date(now).getTime() > new Date(s.promisedAt).getTime(),
  ).length;
  if (delayed > 0) {
    risks.push(
      makeRisk(
        "delivery_risk",
        delayed >= 3 ? "warning" : "watch",
        "marketplace",
        "delivery",
        "Delayed deliveries in transit",
        `${delayed} active shipment(s) are past their promised time.`,
        "Notify buyers proactively and consider courier failover.",
      ),
    );
  }

  // Return risk.
  if (total > 0 && input.returns.length >= Math.ceil(total * 0.15)) {
    risks.push(
      makeRisk(
        "return_risk",
        "warning",
        "marketplace",
        "returns",
        "High return rate",
        `${input.returns.length} return(s) against ${total} order(s).`,
        "Review the products/sellers driving returns and tighten listing accuracy.",
      ),
    );
  }

  // Refund risk (failed refunds).
  const failedRefunds = input.refunds.filter((r) => r.status === "failed").length;
  if (failedRefunds > 0) {
    risks.push(
      makeRisk(
        "refund_risk",
        "warning",
        "marketplace",
        "refunds",
        "Refund failures need reconciliation",
        `${failedRefunds} refund(s) failed at the provider.`,
        "Run financial reconciliation and re-initiate the failed refunds.",
      ),
    );
  }

  // Operational risk (overall fulfillment health degraded).
  if (fulfillment.tone === "critical" || fulfillment.tone === "degraded") {
    risks.push(
      makeRisk(
        "operational_risk",
        fulfillment.tone === "critical" ? "critical" : "warning",
        "marketplace",
        "operations",
        "Commerce operations degraded",
        `Fulfillment health is ${fulfillment.score}/100 (${fulfillment.tone}).`,
        "Open the Commerce Governance Center and clear breaches/disputes.",
      ),
    );
  }

  return risks.sort((a, b) => b.score - a.score);
}

// ── Bridge to MCP-0E recommendations ────────────────────────────────────────

const RISK_TO_ACTIVATION: Record<TransactionRiskKind, IntelligenceRecommendation["activation"]> = {
  checkout_drop: "simulation",
  payment_risk: "execution",
  fulfillment_risk: "execution",
  delivery_risk: "execution",
  return_risk: "governance",
  refund_risk: "execution",
  operational_risk: "execution",
};

function toPriority(severity: Severity): IntelligenceRecommendation["priority"] {
  if (severity === "critical") return "critical";
  if (severity === "warning") return "high";
  if (severity === "watch") return "medium";
  return "low";
}

/** Convert transaction risks into MCP-0E recommendations (for activation). */
export function risksToRecommendations(risks: TransactionRisk[]): IntelligenceRecommendation[] {
  return risks.map((risk) => ({
    id: risk.id,
    kind: "marketplace_action",
    scope: "marketplace",
    refId: risk.refId,
    severity: risk.severity,
    priority: toPriority(risk.severity),
    title: risk.title,
    detail: risk.detail,
    action: risk.recommendedAction,
    evidence: [`kind:${risk.kind}`, `score:${risk.score}`],
    activation: RISK_TO_ACTIVATION[risk.kind],
    score: risk.score,
  }));
}

// ── Assembler ────────────────────────────────────────────────────────────────

function toneFromScore(score: number): Tone {
  if (score >= 85) return "healthy";
  if (score >= 70) return "watch";
  if (score >= 50) return "degraded";
  return "critical";
}

export function buildTransactionIntelligence(input: TransactionRiskInput): TransactionIntelligence {
  const throughput = buildThroughput(input.orders, input.returns, input.refunds);
  const risks = detectTransactionRisks(input);

  // Health score: fulfillment + payment success + low cancellations/returns − risk weight.
  const fulfillment = buildFulfillmentHealth(input.orders, input.shipments, input.now);
  let score = Math.round(
    fulfillment.score * 0.4 +
      (input.payments.total ? input.payments.successRate : 100) * 0.25 +
      throughput.fulfillmentRate * 0.2 +
      Math.max(0, 100 - throughput.cancellationRate - throughput.returnRate) * 0.15,
  );
  const criticalCount = risks.filter((r) => r.severity === "critical").length;
  score = Math.max(0, Math.min(100, score - criticalCount * 6));

  return { score, tone: toneFromScore(score), throughput, risks };
}

/** Convenience: build intelligence directly from raw orders/payments/shipments. */
export function buildTransactionIntelligenceFromActivity(args: {
  orders: TxOrder[];
  shipments: Shipment[];
  payments: Parameters<typeof buildPaymentAnalytics>[0];
  returns: ReturnInput[];
  refunds: RefundInput[];
  now?: string;
}): TransactionIntelligence {
  return buildTransactionIntelligence({
    orders: args.orders,
    shipments: args.shipments,
    payments: buildPaymentAnalytics(args.payments),
    returns: args.returns,
    refunds: args.refunds,
    now: args.now,
  });
}
