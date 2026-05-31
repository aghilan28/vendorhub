// MCP-0D — Review & Rating engine (aggregation, validation, moderation, fraud)

import type { ProductRating, ReviewInput } from "./types";

export interface ReviewValidation {
  ok: boolean;
  errors: string[];
}

export function validateReview(input: { rating: number; body?: string }): ReviewValidation {
  const errors: string[] = [];
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) errors.push("rating_out_of_range");
  if (input.body !== undefined && input.body.length > 4000) errors.push("body_too_long");
  return { ok: errors.length === 0, errors };
}

/** Visible reviews only contribute to public ratings. */
function visible(reviews: ReviewInput[]): ReviewInput[] {
  return reviews.filter((r) => r.moderationStatus === "VISIBLE");
}

/** Aggregates a product's rating, distribution, verified % and recommend %. */
export function aggregateProductRating(reviews: ReviewInput[]): ProductRating {
  const vis = visible(reviews);
  const distribution: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of vis) {
    const bucket = Math.min(5, Math.max(1, Math.round(r.rating))) as 1 | 2 | 3 | 4 | 5;
    distribution[bucket] += 1;
  }
  const count = vis.length;
  const sum = vis.reduce((s, r) => s + r.rating, 0);
  const verified = vis.filter((r) => r.verifiedPurchase).length;
  const recommended = vis.filter((r) => r.rating >= 4).length;
  return {
    average: count ? Math.round((sum / count) * 10) / 10 : 0,
    count,
    distribution,
    verifiedPct: count ? Math.round((verified / count) * 100) : 0,
    recommendedPct: count ? Math.round((recommended / count) * 100) : 0,
  };
}

export function helpfulnessScore(review: ReviewInput): number {
  if (review.totalVotes <= 0) return 0;
  return Math.round((review.helpfulVotes / review.totalVotes) * 100);
}

/**
 * Heuristic moderation/fraud risk for a single review (0..100).
 * Flags unverified extreme ratings, empty bodies and vote stuffing.
 */
export function reviewRisk(review: ReviewInput): { risk: number; reasons: string[] } {
  const reasons: string[] = [];
  let risk = 0;
  if (!review.verifiedPurchase) {
    risk += 25;
    reasons.push("unverified_purchase");
  }
  if (!review.verifiedPurchase && (review.rating === 5 || review.rating === 1)) {
    risk += 20;
    reasons.push("unverified_extreme_rating");
  }
  if (!review.body || review.body.trim().length < 8) {
    risk += 15;
    reasons.push("empty_body");
  }
  if (review.totalVotes > 0 && review.helpfulVotes / review.totalVotes > 0.95 && review.totalVotes > 50) {
    risk += 20;
    reasons.push("vote_stuffing");
  }
  return { risk: Math.min(100, risk), reasons };
}
