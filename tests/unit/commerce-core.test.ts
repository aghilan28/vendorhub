/**
 * EC-2 — Commerce Core Completion Tests
 * Payouts · Returns · Refunds · Reviews · Delivery · Communications · Support bridge
 */

import { describe, it, expect } from "vitest";
import {
  // payouts
  canTransitionPayout, createPayout, transitionPayout, recordSale, computeEarnings, appendLedgerEntry, DEFAULT_COMMISSION_RATE,
  // returns
  canTransitionReturn, createReturnRequest, transitionReturn, approveReturn, rejectReturn, isReturnEligible, returnsByStatus, linkRefund,
  // refunds
  resolveRefundAmount, createRefund, markRefundProcessing, completeRefund, failRefund, creditStoreCredit, storeCreditBalance, refundAnalytics,
  // reviews
  validateReview, containsLinks, moderateReview, createSellerResponse, aggregateRatings,
  // delivery
  canTransitionShipment, createShipment, applyShipmentEvent, normalizeProviderStatus, processWebhook, retryFailedShipment, isProviderSupported,
  // communications
  composeEmail, dispatchEmail, retryableEmails, emailQueueStats, EMAIL_TEMPLATES, MAX_EMAIL_ATTEMPTS,
  // support bridge
  toDbSupportStatus,
  type SellerLedgerEntry, type StoreCreditLedgerEntry, type EmailMessage, type EmailProvider,
} from "@/lib/commerce-core";

// ─── Payouts ─────────────────────────────────────────────────────────────────
describe("Payouts", () => {
  it("enforces mandated status lifecycle", () => {
    expect(canTransitionPayout("PENDING", "PROCESSING")).toBe(true);
    expect(canTransitionPayout("PROCESSING", "SETTLED")).toBe(true);
    expect(canTransitionPayout("SETTLED", "REVERSED")).toBe(true);
    expect(canTransitionPayout("PENDING", "SETTLED")).toBe(false);
    expect(canTransitionPayout("REVERSED", "PENDING")).toBe(false);
  });

  it("creates a PENDING payout with correct net", () => {
    const p = createPayout({ sellerId: "s1", grossAmount: 1000, commission: 80 });
    expect(p.status).toBe("PENDING");
    expect(p.netAmount).toBe(920);
    expect(p.reference).toMatch(/^VHPO/);
  });

  it("transitions through full lifecycle and throws on illegal", () => {
    let p = createPayout({ sellerId: "s1", grossAmount: 1000, commission: 80 });
    p = transitionPayout(p, "PROCESSING", "admin", "admin");
    p = transitionPayout(p, "SETTLED", "admin", "admin");
    expect(p.status).toBe("SETTLED");
    expect(p.settledAt).not.toBeNull();
    expect(() => transitionPayout(p, "PROCESSING", "admin", "admin")).toThrow();
  });

  it("records sale with commission and computes earnings", () => {
    let ledger: SellerLedgerEntry[] = [];
    ledger = [...ledger, ...recordSale(ledger, { sellerId: "s1", orderId: "o1", grossAmount: 1000 })];
    const commission = Math.round(1000 * DEFAULT_COMMISSION_RATE);
    const earnings = computeEarnings("s1", ledger, []);
    expect(earnings.lifetimeGross).toBe(1000);
    expect(earnings.lifetimeCommission).toBe(commission);
    expect(earnings.lifetimeNet).toBe(1000 - commission);
  });

  it("ledger balance is monotonic", () => {
    let ledger: SellerLedgerEntry[] = [];
    const e1 = appendLedgerEntry(ledger, { sellerId: "s1", orderId: "o1", type: "SALE", amount: 500, note: "" });
    ledger = [e1];
    const e2 = appendLedgerEntry(ledger, { sellerId: "s1", orderId: "o1", type: "COMMISSION", amount: -40, note: "" });
    expect(e1.balanceAfter).toBe(500);
    expect(e2.balanceAfter).toBe(460);
  });
});

