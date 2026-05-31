// MCP-0D.10 — Trust Intelligence (operates on REAL marketplace activity)
// Detects review fraud, seller/product risk, refund/return abuse, trust
// degradation and marketplace risk; emits insights, alerts, recommendations
// and forecasts.

import { reviewRisk } from "./reviews";
import { isOpenDispute } from "./lifecycles";
import type { SellerReputation, TrustActivityInput, TrustInsight } from "./types";

function pct(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 1000) / 10 : 0;
}

export function detectTrustInsights(
  input: TrustActivityInput,
  reputations: SellerReputation[],
): TrustInsight[] {
  const insights: TrustInsight[] = [];

  // Review fraud
  const risky = input.reviews
    .map((r) => ({ review: r, ...reviewRisk(r) }))
    .filter((x) => x.risk >= 45);
  if (risky.length > 0) {
    insights.push({
      kind: "review_fraud",
      severity: risky.length >= 5 ? "critical" : "warning",
      title: `${risky.length} reviews flagged as likely fraudulent`,
      detail: `Common signals: ${Array.from(new Set(risky.flatMap((x) => x.reasons))).slice(0, 3).join(", ")}.`,
      action: "Route flagged reviews to moderation",
    });
  }

  // Seller risk (low reputation / high return)
  for (const rep of reputations.filter((r) => r.score < 55 || r.returnRate > 15).slice(0, 5)) {
    insights.push({
      kind: "seller_risk",
      severity: rep.score < 40 ? "critical" : "warning",
      title: `Seller at risk: ${rep.name} (${rep.score}/100)`,
      detail: `Fulfilment ${rep.fulfillmentQuality}%, return rate ${rep.returnRate}%, complaints ${rep.complaintRate}%.`,
      action: rep.score < 40 ? "Consider restriction / review" : "Open a coaching workflow",
      entityId: rep.sellerId,
    });
  }

  // Refund + return abuse (by buyer concentration)
  const refundByBuyer = new Map<string, number>();
  for (const r of input.refunds) if (r.buyerId) refundByBuyer.set(r.buyerId, (refundByBuyer.get(r.buyerId) ?? 0) + 1);
  const abusiveRefunders = [...refundByBuyer.entries()].filter(([, n]) => n >= 4);
  if (abusiveRefunders.length > 0) {
    insights.push({
      kind: "refund_abuse",
      severity: "warning",
      title: `${abusiveRefunders.length} buyers with high refund frequency`,
      detail: "Repeated refund requests may indicate abuse.",
      action: "Review high-frequency refund accounts",
    });
  }
  const returnRate = pct(input.returns.length, input.orders.length);
  if (returnRate > 12) {
    insights.push({
      kind: "return_abuse",
      severity: returnRate > 20 ? "critical" : "warning",
      title: `Elevated marketplace return rate ${returnRate}%`,
      detail: "Return rate above the 12% tolerance.",
      action: "Investigate top return reasons + sellers",
    });
  }

  // Product risk
  const lowRatedReviews = input.reviews.filter((r) => r.moderationStatus === "VISIBLE" && r.rating <= 2);
  if (lowRatedReviews.length >= 5) {
    insights.push({
      kind: "product_risk",
      severity: "watch",
      title: `${lowRatedReviews.length} low-rated reviews across the catalog`,
      detail: "Concentrations of 1-2 star reviews can signal quality issues.",
      action: "Surface low-trust products for catalog review",
    });
  }

  // Trust degradation (open disputes)
  const openDisputes = input.disputes.filter((d) => isOpenDispute(d.state)).length;
  if (openDisputes > 0) {
    insights.push({
      kind: "trust_degradation",
      severity: openDisputes >= 5 ? "warning" : "watch",
      title: `${openDisputes} open disputes`,
      detail: "Unresolved disputes erode buyer trust.",
      action: "Prioritise arbitration of open disputes",
    });
  }

  // Marketplace risk (composite)
  const avgRep = reputations.length ? Math.round(reputations.reduce((s, r) => s + r.score, 0) / reputations.length) : 0;
  if (avgRep < 65 && reputations.length > 0) {
    insights.push({
      kind: "marketplace_risk",
      severity: avgRep < 50 ? "critical" : "warning",
      title: `Average seller reputation ${avgRep}/100`,
      detail: "Marketplace-wide reputation below the healthy threshold.",
      action: "Launch a seller quality program",
    });
  }

  // Forecast + recommendation headline
  insights.push({
    kind: "forecast",
    severity: "info",
    title: `Trust trend ${avgRep >= 75 ? "improving" : avgRep >= 60 ? "stable" : "declining"}`,
    detail: `Projected on current reputation (${avgRep}/100), return rate (${returnRate}%) and ${openDisputes} open disputes.`,
    action: "Maintain moderation + dispute SLAs",
  });

  const headline = insights.find((i) => i.severity === "critical") ?? insights.find((i) => i.severity === "warning");
  if (headline) {
    insights.unshift({
      kind: "recommendation",
      severity: headline.severity,
      title: "Top trust action",
      detail: headline.title,
      action: headline.action,
      entityId: headline.entityId,
    });
  }

  return insights;
}
