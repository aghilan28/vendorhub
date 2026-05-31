import { describe, expect, it } from "vitest";
import {
  // state machine
  canTransition,
  applyTransition,
  nextStates,
  sellerNextStates,
  isTerminal,
  lifecycleProgress,
  toDbOrderStatus,
  fromDbOrderStatus,
  STATE_META,
  TRANSITIONS,
  // cart
  addItem,
  removeItem,
  updateQuantity,
  saveForLater,
  moveToCart,
  toggleWishlist,
  validateCart,
  // coupons
  applyCoupon,
  evaluateCouponCode,
  bestCoupon,
  // checkout
  buildCheckoutQuote,
  buildCheckoutReview,
  validateAddress,
  computeTax,
  codEligible,
  checkoutRiskScore,
  deliverySlots,
  // payment
  buildPaymentPlan,
  planPaymentRetry,
  buildPaymentAnalytics,
  paymentGovernanceSignals,
  needsReconciliation,
  // fulfillment
  buildFulfillmentQueue,
  buildFulfillmentHealth,
  // tracking
  buildTrackingView,
  buildDeliveryPerformance,
  deliveryDelayAlerts,
  // post-purchase
  returnEligibility,
  canReview,
  refundResolutionSteps,
  // intelligence
  buildTransactionIntelligence,
  buildThroughput,
  detectTransactionRisks,
  risksToRecommendations,
  // assembler + sample
  buildTransactionSnapshot,
  SAMPLE_TRANSACTION_INPUT,
  SAMPLE_CART_LINES,
  SAMPLE_ADDRESSES,
  type CartLine,
  type TransactionState,
  type TxOrder,
} from "@/lib/commerce-transaction";
import { activateRecommendation } from "@/lib/marketplace-intelligence";

const NOW = "2026-05-31T06:00:00.000Z";
const snapshot = buildTransactionSnapshot(SAMPLE_TRANSACTION_INPUT);

describe("MCP-0F.5 order lifecycle state machine", () => {
  it("models the mandated 12 states", () => {
    expect(Object.keys(TRANSITIONS)).toHaveLength(12);
    for (const s of ["draft", "placed", "confirmed", "packed", "shipped", "out_for_delivery", "delivered", "completed", "cancelled", "returned", "refunded", "disputed"] as TransactionState[]) {
      expect(TRANSITIONS[s]).toBeDefined();
      expect(STATE_META[s]).toBeDefined();
    }
  });

  it("allows only legal transitions and rejects illegal ones", () => {
    expect(canTransition("draft", "placed")).toBe(true);
    expect(canTransition("placed", "confirmed")).toBe(true);
    expect(canTransition("delivered", "returned")).toBe(true);
    expect(canTransition("delivered", "shipped")).toBe(false);
    expect(canTransition("refunded", "placed")).toBe(false);
  });

  it("applyTransition produces an audited event or an error", () => {
    const ok = applyTransition("placed", "confirmed", "seller", "Seller accepted", NOW);
    expect(ok.ok).toBe(true);
    expect(ok.event?.from).toBe("placed");
    expect(ok.event?.to).toBe("confirmed");
    expect(ok.event?.actor).toBe("seller");

    const bad = applyTransition("delivered", "packed", "seller", "nope", NOW);
    expect(bad.ok).toBe(false);
    expect(bad.state).toBe("delivered");
    expect(bad.error).toContain("Illegal");
  });

  it("identifies terminal states and seller forward actions", () => {
    expect(isTerminal("refunded")).toBe(true);
    expect(isTerminal("delivered")).toBe(false);
    expect(nextStates("draft")).toContain("placed");
    expect(sellerNextStates("placed")).toEqual(["confirmed"]);
    expect(sellerNextStates("packed")).toEqual(["shipped"]);
  });

  it("computes monotonic lifecycle progress on the happy path", () => {
    expect(lifecycleProgress("placed")).toBeLessThan(lifecycleProgress("shipped"));
    expect(lifecycleProgress("delivered")).toBe(100);
    expect(lifecycleProgress("completed")).toBe(100);
    expect(lifecycleProgress("cancelled")).toBe(0);
  });

  it("maps to/from the live DB order machine", () => {
    expect(toDbOrderStatus("out_for_delivery")).toBe("OUT_FOR_DELIVERY");
    expect(toDbOrderStatus("completed")).toBe("DELIVERED");
    expect(fromDbOrderStatus("OUT_FOR_DELIVERY")).toBe("out_for_delivery");
    expect(fromDbOrderStatus("PENDING")).toBe("placed");
  });
});

