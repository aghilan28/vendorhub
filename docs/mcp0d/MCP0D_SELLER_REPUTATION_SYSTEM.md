# MCP-0D.4 — Seller Reputation System

Engine: `lib/trust/reputation.ts` (`computeSellerReputation`). UI:
`/seller/reputation` + Admin Trust Center → Reputation tab. Complements the
existing KYC trust score with **operational** reputation.

## Computed from REAL activity
| Factor | Source | Weight |
|--------|--------|--------|
| Fulfilment quality | delivered / total orders | 30% |
| Satisfaction | review average | 25% |
| Response time | seller response minutes | 15% |
| Return rate | returns / orders | 15% |
| Refund rate | refunds / orders | 15% |
| Verified bonus | verification status | +5 |

## Outputs
Trust score (0-100), tier (`new/rising/established/top_rated/restricted`),
reputation index, response time, fulfilment quality, return/refund/complaint
rates, satisfaction, verification status, and **badges** (Verified Seller,
Reliable Fulfilment, Highly Rated, Fast Responder, Low Returns, Top Seller).

Top Seller program = `tier === "top_rated"` (score ≥ 85 + verified).
Verified by tests: verified seller earns badge; weaker seller scores lower.
