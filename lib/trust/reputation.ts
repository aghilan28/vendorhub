// MCP-0D — Seller & Product reputation engines (operate on real activity)

import { aggregateProductRating } from "./reviews";
import type {
  OrderInput,
  ProductReputation,
  RefundInput,
  ReturnInput,
  ReviewInput,
  SellerActivity,
  SellerReputation,
  SellerTier,
} from "./types";

function pct(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 1000) / 10 : 0;
}

function tierFor(score: number, verified: boolean): SellerTier {
  if (score < 40) return "restricted";
  if (score < 55) return "new";
  if (score < 70) return "rising";
  if (score < 85) return "established";
  return verified ? "top_rated" : "established";
}

/** Computes a seller's operational reputation from real orders/returns/refunds/reviews. */
export function computeSellerReputation(
  seller: SellerActivity,
  orders: OrderInput[],
  returns: ReturnInput[],
  refunds: RefundInput[],
  reviews: ReviewInput[],
): SellerReputation {
  const sellerOrders = orders.filter((o) => o.sellerId === seller.sellerId);
  const sellerReturns = returns.filter((r) => r.sellerId === seller.sellerId);
  const sellerRefunds = refunds.filter((r) => r.sellerId === seller.sellerId);
  const sellerReviews = reviews.filter((r) => r.sellerId === seller.sellerId);

  const delivered = sellerOrders.filter((o) => o.status === "delivered").length;
  const cancelled = sellerOrders.filter((o) => o.status === "cancelled").length;
  const total = Math.max(1, sellerOrders.length);

  const fulfillmentQuality = Math.round(pct(delivered, total));
  const returnRate = pct(sellerReturns.length, total);
  const refundRate = pct(sellerRefunds.length, total);
  const complaintRate = pct(cancelled + sellerReturns.length, total);

  const rating = aggregateProductRating(sellerReviews);
  const satisfaction = Math.round((rating.average / 5) * 100);

  // Response time score: faster = better (cap at 120 min).
  const responseScore = Math.max(0, 100 - Math.min(120, seller.responseMinutes) * 0.8);

  let score =
    fulfillmentQuality * 0.3 +
    satisfaction * 0.25 +
    responseScore * 0.15 +
    (100 - Math.min(100, returnRate * 3)) * 0.15 +
    (100 - Math.min(100, refundRate * 3)) * 0.15;
  if (seller.verified) score += 5;
  score = Math.max(0, Math.min(100, Math.round(score)));

  const badges: string[] = [];
  if (seller.verified) badges.push("Verified Seller");
  if (fulfillmentQuality >= 95) badges.push("Reliable Fulfilment");
  if (satisfaction >= 90) badges.push("Highly Rated");
  if (seller.responseMinutes <= 30) badges.push("Fast Responder");
  if (returnRate <= 2 && sellerOrders.length >= 5) badges.push("Low Returns");
  if (score >= 85) badges.push("Top Seller");

  return {
    sellerId: seller.sellerId,
    name: seller.name,
    score,
    tier: tierFor(score, seller.verified),
    reputationIndex: Math.round((score / 100) * 1000),
    responseTimeMinutes: seller.responseMinutes,
    fulfillmentQuality,
    returnRate,
    refundRate,
    complaintRate,
    satisfaction,
    verified: seller.verified,
    badges,
  };
}

/** Computes a product's reputation/trust from its reviews + returns. */
export function computeProductReputation(
  productId: string,
  reviews: ReviewInput[],
  returns: ReturnInput[],
  orderCount: number,
): ProductReputation {
  const productReviews = reviews.filter((r) => r.productId === productId);
  const rating = aggregateProductRating(productReviews);
  const reviewScore = Math.round((rating.average / 5) * 100);
  const returnRisk = Math.min(100, Math.round(pct(returns.length, Math.max(1, orderCount)) * 4));
  const complaintScore = Math.max(0, 100 - returnRisk);
  const qualityScore = Math.round(reviewScore * 0.6 + complaintScore * 0.4);

  const authenticitySignals: string[] = [];
  if (rating.verifiedPct >= 70) authenticitySignals.push("Mostly verified reviews");
  if (rating.count >= 20) authenticitySignals.push("High review volume");
  if (returnRisk <= 10) authenticitySignals.push("Low return rate");

  const confidenceIndex = Math.min(100, Math.round(rating.count >= 50 ? 100 : 40 + rating.count));
  const trustScore = Math.max(
    0,
    Math.min(100, Math.round(qualityScore * 0.5 + reviewScore * 0.3 + (100 - returnRisk) * 0.2)),
  );

  return {
    productId,
    trustScore,
    qualityScore,
    reviewScore,
    complaintScore,
    returnRisk,
    authenticitySignals,
    confidenceIndex,
    trend: reviewScore >= 80 ? "up" : reviewScore >= 60 ? "flat" : "down",
  };
}