describe("MCP-0F.2 cart platform", () => {
  const base: CartLine[] = SAMPLE_CART_LINES;

  it("adds, removes and updates quantity (clamped to availability)", () => {
    const added = addItem(base, { ...base[0], id: "new", productId: "SKU-RICE", quantity: 2 });
    // same product+sku merges into existing active line
    expect(added.find((l) => l.productId === "SKU-RICE")?.quantity).toBe(3);

    const removed = removeItem(base, "cl1");
    expect(removed.find((l) => l.id === "cl1")).toBeUndefined();

    const clamped = updateQuantity(base, "cl2", 99); // cl2 available = 3
    expect(clamped.find((l) => l.id === "cl2")?.quantity).toBe(3);
  });

  it("moves items between active / saved / wishlist lists", () => {
    const saved = saveForLater(base, "cl1");
    expect(saved.find((l) => l.id === "cl1")?.listStatus).toBe("saved");
    const back = moveToCart(saved, "cl1");
    expect(back.find((l) => l.id === "cl1")?.listStatus).toBe("active");
    const wished = toggleWishlist(base, "cl1");
    expect(wished.find((l) => l.id === "cl1")?.listStatus).toBe("wishlist");
  });

  it("validates inventory, groups by seller, and flags low stock", () => {
    const v = validateCart(base);
    // active lines from two sellers (s1, s2); cl4 is saved
    expect(v.groups.length).toBe(2);
    expect(v.saved.length).toBe(1);
    expect(v.totals.itemCount).toBe(4); // 1 + 2 + 1 active units
    // cl2 has available 3 <= lowStockThreshold 5 -> low_stock watch
    expect(v.issues.some((i) => i.kind === "low_stock")).toBe(true);
  });

  it("flags insufficient stock and out of stock", () => {
    const lines: CartLine[] = [
      { ...base[0], id: "x1", quantity: 5, available: 2 },
      { ...base[0], id: "x2", productId: "Y", sku: "Y", quantity: 1, available: 0 },
    ];
    const v = validateCart(lines);
    expect(v.issues.some((i) => i.kind === "insufficient_stock")).toBe(true);
    expect(v.issues.some((i) => i.kind === "out_of_stock")).toBe(true);
    expect(v.ok).toBe(false);
  });
});

describe("MCP-0F.3 coupon engine", () => {
  const ctx = { subtotal: 1000, sellerIds: ["s1", "s2"], now: NOW };

  it("applies percent with max cap", () => {
    const r = applyCoupon({ code: "P", type: "percent", value: 10, minOrder: 100, maxDiscount: 80, active: true }, ctx);
    expect(r.applied).toBe(true);
    expect(r.discount).toBe(80); // capped from 100
  });

  it("rejects below-min, expired, inactive and wrong-seller coupons", () => {
    expect(applyCoupon({ code: "F", type: "flat", value: 50, minOrder: 5000, active: true }, ctx).applied).toBe(false);
    expect(applyCoupon({ code: "E", type: "flat", value: 50, minOrder: 100, active: true, expiresAt: "2000-01-01T00:00:00Z" }, ctx).applied).toBe(false);
    expect(applyCoupon({ code: "I", type: "flat", value: 50, minOrder: 100, active: false }, ctx).applied).toBe(false);
    expect(applyCoupon({ code: "S", type: "flat", value: 50, minOrder: 100, active: true, sellerId: "s9" }, ctx).applied).toBe(false);
  });

  it("bundle requires multiple sellers", () => {
    expect(applyCoupon({ code: "B", type: "bundle", value: 75, minOrder: 100, active: true }, { ...ctx, sellerIds: ["s1"] }).applied).toBe(false);
    expect(applyCoupon({ code: "B", type: "bundle", value: 75, minOrder: 100, active: true }, ctx).applied).toBe(true);
  });

  it("evaluates by code and picks the best available coupon", () => {
    const found = evaluateCouponCode("welcome10", SAMPLE_TRANSACTION_INPUT.coupons, ctx);
    expect(found.code).toBe("WELCOME10");
    const best = bestCoupon(SAMPLE_TRANSACTION_INPUT.coupons, { subtotal: 1500, sellerIds: ["s1", "s2"], now: NOW });
    expect(best?.applied).toBe(true);
  });
});

