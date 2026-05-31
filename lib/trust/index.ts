// MCP-0D — Trust Layer engine (public surface)

export * from "./types";
export * from "./lifecycles";
export * from "./reviews";
export * from "./qa";
export * from "./reputation";
export * from "./support";
export * from "./buyer";
export * from "./intelligence";
export { SAMPLE_TRUST_INPUT } from "./sample";

import { detectTrustInsights } from "./intelligence";
import { computeSellerReputation } from "./reputation";
import { summariseSupport } from "./support";
import { isOpenDispute, isOpenRefund, isOpenReturn } from "./lifecycles";
import { reviewRisk } from "./reviews";
import type { TrustActivityInput, TrustGovernanceSummary, TrustSnapshot, Tone } from "./types";

function tone(score: number): Tone {
  if (score >= 80) return "healthy";
  if (score >= 65) return "watch";
  if (score >= 45) return "degraded";
  return "critical";
}

/** Assembles the full trust snapshot from real (or sample) marketplace activity. */
export function buildTrustSnapshot(input: TrustActivityInput): TrustSnapshot {
  const sellerReputations = input.sellers.map((s) =>
    computeSellerReputation(s, input.orders, input.returns, input.refunds, input.reviews),
  );
  const insights = detectTrustInsights(input, sellerReputations);
  const support = summariseSupport(input.tickets);

  const flaggedReviews = input.reviews.filter((r) => reviewRisk(r).risk >= 45 || r.moderationStatus !== "VISIBLE").length;
  const avgRep = sellerReputations.length
    ? Math.round(sellerReputations.reduce((s, r) => s + r.score, 0) / sellerReputations.length)
    : 0;
  const verifiedReviewPct = input.reviews.length
    ? Math.round((input.reviews.filter((r) => r.verifiedPurchase).length / input.reviews.length) * 100)
    : 0;

  const marketplaceTrustScore = Math.round(avgRep * 0.6 + verifiedReviewPct * 0.2 + (100 - Math.min(100, flaggedReviews * 5)) * 0.2);

  const governance: TrustGovernanceSummary = {
    marketplaceTrustScore,
    tone: tone(marketplaceTrustScore),
    totalReviews: input.reviews.length,
    flaggedReviews,
    openReturns: input.returns.filter((r) => isOpenReturn(r.status)).length,
    openRefunds: input.refunds.filter((r) => isOpenRefund(r.status)).length,
    openDisputes: input.disputes.filter((d) => isOpenDispute(d.state)).length,
    openTickets: input.tickets.filter((t) => t.status === "open" || t.status === "in_progress" || t.status === "waiting").length,
    atRiskSellers: sellerReputations.filter((r) => r.score < 55).length,
  };

  return { governance, sellerReputations, insights, support };
}