// ─── Returns ─────────────────────────────────────────────────────────────────
describe("Returns", () => {
  it("enforces lifecycle", () => {
    expect(canTransitionReturn("REQUESTED", "UNDER_REVIEW")).toBe(true);
    expect(canTransitionReturn("APPROVED", "IN_TRANSIT")).toBe(true);
    expect(canTransitionReturn("RECEIVED", "COMPLETED")).toBe(true);
    expect(canTransitionReturn("REQUESTED", "COMPLETED")).toBe(false);
    expect(canTransitionReturn("REJECTED", "APPROVED")).toBe(false);
  });

  it("creates a valid return request", () => {
    const r = createReturnRequest({ orderId: "o1", buyerId: "b1", sellerId: "s1", reason: "defective", description: "Item stopped working" });
    expect(r.status).toBe("REQUESTED");
    expect(r.audit.length).toBe(1);
  });

  it("rejects invalid reason/description", () => {
    expect(() => createReturnRequest({ orderId: "o1", buyerId: "b1", sellerId: "s1", reason: "bogus" as any, description: "x" })).toThrow();
    expect(() => createReturnRequest({ orderId: "o1", buyerId: "b1", sellerId: "s1", reason: "defective", description: "no" })).toThrow();
  });

  it("approve/reject flow works through review", () => {
    const r = createReturnRequest({ orderId: "o1", buyerId: "b1", sellerId: "s1", reason: "damaged", description: "Arrived broken" });
    const approved = approveReturn(r, "s1", "Confirmed damage");
    expect(approved.status).toBe("APPROVED");
    const rejected = rejectReturn(r, "s1", "seller", "Outside window");
    expect(rejected.status).toBe("REJECTED");
  });

  it("eligibility respects window", () => {
    expect(isReturnEligible({ deliveredAt: null }).eligible).toBe(false);
    const recent = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    expect(isReturnEligible({ deliveredAt: recent }).eligible).toBe(true);
    const old = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    expect(isReturnEligible({ deliveredAt: old }).eligible).toBe(false);
  });

  it("links refund and aggregates by status", () => {
    let r = createReturnRequest({ orderId: "o1", buyerId: "b1", sellerId: "s1", reason: "defective", description: "Broken item" });
    r = linkRefund(r, "ref-1");
    expect(r.refundId).toBe("ref-1");
    const counts = returnsByStatus([r]);
    expect(counts.REQUESTED).toBe(1);
  });
});

// ─── Refunds ─────────────────────────────────────────────────────────────────
describe("Refunds", () => {
  it("resolves amounts per mode", () => {
    expect(resolveRefundAmount("full", 1000)).toBe(1000);
    expect(resolveRefundAmount("partial", 1000, 400)).toBe(400);
    expect(() => resolveRefundAmount("partial", 1000, 0)).toThrow();
    expect(() => resolveRefundAmount("partial", 1000, 2000)).toThrow();
  });

  it("full refund lifecycle (gateway)", () => {
    let r = createRefund({ orderId: "o1", customerId: "c1", mode: "full", orderTotal: 1000, reason: "defective" });
    expect(r.state).toBe("INITIATED");
    r = markRefundProcessing(r, "rzp_ref_123");
    expect(r.gatewayReference).toBe("rzp_ref_123");
    r = completeRefund(r);
    expect(r.state).toBe("COMPLETED");
    expect(r.completedAt).not.toBeNull();
  });

  it("wallet/store-credit refunds mark walletCredited", () => {
    let r = createRefund({ orderId: "o1", customerId: "c1", mode: "store_credit", orderTotal: 500, reason: "goodwill" });
    r = markRefundProcessing(r, null);
    r = completeRefund(r);
    expect(r.walletCredited).toBe(true);
  });

  it("failed refund can be retried", () => {
    let r = createRefund({ orderId: "o1", customerId: "c1", mode: "full", orderTotal: 1000, reason: "x" });
    r = failRefund(r, "gateway down");
    expect(r.state).toBe("FAILED");
  });

  it("store credit ledger accumulates and reports balance", () => {
    let ledger: StoreCreditLedgerEntry[] = [];
    const e1 = creditStoreCredit(ledger, { customerId: "c1", amount: 500, source: "refund", refundId: "r1" });
    ledger = [e1];
    const e2 = creditStoreCredit(ledger, { customerId: "c1", amount: -200, source: "redemption" });
    ledger = [e1, e2];
    expect(storeCreditBalance(ledger, "c1")).toBe(300);
  });

  it("analytics summarizes modes", () => {
    const refunds = [
      completeRefund(markRefundProcessing(createRefund({ orderId: "o1", customerId: "c1", mode: "full", orderTotal: 1000, reason: "" }), "g1")),
      createRefund({ orderId: "o2", customerId: "c2", mode: "wallet", orderTotal: 500, reason: "" }),
    ];
    const a = refundAnalytics(refunds);
    expect(a.total).toBe(2);
    expect(a.completed).toBe(1);
    expect(a.byMode.full).toBe(1);
    expect(a.byMode.wallet).toBe(1);
  });
});

