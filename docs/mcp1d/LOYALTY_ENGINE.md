# MCP-1D — Loyalty Engine (Phase 3)

`lib/customer-growth/loyalty.ts` — reward points, tiers, ledger, rules,
redemption, expiration, analytics and progress. The points balance is **derived
from the ledger**, so the engine is reproducible and auditable.

## Tiers

| Tier | Min lifetime points | Earn multiplier | Sample perks |
|------|--------------------:|:---------------:|--------------|
| Bronze | 0 | 1.00× | 1 pt / ₹100, birthday reward |
| Silver | 1,000 | 1.25× | early sale access |
| Gold | 5,000 | 1.50× | free delivery > ₹299, priority support |
| Platinum | 15,000 | 2.00× | free delivery always, concierge, exclusive drops |

## Functions

- `pointsForOrder(amount, tier)` — `round(amount/100 × multiplier)`.
- `tierForLifetimePoints(points)` — tier from lifetime earnings.
- `reduceLedger(entries)` — `{ balance, earnedLifetime, spentLifetime, expired,
  expiringSoon }`. Earn entries positive; redemptions/expiry negative;
  `expiringSoon` counts earn entries whose remaining life ≤ 30 days.
- `redeemReward(option, account)` — **guards** by balance and `minTier`; returns
  a ledger entry + new balance (pure, no mutation).
- `buildLoyaltyAccount(customerId, ledger)` — tier, next tier, balance, lifetime
  earned/spent/expired, expiring-soon, points-to-next-tier, tier progress 0–100,
  perks and the tier-eligible redemption catalog.

## Redemption catalog

₹50 coupon (500 pts) · free delivery (300 pts) · ₹150 coupon (1,200 pts, Silver+)
· ₹250 cashback (2,000 pts, Gold+) · mystery gift (5,000 pts, Platinum).

## Exit criteria — met

Customers have concrete reasons to return: a visible tier, a points balance,
clear next-tier progress, and a redemption catalog gated by balance and tier.
