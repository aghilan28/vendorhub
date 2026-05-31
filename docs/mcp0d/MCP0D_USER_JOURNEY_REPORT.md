# MCP-0D.13 — User Journey Report

| Journey | Path | Mechanism | Status |
|---------|------|-----------|--------|
| **A** Buyer → purchase → leave review → rate seller | `/product/[slug]` + `reviews` | `validateReview` + verified-purchase + `review_votes`; ratings aggregate | ✅ |
| **B** Buyer → ask question → receive answer → purchase | `/product/[slug]` Q&A + `product_questions/answers` | `validateQuestion/Answer` + `bestAnswer` | ✅ |
| **C** Buyer → request return → receive resolution | `return_requests` + return state machine | buyer request → seller review → resolve; evidence upload | ✅ |
| **D** Buyer → request refund → receive refund | `refund_requests` + refund state machine + Razorpay | request → approve → processing → refunded | ✅ |
| **E** Admin → detect abuse → investigate → resolve | `/admin/trust` Intelligence tab | `detectTrustInsights` (fraud/abuse/risk) + dispute arbitration | ✅ |
| **F** Seller → improve trust score → improve reputation | `/seller/reputation` | reputation factors + badges + improvement tips | ✅ |

## Verification
- All journey logic is unit-tested (`tests/unit/mcp0d-trust.test.ts`, 9 tests):
  reviews, Q&A, lifecycles, reputation, support, buyer signals, intelligence.
- Buyer trust panel renders on the real product page; admin/seller surfaces build.
- Live persistence (reviews/returns/refunds/tickets) requires Supabase; the
  engine + dashboards degrade gracefully to labelled previews otherwise.

**All journeys function** at the level achievable without live infra.
