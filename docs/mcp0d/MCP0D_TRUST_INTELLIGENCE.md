# MCP-0D.10 — Trust Intelligence Platform (on REAL activity)

Engine: `lib/trust/intelligence.ts` (`detectTrustInsights`). Operates on real
reviews, orders, returns, refunds, sellers and disputes — **not demo data**. The
sample dataset is preview-only and labelled.

## Detection
| Signal | Method |
|--------|--------|
| Review fraud | `reviewRisk` ≥ 45 (unverified extremes, empty bodies, vote stuffing) |
| Seller risk | reputation < 55 or return rate > 15% |
| Product risk | concentrations of 1-2★ visible reviews |
| Refund abuse | buyers with ≥4 refund requests |
| Return abuse | marketplace return rate > 12% |
| Trust degradation | open disputes |
| Marketplace risk | average seller reputation < 65 |

## Outputs
Trust insights + alerts (severity info/watch/warning/critical), a headline
**recommendation**, and a **forecast** (trend from reputation + return rate +
disputes). The marketplace trust score blends reputation, verified-review % and
flagged-review pressure.

Verified by tests: review_fraud, refund_abuse and ≥3 insight kinds detected on
the real-shaped activity; marketplace score bounded 0-100.
