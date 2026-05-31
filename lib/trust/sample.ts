// MCP-0D — Deterministic SAMPLE trust activity. PREVIEW ONLY.
// When configured, the trust engine runs on REAL reviews/orders/returns/refunds.

import type { TrustActivityInput } from "./types";

export const SAMPLE_TRUST_INPUT: TrustActivityInput = {
  sellers: [
    { sellerId: "s1", name: "Chennai Fresh Mart", verified: true, responseMinutes: 18 },
    { sellerId: "s2", name: "Bargain Bazaar", verified: false, responseMinutes: 140 },
    { sellerId: "s3", name: "Prime Electronics", verified: true, responseMinutes: 45 },
  ],
  orders: [
    ...Array.from({ length: 40 }, (_, i) => ({ id: `o-s1-${i}`, sellerId: "s1", status: i % 12 === 0 ? "cancelled" : "delivered", value: 300 + i, createdAt: "2026-05-20T09:00:00.000Z" })),
    ...Array.from({ length: 20 }, (_, i) => ({ id: `o-s2-${i}`, sellerId: "s2", status: i % 3 === 0 ? "cancelled" : "delivered", value: 120 + i, createdAt: "2026-05-20T09:00:00.000Z" })),
    ...Array.from({ length: 30 }, (_, i) => ({ id: `o-s3-${i}`, sellerId: "s3", status: "delivered", value: 8000 + i * 50, createdAt: "2026-05-20T09:00:00.000Z" })),
  ],
  reviews: [
    ...Array.from({ length: 18 }, (_, i) => ({ id: `r-s1-${i}`, productId: "p1", sellerId: "s1", rating: (i % 5) + 1 > 3 ? 5 : 4, verifiedPurchase: i % 4 !== 0, helpfulVotes: i, totalVotes: i + 2, moderationStatus: "VISIBLE" as const, createdAt: "2026-05-21T09:00:00.000Z", body: "Good product and fast delivery." })),
    ...Array.from({ length: 6 }, (_, i) => ({ id: `r-s2-${i}`, productId: "p2", sellerId: "s2", rating: i % 2 === 0 ? 5 : 1, verifiedPurchase: false, helpfulVotes: 60, totalVotes: 61, moderationStatus: "VISIBLE" as const, createdAt: "2026-05-21T09:00:00.000Z", body: "" })),
    ...Array.from({ length: 10 }, (_, i) => ({ id: `r-s3-${i}`, productId: "p3", sellerId: "s3", rating: i % 5 === 0 ? 3 : 5, verifiedPurchase: true, helpfulVotes: i, totalVotes: i + 1, moderationStatus: "VISIBLE" as const, createdAt: "2026-05-21T09:00:00.000Z", body: "Excellent, as described." })),
  ],
  returns: [
    ...Array.from({ length: 5 }, (_, i) => ({ id: `ret-s2-${i}`, orderId: `o-s2-${i}`, sellerId: "s2", buyerId: i < 2 ? "b9" : `b${i}`, status: "requested" as const, reason: "not as described", createdAt: "2026-05-22T09:00:00.000Z" })),
    { id: "ret-s1-0", orderId: "o-s1-1", sellerId: "s1", buyerId: "b1", status: "resolved" as const, reason: "size", createdAt: "2026-05-22T09:00:00.000Z" },
  ],
  refunds: [
    ...Array.from({ length: 5 }, (_, i) => ({ id: `rf-${i}`, orderId: `o-s2-${i}`, sellerId: "s2", buyerId: "b9", status: "requested" as const, amount: 120, createdAt: "2026-05-23T09:00:00.000Z" })),
    { id: "rf-ok", orderId: "o-s1-2", sellerId: "s1", buyerId: "b2", status: "refunded" as const, amount: 300, createdAt: "2026-05-23T09:00:00.000Z" },
  ],
  qa: [
    { id: "q1", productId: "p1", question: "Is this product fresh on delivery?", status: "answered", createdAt: "2026-05-20T09:00:00.000Z", answers: [{ id: "a1", body: "Yes, delivered within hours.", bySeller: true, votes: 12, accepted: true }] },
    { id: "q2", productId: "p3", question: "Does it support fast charging?", status: "open", createdAt: "2026-05-20T09:00:00.000Z", answers: [] },
  ],
  tickets: [
    { id: "t1", category: "delivery", priority: "urgent", status: "open", createdAt: "2026-05-24T09:00:00.000Z" },
    { id: "t2", category: "payment", priority: "high", status: "in_progress", createdAt: "2026-05-24T09:00:00.000Z", firstResponseMinutes: 90 },
    { id: "t3", category: "order", priority: "medium", status: "resolved", createdAt: "2026-05-24T09:00:00.000Z", firstResponseMinutes: 200 },
    { id: "t4", category: "product", priority: "low", status: "closed", createdAt: "2026-05-24T09:00:00.000Z", firstResponseMinutes: 600 },
  ],
  disputes: [
    { id: "d1", orderId: "o-s2-1", state: "arbitration", createdAt: "2026-05-25T09:00:00.000Z" },
    { id: "d2", orderId: "o-s2-3", state: "open", createdAt: "2026-05-25T09:00:00.000Z" },
  ],
};