describe("MCP-0F.3 checkout platform", () => {
  it("validates addresses", () => {
    expect(validateAddress(SAMPLE_ADDRESSES[0]).ok).toBe(true);
    expect(validateAddress({ ...SAMPLE_ADDRESSES[0], pincode: "xx" }).ok).toBe(false);
    expect(validateAddress(null).ok).toBe(false);
  });

  it("computes GST split", () => {
    const tax = computeTax(1000, 18);
    expect(tax.tax).toBe(180);
    expect(tax.cgst + tax.sgst).toBe(180);
  });

  it("builds a priced quote with coupon + delivery + tax", () => {
    const cart = validateCart(SAMPLE_CART_LINES);
    const quote = buildCheckoutQuote(cart, { couponCode: "FLAT100", coupons: SAMPLE_TRANSACTION_INPUT.coupons, deliveryOptionId: "standard", now: NOW });
    expect(quote.coupon?.applied).toBe(true);
    expect(quote.discount).toBe(100);
    expect(quote.total).toBe(Math.max(0, quote.subtotal - quote.discount) + quote.tax.tax + quote.deliveryFee);
    expect(quote.deliveryFee).toBe(0); // subtotal >= 499 free delivery
  });

  it("gates checkout review on blockers and risk", () => {
    const cart = validateCart(SAMPLE_CART_LINES);
    const review = buildCheckoutReview(cart, { address: SAMPLE_ADDRESSES[0], paymentMethod: "upi", coupons: SAMPLE_TRANSACTION_INPUT.coupons, now: NOW });
    expect(review.quote.total).toBeGreaterThan(0);
    expect(review.ready).toBe(true);

    const noAddress = buildCheckoutReview(cart, { address: null, paymentMethod: "upi", now: NOW });
    expect(noAddress.ready).toBe(false);
    expect(noAddress.blockers.length).toBeGreaterThan(0);
  });

  it("scores checkout risk and COD eligibility deterministically", () => {
    expect(codEligible(2000, SAMPLE_ADDRESSES[0])).toBe(true);
    expect(codEligible(99999, SAMPLE_ADDRESSES[0])).toBe(false);
    const low = checkoutRiskScore({ total: 500, itemCount: 2, paymentMethod: "upi", buyerPriorOrders: 5 });
    const high = checkoutRiskScore({ total: 25000, itemCount: 2, paymentMethod: "cod", newAddress: true, buyerPriorOrders: 0 });
    expect(high).toBeGreaterThan(low);
    expect(deliverySlots(NOW).length).toBeGreaterThan(0);
  });
});

