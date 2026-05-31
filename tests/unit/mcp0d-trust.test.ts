import { describe, expect, it } from "vitest";
import {
  aggregateProductRating,
  bestAnswer,
  buildBuyerTrustSignals,
  buildTrustSnapshot,
  canTransitionDispute,
  canTransitionRefund,
  canTransitionReturn,
  computeProductReputation,
  computeSellerReputation,
  detectTrustInsights,
  helpfulnessScore,
  qaAnalytics,
  reviewRisk,
  routeTickets,
  summariseSupport,
  transitionReturn,
  validateQuestion,
  validateReview,
  SAMPLE_TRUST_INPUT,
  type ReviewInput,
} from "@/lib/trust";

const review = (over: Partial<ReviewInput>): ReviewInput => ({
  id: "r",
  productId: "p1",
  sellerId: "s1",
  rating: 5,
  verifiedPurchase: true,
  helpfulVotes: 0,
  totalVotes: 0,
  moderationStatus: "VISIBLE",
  createdAt: "2026-05-21T00:00:00.000Z",
  ...over,
});

describe("MCP-0D reviews & ratings", () => {
  it("validates and aggregates ratings", () => {
    expect(validateReview({ rating: 6 }).ok).toBe(false);
    expect(validateReview({ rating: 4 }).ok).toBe(true);
    const agg = aggregateProductRating([
      review({ rating: 5, verifiedPurchase: true }),
      review({ rating: 3, verifiedPurchase: false }),
      review({ rating: 5, moderationStatus: "HIDDEN" }), // excluded
    ]);
    expect(agg.count).toBe(2);
    expect(agg.average).toBe(4);
    expect(agg.verifiedPct).toBe(50);
  });

  it("flags fraudulent reviews", () => {
    const risky = reviewRisk(review({ verifiedPurchase: false, rating: 5, body: "" }));
    expect(risky.risk).toBeGreaterThanOrEqual(45);
    expect(risky.reasons).toContain("unverified_extreme_rating");
    expect(helpfulnessScore(review({ helpfulVotes: 8, totalVotes: 10 }))).toBe(80);
  });
});

describe("MCP-0D Q&A", () => {
  it("validates and picks the best answer", () => {
    expect(validateQuestion("hi").ok).toBe(false);
    expect(validateQuestion("Is this fresh?").ok).toBe(true);
    const item = { id: "q", productId: "p", question: "?", status: "answered" as const, createdAt: "x", answers: [
      { id: "a1", body: "x", bySeller: false, votes: 9, accepted: false },
      { id: "a2", body: "y", bySeller: true, votes: 2, accepted: false },
    ] };
    expect(bestAnswer(item)?.id).toBe("a2"); // seller answer preferred
    const analytics = qaAnalytics([item, { ...item, id: "q2", answers: [] }]);
    expect(analytics.answerRate).toBe(50);
  });
});

describe("MCP-0D lifecycles", () => {
  it("enforces return/refund/dispute transitions", () => {
    expect(canTransitionReturn("requested", "approved")).toBe(true);
    expect(canTransitionReturn("rejected", "approved")).toBe(false);
    expect(transitionReturn("approved", "in_transit").ok).toBe(true);
    expect(transitionReturn("approved", "resolved").ok).toBe(false);
    expect(canTransitionRefund("processing", "refunded")).toBe(true);
    expect(canTransitionDispute("arbitration", "resolved_buyer")).toBe(true);
  });
});

describe("MCP-0D reputation", () => {
  it("computes seller reputation from activity", () => {
    const rep = computeSellerReputation(
      SAMPLE_TRUST_INPUT.sellers[0],
      SAMPLE_TRUST_INPUT.orders,
      SAMPLE_TRUST_INPUT.returns,
      SAMPLE_TRUST_INPUT.refunds,
      SAMPLE_TRUST_INPUT.reviews,
    );
    expect(rep.score).toBeGreaterThan(0);
    expect(rep.score).toBeLessThanOrEqual(100);
    expect(rep.badges).toContain("Verified Seller");

    const weak = computeSellerReputation(
      SAMPLE_TRUST_INPUT.sellers[1], // unverified, slow, high cancellations
      SAMPLE_TRUST_INPUT.orders,
      SAMPLE_TRUST_INPUT.returns,
      SAMPLE_TRUST_INPUT.refunds,
      SAMPLE_TRUST_INPUT.reviews,
    );
    expect(weak.score).toBeLessThan(rep.score);
  });

  it("computes product reputation + confidence", () => {
    const prod = computeProductReputation("p1", SAMPLE_TRUST_INPUT.reviews, SAMPLE_TRUST_INPUT.returns, 40);
    expect(prod.trustScore).toBeGreaterThanOrEqual(0);
    expect(prod.trustScore).toBeLessThanOrEqual(100);
    expect(["up", "flat", "down"]).toContain(prod.trend);
  });
});

describe("MCP-0D support", () => {
  it("routes by priority and summarises SLA", () => {
    const routed = routeTickets(SAMPLE_TRUST_INPUT.tickets);
    expect(routed[0].priority).toBe("urgent");
    const summary = summariseSupport(SAMPLE_TRUST_INPUT.tickets);
    expect(summary.open).toBeGreaterThan(0);
    expect(summary.byCategory.length).toBeGreaterThan(0);
  });
});

describe("MCP-0D buyer trust signals", () => {
  it("builds buyer-facing signals", () => {
    const snap = buildTrustSnapshot(SAMPLE_TRUST_INPUT);
    const seller = snap.sellerReputations[0];
    const product = computeProductReputation("p1", SAMPLE_TRUST_INPUT.reviews, SAMPLE_TRUST_INPUT.returns, 40);
    const rating = aggregateProductRating(SAMPLE_TRUST_INPUT.reviews.filter((r) => r.productId === "p1"));
    const signals = buildBuyerTrustSignals({ seller, product, rating });
    expect(signals.signals.length).toBeGreaterThan(0);
    expect(signals.guarantees.length).toBeGreaterThan(0);
    expect(typeof signals.verifiedSeller).toBe("boolean");
  });
});

describe("MCP-0D trust intelligence (on real activity)", () => {
  it("detects fraud / abuse / risk and builds a snapshot", () => {
    const snap = buildTrustSnapshot(SAMPLE_TRUST_INPUT);
    expect(snap.governance.marketplaceTrustScore).toBeGreaterThanOrEqual(0);
    expect(snap.governance.marketplaceTrustScore).toBeLessThanOrEqual(100);

    const kinds = new Set(detectTrustInsights(SAMPLE_TRUST_INPUT, snap.sellerReputations).map((i) => i.kind));
    expect(kinds.has("review_fraud")).toBe(true);
    expect(kinds.has("refund_abuse")).toBe(true);
    expect(kinds.size).toBeGreaterThanOrEqual(3);

    expect(snap.governance.openDisputes).toBeGreaterThanOrEqual(1);
    expect(snap.support.open).toBeGreaterThan(0);
  });
});