// ─── Reviews ─────────────────────────────────────────────────────────────────
describe("Reviews", () => {
  it("validates a good verified review", () => {
    const res = validateReview(
      { userId: "u1", productId: "p1", orderItemId: "oi1", rating: 5, title: "Great product", body: "Worked perfectly, highly recommend." },
      { isVerifiedPurchase: true, customerReviewCount30Days: 1, duplicateForProduct: false },
    );
    expect(res.valid).toBe(true);
    expect(res.recommendedModeration).toBe("VISIBLE");
  });

  it("rejects bad input", () => {
    const res = validateReview(
      { userId: "u1", productId: "p1", orderItemId: null, rating: 9, title: "x", body: "short" },
      { isVerifiedPurchase: false, customerReviewCount30Days: 0, duplicateForProduct: false },
    );
    expect(res.valid).toBe(false);
    expect(res.errors.length).toBeGreaterThan(0);
  });

  it("flags high-fraud reviews", () => {
    const res = validateReview(
      { userId: "u1", productId: "p1", orderItemId: null, rating: 5, title: "Buy now", body: "Visit http://spam.example to win" },
      { isVerifiedPurchase: false, customerReviewCount30Days: 20, duplicateForProduct: false, bodyContainsLinks: true },
    );
    expect(res.fraudScore).toBeGreaterThanOrEqual(70);
    expect(res.recommendedModeration).toBe("FLAGGED");
  });

  it("unverified review goes to PENDING moderation", () => {
    const res = validateReview(
      { userId: "u1", productId: "p1", orderItemId: null, rating: 4, title: "Decent", body: "It is a decent product overall." },
      { isVerifiedPurchase: false, customerReviewCount30Days: 1, duplicateForProduct: false },
    );
    expect(res.recommendedModeration).toBe("PENDING");
  });

  it("blocks duplicate review", () => {
    const res = validateReview(
      { userId: "u1", productId: "p1", orderItemId: null, rating: 4, title: "Again", body: "Reviewing once more here." },
      { isVerifiedPurchase: true, customerReviewCount30Days: 1, duplicateForProduct: true },
    );
    expect(res.valid).toBe(false);
  });

  it("detects links", () => {
    expect(containsLinks("see http://x.com")).toBe(true);
    expect(containsLinks("just text")).toBe(false);
  });

  it("moderation transitions", () => {
    expect(moderateReview("VISIBLE", "flag")).toBe("FLAGGED");
    expect(moderateReview("FLAGGED", "remove")).toBe("REMOVED");
    expect(moderateReview("REMOVED", "restore")).toBe("VISIBLE");
  });

  it("seller response validation + aggregation", () => {
    expect(() => createSellerResponse("r1", "s1", "no")).toThrow();
    const resp = createSellerResponse("r1", "s1", "Thanks for the feedback!");
    expect(resp.reviewId).toBe("r1");
    const agg = aggregateRatings([
      { rating: 5, moderationStatus: "VISIBLE" },
      { rating: 3, moderationStatus: "VISIBLE" },
      { rating: 1, moderationStatus: "REMOVED" },
    ]);
    expect(agg.count).toBe(2);
    expect(agg.average).toBe(4);
  });
});