describe("MCP-0F.4 payment platform", () => {
  it("builds method-specific plans with blockers", () => {
    expect(buildPaymentPlan(1000, "upi", true).steps.length).toBe(4);
    expect(buildPaymentPlan(1000, "cod", true).steps.length).toBe(2);
    expect(buildPaymentPlan(99999, "cod", true).blockers.length).toBeGreaterThan(0); // over COD max
  });

  it("plans retry/recovery for failed payments", () => {
    const failedCard = { id: "p", orderId: "o", method: "card" as const, state: "failed" as const, amount: 100, currency: "INR" as const, attempts: 1, createdAt: NOW, updatedAt: NOW };
    const decision = planPaymentRetry(failedCard);
    expect(decision.retryable).toBe(true);
    expect(decision.recommendedMethod).toBe("upi"); // card -> UPI recovery
    const exhausted = planPaymentRetry({ ...failedCard, attempts: 3 });
    expect(exhausted.retryable).toBe(false);
  });

  it("computes payment analytics + governance signals", () => {
    const analytics = buildPaymentAnalytics(SAMPLE_TRANSACTION_INPUT.payments);
    expect(analytics.total).toBe(SAMPLE_TRANSACTION_INPUT.payments.length);
    expect(analytics.successRate).toBeGreaterThan(0);
    expect(analytics.recoverableValue).toBeGreaterThan(0); // failed card 4999
    const signals = paymentGovernanceSignals(analytics);
    expect(Array.isArray(signals)).toBe(true);
  });

  it("flags stale pending payments for reconciliation", () => {
    const stale = { id: "p", orderId: "o", method: "upi" as const, state: "pending" as const, amount: 100, currency: "INR" as const, attempts: 1, createdAt: "2026-05-31T00:00:00.000Z", updatedAt: "2026-05-31T00:00:00.000Z" };
    expect(needsReconciliation(stale, NOW)).toBe(true);
  });
});

describe("MCP-0F.6 fulfillment platform", () => {
  it("builds an SLA-aware queue with next actions", () => {
    const queue = buildFulfillmentQueue(SAMPLE_TRANSACTION_INPUT.orders, NOW);
    expect(queue.length).toBeGreaterThan(0);
    const placed = queue.find((t) => t.state === "placed");
    expect(placed?.nextAction).toBe("accept");
    const packed = queue.find((t) => t.state === "packed");
    expect(packed?.nextAction).toBe("dispatch");
  });

  it("computes fulfillment health + courier health", () => {
    const health = buildFulfillmentHealth(SAMPLE_TRANSACTION_INPUT.orders, SAMPLE_TRANSACTION_INPUT.shipments, NOW);
    expect(health.score).toBeGreaterThanOrEqual(0);
    expect(health.score).toBeLessThanOrEqual(100);
    expect(health.couriers.length).toBeGreaterThan(0);
    expect(["healthy", "watch", "degraded", "critical"]).toContain(health.tone);
  });
});

describe("MCP-0F.7 delivery tracking platform", () => {
  it("builds a tracking view with ETA, delay and confidence", () => {
    const shipment = SAMPLE_TRANSACTION_INPUT.shipments.find((s) => s.id === "sh4")!; // shipped, promised in past
    const view = buildTrackingView(shipment, { now: NOW });
    expect(view.stage).toBe("shipped");
    expect(view.delayed).toBe(true);
    expect(view.confidence).toBeGreaterThanOrEqual(0);
    expect(view.history.length).toBeGreaterThan(0);
  });

  it("delivered shipments are full confidence with no ETA", () => {
    const delivered = SAMPLE_TRANSACTION_INPUT.shipments.find((s) => s.state === "delivered")!;
    const view = buildTrackingView(delivered, { now: NOW });
    expect(view.confidence).toBe(100);
    expect(view.etaMinutes).toBeNull();
  });

  it("computes delivery performance and delay alerts", () => {
    const perf = buildDeliveryPerformance(SAMPLE_TRANSACTION_INPUT.shipments, NOW);
    expect(perf.shipments).toBe(SAMPLE_TRANSACTION_INPUT.shipments.length);
    expect(perf.onTimePct).toBeGreaterThanOrEqual(0);
    const alerts = deliveryDelayAlerts(SAMPLE_TRANSACTION_INPUT.shipments, NOW);
    expect(Array.isArray(alerts)).toBe(true);
  });
});

