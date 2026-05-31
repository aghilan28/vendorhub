/**
 * EC-2 Phase 5 — Reviews & Ratings
 * Submission validation, verified-purchase enforcement, fraud heuristics, moderation, seller responses.
 */

import { createHash } from "crypto";
import type { ModerationStatus, ReviewSubmission, ReviewValidationResult, SellerReviewResponse } from "./types";

function id(seed: string): string {
  return createHash("sha256").update(seed).digest("hex").slice(0, 16);
}

// ─── Submission validation ────────────────────────────────────────────────────
export function validateReview(
  submission: ReviewSubmission,
  context: {
    isVerifiedPurchase: boolean;
    customerReviewCount30Days: number;
    duplicateForProduct: boolean;
    bodyContainsLinks?: boolean;
  },
): ReviewValidationResult {
  const errors: string[] = [];

  if (!Number.isInteger(submission.rating) || submission.rating < 1 || submission.rating > 5) {
    errors.push("Rating must be an integer 1-5");
  }
  if (!submission.title || submission.title.trim().length < 3) {
    errors.push("Title must be at least 3 characters");
  }
  if (submission.title && submission.title.length > 120) {
    errors.push("Title must be 120 characters or fewer");
  }
  if (!submission.body || submission.body.trim().length < 10) {
    errors.push("Review body must be at least 10 characters");
  }
  if (submission.body && submission.body.length > 5000) {
    errors.push("Review body must be 5000 characters or fewer");
  }
  if (context.duplicateForProduct) {
    errors.push("You have already reviewed this product");
  }

  // Fraud heuristics
  let fraudScore = 0;
  if (!context.isVerifiedPurchase) fraudScore += 30;
  if (context.customerReviewCount30Days > 10) fraudScore += 25;
  else if (context.customerReviewCount30Days > 5) fraudScore += 10;
  if (context.bodyContainsLinks) fraudScore += 30;
  if (submission.body && submission.body.trim().length < 20) fraudScore += 10;
  fraudScore = Math.min(100, fraudScore);

  let recommendedModeration: ModerationStatus;
  if (fraudScore >= 70) recommendedModeration = "FLAGGED";
  else if (!context.isVerifiedPurchase) recommendedModeration = "PENDING";
  else recommendedModeration = "VISIBLE";

  return {
    valid: errors.length === 0,
    errors,
    isVerifiedPurchase: context.isVerifiedPurchase,
    fraudScore,
    recommendedModeration,
  };
}

// ─── Link detection helper ────────────────────────────────────────────────────
export function containsLinks(text: string): boolean {
  return /(https?:\/\/|www\.|\.[a-z]{2,}\/)/i.test(text);
}

// ─── Moderation ────────────────────────────────────────────────────────────────
export function moderateReview(current: ModerationStatus, action: "approve" | "flag" | "remove" | "restore"): ModerationStatus {
  switch (action) {
    case "approve":
    case "restore":
      return "VISIBLE";
    case "flag":
      return "FLAGGED";
    case "remove":
      return "REMOVED";
    default:
      return current;
  }
}

// ─── Seller response ─────────────────────────────────────────────────────────────
export function createSellerResponse(reviewId: string, sellerId: string, body: string): SellerReviewResponse {
  if (!body || body.trim().length < 5) throw new Error("Seller response must be at least 5 characters");
  return { reviewId, sellerId, body: body.trim(), at: new Date().toISOString() };
}

// ─── Rating aggregation ──────────────────────────────────────────────────────────
export function aggregateRatings(reviews: Array<{ rating: number; moderationStatus: ModerationStatus }>): {
  average: number;
  count: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
} {
  const visible = reviews.filter((r) => r.moderationStatus === "VISIBLE");
  const distribution: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of visible) {
    const k = Math.min(5, Math.max(1, Math.round(r.rating))) as 1 | 2 | 3 | 4 | 5;
    distribution[k]++;
  }
  const count = visible.length;
  const average = count > 0 ? Number((visible.reduce((s, r) => s + r.rating, 0) / count).toFixed(2)) : 0;
  return { average, count, distribution };
}

export function reviewId(userId: string, productId: string): string {
  return id(`review-${userId}-${productId}`);
}
