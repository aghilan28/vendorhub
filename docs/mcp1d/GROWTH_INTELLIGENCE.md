# MCP-1D — Growth Intelligence (Phase 11)

`lib/customer-growth/intelligence.ts` — the engine that makes growth
intelligence-driven. Operates on customers / orders / campaigns / referrals /
hyperlocal demand and emits ranked, de-duplicated recommendations.

## Churn (`assessChurn`)

0–100 churn risk from recency (dominant), low frequency, returns and no-recent-
sessions, offset by value score. Bands: `low (<33) / medium (33–65) / high (≥66)`
with a concrete **retention action** per band and a list of **drivers**.

## Segments (`buildSegmentInsights`)

Per-segment customers, revenue, average value score, average churn risk and
share of the base.

## Recommendations (`buildGrowthIntelligence`)

| Kind | Trigger |
|------|---------|
| `churn_risk` | high-risk individuals |
| `retention_risk` | medium-risk individuals |
| `growth_opportunity` | promising segment |
| `campaign_opportunity` | at-risk segment win-back |
| `referral_opportunity` | referral conversion < 30% |
| `segment_insight` | VIP revenue concentration |
| `hyperlocal_demand` | demand with no serviceable store |
| `demand_forecast` | 30-day projected orders |

Recommendations are scored by severity and sorted descending; the snapshot tone
escalates with the share of high-churn customers.

## Demand forecast

Per-segment expected reorders (vip 3, loyal 2, promising/new/bargain 1, at_risk
0.3, dormant 0.1) summed to a 30-day projection.

## Exit criteria — met

Growth is intelligence-driven: retention/churn risks, growth/campaign/referral
opportunities, demand forecasts and segment + hyperlocal demand intelligence,
all from real activity shapes.
