/**
 * Phase C.9 — Business observability. Each recorder does TWO things:
 *  1. increments a Prometheus counter (time-series, alertable), and
 *  2. emits a structured operational event (searchable, correlated to a trace).
 *
 * This guarantees business outcomes are never silent: a failed payment is both a
 * metric (kartex_payments_failed_total) and a correlated log line. Owners +
 * thresholds are documented in docs/audit/PHASE_C_OBSERVABILITY.md (BI report).
 */
import { M } from "./metrics";
import { recordOperationalEvent } from "./core";
import type { TraceContext } from "./types";

type Ctx = { trace?: Partial<TraceContext>; metadata?: Record<string, unknown> };

export const businessMetrics = {
  orderCreated(ctx: Ctx = {}) {
    M.ordersCreated.inc();
    recordOperationalEvent("info", "business.order.created", ctx.metadata, { domain: "checkout", trace: ctx.trace });
  },
  orderCompleted(ctx: Ctx = {}) {
    M.ordersCompleted.inc();
    recordOperationalEvent("info", "business.order.completed", ctx.metadata, { domain: "checkout", trace: ctx.trace });
  },
  orderFailed(reason: string, ctx: Ctx = {}) {
    M.ordersFailed.inc({ reason });
    recordOperationalEvent("warn", "business.order.failed", { reason, ...ctx.metadata }, { domain: "checkout", trace: ctx.trace });
  },
  checkoutAttempt(ctx: Ctx = {}) {
    M.checkoutAttempts.inc();
    recordOperationalEvent("info", "business.checkout.attempt", ctx.metadata, { domain: "checkout", trace: ctx.trace });
  },
  checkoutSuccess(ctx: Ctx = {}) {
    M.checkoutSuccess.inc();
    recordOperationalEvent("info", "business.checkout.success", ctx.metadata, { domain: "checkout", trace: ctx.trace });
  },
  paymentAuthorized(ctx: Ctx = {}) {
    M.paymentsAuthorized.inc();
    recordOperationalEvent("info", "business.payment.authorized", ctx.metadata, { domain: "payment", trace: ctx.trace });
  },
  paymentFailed(reason: string, ctx: Ctx = {}) {
    M.paymentsFailed.inc({ reason });
    recordOperationalEvent("error", "business.payment.failed", { reason, ...ctx.metadata }, { domain: "payment", trace: ctx.trace });
  },
  refundRequested(ctx: Ctx = {}) {
    M.refundsRequested.inc();
    recordOperationalEvent("info", "business.refund.requested", ctx.metadata, { domain: "refund", trace: ctx.trace });
  },
  refundCompleted(ctx: Ctx = {}) {
    M.refundsCompleted.inc();
    recordOperationalEvent("info", "business.refund.completed", ctx.metadata, { domain: "refund", trace: ctx.trace });
  },
  searchQuery(zeroResults: boolean, ctx: Ctx = {}) {
    M.searchQueries.inc();
    if (zeroResults) M.searchZeroResults.inc();
    recordOperationalEvent("info", "business.search.query", { zeroResults, ...ctx.metadata }, { domain: "ai", trace: ctx.trace });
  },
  notificationSent(channel: string, ctx: Ctx = {}) {
    M.notificationsSent.inc({ channel });
    recordOperationalEvent("info", "business.notification.sent", { channel, ...ctx.metadata }, { domain: "realtime", trace: ctx.trace });
  },
  notificationFailed(channel: string, reason: string, ctx: Ctx = {}) {
    M.notificationsFailed.inc({ channel });
    recordOperationalEvent("warn", "business.notification.failed", { channel, reason, ...ctx.metadata }, { domain: "realtime", trace: ctx.trace });
  },
};

export type BusinessMetrics = typeof businessMetrics;
