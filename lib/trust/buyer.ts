// MCP-0D.11 — Buyer Trust Signals (what the buyer sees on a product/seller)

import type { BuyerTrustSignals, ProductRating, ProductReputation, SellerReputation } from "./types";

export function buildBuyerTrustSignals(input: {
  seller: SellerReputation;
  product: ProductReputation;
  rating: ProductRating;
}): BuyerTrustSignals {
  const { seller, product, rating } = input;
  const signals = [
    { label: "Verified seller", value: seller.verified ? "Verified" : "Unverified", ok: seller.verified },
    { label: "Seller trust", value: `${seller.score}/100 (${seller.tier.replace("_", " ")})`, ok: seller.score >= 70 },
    { label: "Product trust", value: `${product.trustScore}/100`, ok: product.trustScore >= 70 },
    { label: "Rating", value: `${rating.average} (${rating.count})`, ok: rating.average >= 3.8 },
    { label: "Verified reviews", value: `${rating.verifiedPct}%`, ok: rating.verifiedPct >= 50 },
    { label: "Return risk", value: product.returnRisk <= 10 ? "Low" : product.returnRisk <= 25 ? "Moderate" : "High", ok: product.returnRisk <= 25 },
  ];

  return {
    verifiedSeller: seller.verified,
    verifiedProduct: product.confidenceIndex >= 60,
    sellerTrustScore: seller.score,
    productTrustScore: product.trustScore,
    signals,
    policies: {
      returns: "7-day easy returns on eligible items",
      refunds: "Refunds processed to the original payment method after pickup",
    },
    guarantees: ["Buyer protection on every order", "Verified-purchase reviews", "Secure payments"],
  };
}