// ─── Delivery ────────────────────────────────────────────────────────────────
describe("Delivery", () => {
  it("supports providers", () => {
    expect(isProviderSupported("shiprocket")).toBe(true);
    expect(isProviderSupported("unknown")).toBe(false);
  });

  it("creates shipment + enforces transitions", () => {
    const s = createShipment({ orderId: "o1", provider: "shiprocket", pickupPincode: "560001", dropPincode: "560100", weightKg: 1, codAmount: 0 });
    expect(s.status).toBe("CREATED");
    expect(s.trackingNumber).toMatch(/^TRK/);
    expect(canTransitionShipment("CREATED", "PICKUP_SCHEDULED")).toBe(true);
    expect(canTransitionShipment("DELIVERED", "IN_TRANSIT")).toBe(false);
  });

  it("rejects bad pincodes", () => {
    expect(() => createShipment({ orderId: "o1", provider: "local", pickupPincode: "abc", dropPincode: "560100", weightKg: 1, codAmount: 0 })).toThrow();
  });

  it("applies events through lifecycle", () => {
    let s = createShipment({ orderId: "o1", provider: "delhivery", pickupPincode: "560001", dropPincode: "560100", weightKg: 1, codAmount: 0 });
    s = applyShipmentEvent(s, "PICKUP_SCHEDULED", {});
    s = applyShipmentEvent(s, "PICKED_UP", {});
    s = applyShipmentEvent(s, "IN_TRANSIT", {});
    s = applyShipmentEvent(s, "OUT_FOR_DELIVERY", {});
    s = applyShipmentEvent(s, "DELIVERED", { note: "Left at door" });
    expect(s.status).toBe("DELIVERED");
    expect(s.events.length).toBe(6);
  });

  it("normalizes provider statuses", () => {
    expect(normalizeProviderStatus("OUT FOR DELIVERY")).toBe("OUT_FOR_DELIVERY");
    expect(normalizeProviderStatus("delivered")).toBe("DELIVERED");
    expect(normalizeProviderStatus("nonsense")).toBeNull();
  });

  it("processes webhook idempotently", () => {
    let s = createShipment({ orderId: "o1", provider: "shiprocket", pickupPincode: "560001", dropPincode: "560100", weightKg: 1, codAmount: 0 });
    const r1 = processWebhook(s, { status: "PICKUP SCHEDULED" });
    expect(r1.applied).toBe(true);
    s = r1.shipment;
    const dup = processWebhook(s, { status: "PICKUP SCHEDULED" });
    expect(dup.applied).toBe(false);
    const illegal = processWebhook(s, { status: "DELIVERED" });
    expect(illegal.applied).toBe(false);
  });

  it("retries failed shipments", () => {
    let s = createShipment({ orderId: "o1", provider: "porter", pickupPincode: "560001", dropPincode: "560100", weightKg: 1, codAmount: 0 });
    s = applyShipmentEvent(s, "FAILED", { note: "pickup failed" });
    const retried = retryFailedShipment(s);
    expect(retried.status).toBe("PICKUP_SCHEDULED");
  });
});

// ─── Communications ──────────────────────────────────────────────────────────
describe("Communications", () => {
  it("composes valid emails for every template", () => {
    const templates = Object.keys(EMAIL_TEMPLATES) as Array<keyof typeof EMAIL_TEMPLATES>;
    for (const t of templates) {
      const msg = composeEmail(t, "user@example.com", { name: "A", orderNumber: "VH1", total: 100, status: "x", returnId: "r1", mode: "full", amount: 50, reference: "ref", ticketNumber: "T1", title: "t", message: "m", trackingNumber: "TRK1" });
      expect(msg.state).toBe("QUEUED");
      expect(msg.subject.length).toBeGreaterThan(0);
    }
  });

  it("rejects invalid recipient", () => {
    expect(() => composeEmail("order_confirmation", "not-an-email", {})).toThrow();
  });

  it("queues when no provider (degrade-safe)", async () => {
    const msg = composeEmail("order_confirmation", "user@example.com", { name: "A", orderNumber: "VH1", total: 100 });
    const out = await dispatchEmail(msg, null);
    expect(out.state).toBe("QUEUED");
  });

  it("sends via provider, retries on failure", async () => {
    const okProvider: EmailProvider = { name: "ok", send: async () => ({ ok: true }) };
    const msg = composeEmail("order_confirmation", "user@example.com", { name: "A", orderNumber: "VH1", total: 100 });
    const sent = await dispatchEmail(msg, okProvider);
    expect(sent.state).toBe("SENT");

    let calls = 0;
    const flaky: EmailProvider = { name: "flaky", send: async () => { calls++; return { ok: false, error: "boom" }; } };
    const failed = await dispatchEmail(msg, flaky);
    expect(failed.state).toBe("FAILED");
    expect(calls).toBe(MAX_EMAIL_ATTEMPTS);
  });

  it("queue stats + retryable", () => {
    const q: EmailMessage[] = [
      { ...composeEmail("order_confirmation", "a@b.com", { name: "x", orderNumber: "1", total: 1 }), state: "SENT" },
      { ...composeEmail("refund_update", "a@b.com", { orderNumber: "1", mode: "full", amount: 1, status: "x" }), state: "FAILED", attempts: 1 },
    ];
    const stats = emailQueueStats(q);
    expect(stats.sent).toBe(1);
    expect(stats.failed).toBe(1);
    expect(retryableEmails(q).length).toBe(1);
  });
});

// ─── Support bridge ──────────────────────────────────────────────────────────
describe("Support bridge", () => {
  it("maps engine status to DB enum", () => {
    expect(toDbSupportStatus("open")).toBe("open");
    expect(toDbSupportStatus("assigned")).toBe("in_progress");
    expect(toDbSupportStatus("waiting_customer")).toBe("waiting");
    expect(toDbSupportStatus("resolved")).toBe("resolved");
    expect(toDbSupportStatus("closed")).toBe("closed");
  });
});
