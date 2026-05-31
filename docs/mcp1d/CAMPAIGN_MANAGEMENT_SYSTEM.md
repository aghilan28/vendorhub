# MCP-1D — Campaign Management System (Phase 5)

`lib/customer-growth/campaigns.ts` — builder validation, scheduling, analytics
and governance for 7 campaign types. References the existing coupon/promotion
layer (`lib/commerce-transaction`, `seller_promotions`) rather than
re-implementing discounts.

## Campaign types

`coupon · discount · category · store · location · hyperlocal · seasonal`, with
statuses `draft · scheduled · active · paused · completed · archived` and an
audience of customer segments (or `all`).

## Validation (`validateCampaign`)

- Required: name, duration ≥ 1 day, ≥ 1 audience segment.
- Discount bounds 1–90% (warns > 60%).
- Type-specific targets: location/hyperlocal need pincodes, category needs
  categories, store needs stores.
- Non-negative budget.

## Analytics (`buildCampaignReport`)

- **CTR** = clicks / impressions, **conversion** = redemptions / clicks,
  **ROAS** = revenue / spend.
- A schedule label (`Starts in Nd`, `Active · Nd remaining`, `Ended Nd ago`).
- A tone (`healthy / watch / degraded / critical`) from status + ROAS + CTR.

## Portfolio (`buildCampaignPortfolio`)

Aggregates active/scheduled counts, total revenue/spend, **blended ROAS** and an
**invalid** count (governance: invalid campaigns are surfaced, never launched
silently).

## Exit criteria — met

Marketplace growth campaigns can be built, validated, scheduled, launched and
measured — including coupon, category, store, location, hyperlocal and seasonal.
