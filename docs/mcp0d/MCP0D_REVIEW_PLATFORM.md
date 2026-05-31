# MCP-0D.2 — Review & Rating Platform

Engine: `lib/trust/reviews.ts`. Reuses existing `reviews` (verified-purchase +
moderation_status) + `review_votes`. Surfaced via the Buyer Trust Panel + Admin
Trust Center. Benchmarks: Amazon, Flipkart reviews.

| Capability | Delivered |
|------------|-----------|
| Verified reviews / verified purchase | ✅ `is_verified_purchase` honoured in aggregation + `verifiedPct` |
| Product ratings | ✅ `aggregateProductRating` (average, distribution 1-5, recommend %) |
| Seller ratings | ✅ folded into seller reputation (satisfaction) |
| Review moderation | ✅ visible-only aggregation; `reviewRisk` routes to moderation |
| Review history / editing | ✅ `reviews.updated_at`; edit via existing schema |
| Review voting / helpfulness | ✅ `review_votes` + `helpfulnessScore` |
| Review reporting | ✅ moderation_status + risk reasons |
| Review analytics | ✅ distribution + verified/recommend % |
| Review governance | ✅ fraud heuristics (`reviewRisk`) in trust intelligence |

`validateReview` enforces rating range + body length. Verified by tests
(aggregation excludes hidden, verified %, fraud flags, helpfulness).
