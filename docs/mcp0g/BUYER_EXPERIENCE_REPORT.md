# MCP-0G.2 — Buyer Experience Report

The buyer can complete the full journey from one coherent surface set.

| Stage | Route | Realised by | Notes |
|---|---|---|---|
| Home | `/`, `/home` | 0E discovery + product grids | Intelligent product grid |
| Search | `/search` | hybrid AI search (env-gated) | Degrades to keyword |
| Discover | `/discover` | 0E buyer intelligence | Trending/recommended |
| Categories | `/categories`, `/categories/[slug]` | 0B catalog | 97-node taxonomy |
| Product | `/product/[slug]` | 0A gallery + 0D trust panel | Real gallery, trust signals |
| Cart | `/cart` | 0F cart engine | Multi-seller, validation, save-for-later, coupons, live quote |
| Checkout | `/checkout` | 0F checkout + real atomic RPC | Address/slots/coupon/GST/risk gate |
| Orders | `/orders` | 0F Buyer Order Center | My Orders / Tracking / Returns / Reviews / Analytics / Reorder |
| Tracking | `/tracking/[id]` | 0F tracking engine | ETA, delay, confidence, history |
| Returns/Refunds | `/orders` (tab) | 0F + 0D | Eligibility + resolution steps |
| Support | order center + product Q&A | 0D | Linked from order context |
| Reviews | product page | 0D | `canReview` gated |
| Wishlist | `/wishlist` | marketplace | Move to cart |

## Coherence improvements (0G)
- Unified Order Center (0F) gives one home for orders/tracking/returns/refunds/
  reviews/reorder — replacing the prior list-only page.
- Consistent buyer loading skeleton (`(buyer)/loading.tsx`).
- All buyer surfaces share `PageContainer` + `SectionWrapper` + brand tokens.

## Verdict
Buyer experience **feels complete**: discovery → purchase → receive → review →
return → refund all function and look like one product. Score **9/10**
(−1: live ranking/personalisation need OpenAI keys).