describe("MCP-0F.8 post-purchase platform", () => {
  it("computes return eligibility windows", () => {
    const delivered: TxOrder = { ...SAMPLE_TRANSACTION_INPUT.orders[0], state: "delivered", events: [{ id: "e", from: "out_for_delivery", to: "delivered", actor: "system", note: "d", at: NOW }] };
    const eligible = returnEligibility(delivered, NOW);
    expect(eligible.eligible).toBe(true);
    expect(eligible.daysRemaining).toBeGreaterThan(0);

    const placed = SAMPLE_TRANSACTION_INPUT.orders.find((o) => o.state === "placed")!;
    expect(returnEligibility(placed, NOW).eligible).toBe(false);
  });

  it("allows reviews only on settled orders and tracks refund resolution", () => {
    expect(canReview({ ...SAMPLE_TRANSACTION_INPUT.orders[0], state: "delivered" })).toBe(true);
    expect(canReview({ ...SAMPLE_TRANSACTION_INPUT.orders[0], state: "placed" })).toBe(false);
    const steps = refundResolutionSteps("processing");
    expect(steps.find((s) => s.current)?.label).toBe("Processing");
  });

  it("summarises post-purchase activity", () => {
    expect(snapshot.postPurchase.openRefunds).toBeGreaterThanOrEqual(0);
    expect(snapshot.postPurchase.refundedValue).toBeGreaterThan(0); // one refunded sample
  });
});

describe("MCP-0F.9 transaction intelligence", () => {
  it("computes throughput from real order states", () => {
    const t = buildThroughput(SAMPLE_TRANSACTION_INPUT.orders, SAMPLE_TRANSACTION_INPUT.returns, SAMPLE_TRANSACTION_INPUT.refunds);
    expect(t.orders).toBe(SAMPLE_TRANSACTION_INPUT.orders.length);
    expect(t.gmv).toBeGreaterThan(0);
    expect(t.cancellationRate).toBeGreaterThan(0); // one cancelled sample
  });

  it("detects payment / fulfillment / delivery / refund risks", () => {
    const analytics = buildPaymentAnalytics(SAMPLE_TRANSACTION_INPUT.payments);
    const risks = detectTransactionRisks({
      orders: SAMPLE_TRANSACTION_INPUT.orders,
      shipments: SAMPLE_TRANSACTION_INPUT.shipments,
      payments: analytics,
      returns: SAMPLE_TRANSACTION_INPUT.returns,
      refunds: SAMPLE_TRANSACTION_INPUT.refunds,
      now: NOW,
    });
    expect(risks.length).toBeGreaterThan(0);
    // risks are ranked by score descending
    for (let i = 1; i < risks.length; i++) expect(risks[i - 1].score).toBeGreaterThanOrEqual(risks[i].score);
  });

  it("bridges risks into activatable MCP-0E recommendations", () => {
    const intel = buildTransactionIntelligence({
      orders: SAMPLE_TRANSACTION_INPUT.orders,
      shipments: SAMPLE_TRANSACTION_INPUT.shipments,
      payments: buildPaymentAnalytics(SAMPLE_TRANSACTION_INPUT.payments),
      returns: SAMPLE_TRANSACTION_INPUT.returns,
      refunds: SAMPLE_TRANSACTION_INPUT.refunds,
      now: NOW,
    });
    const recs = risksToRecommendations(intel.risks);
    expect(recs.length).toBe(intel.risks.length);
    // Every recommendation can be activated through the existing 0E connector.
    const fabricless = { fabric: { products: [], categories: [], stores: [], totals: {} as never, generatedAt: NOW, windowDays: 30, hasActivity: false } };
    for (const rec of recs) {
      const result = activateRecommendation(rec, fabricless as never);
      expect(result.activation).toBeDefined();
    }
  });
});

describe("MCP-0F assembler", () => {
  it("assembles a complete transaction snapshot deterministically", () => {
    const a = buildTransactionSnapshot(SAMPLE_TRANSACTION_INPUT);
    const b = buildTransactionSnapshot(SAMPLE_TRANSACTION_INPUT);
    expect(a.hasActivity).toBe(true);
    expect(a.intelligence.score).toBe(b.intelligence.score);
    expect(a.fulfillment.score).toBe(b.fulfillment.score);
    expect(a.payment.total).toBe(b.payment.total);
    expect(a.intelligence.tone).toBeDefined();
  });

  it("handles empty activity without throwing", () => {
    const empty = buildTransactionSnapshot({ orders: [], payments: [], shipments: [], coupons: [], returns: [], refunds: [], reviews: [], tickets: [], disputes: [] });
    expect(empty.hasActivity).toBe(false);
    expect(empty.fulfillment.openTasks).toBe(0);
    expect(empty.payment.total).toBe(0);
  });
});
