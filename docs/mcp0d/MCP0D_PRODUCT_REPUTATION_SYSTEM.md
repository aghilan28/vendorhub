# MCP-0D.5 — Product Reputation System

Engine: `lib/trust/reputation.ts` (`computeProductReputation`). Surfaced via the
Buyer Trust Panel.

## Outputs
| Metric | Meaning |
|--------|---------|
| Trust score (0-100) | composite of quality + review + (100 − return risk) |
| Quality score | review score × 0.6 + complaint score × 0.4 |
| Review score | normalised review average |
| Complaint score | inverse of return risk |
| Return risk (0-100) | returns / orders (scaled) |
| Authenticity signals | verified-review %, review volume, low returns |
| Confidence index | grows with review volume (caps at 100) |
| Trend | up / flat / down from review score |

Operates on **real** reviews + returns + order volume. Verified by tests (bounds,
trend classification).
