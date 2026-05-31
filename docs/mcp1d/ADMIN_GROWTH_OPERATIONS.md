# MCP-1D — Admin Growth Operations (Phase 10)

Admin surface at **`/admin/growth`** (admin-gated) —
`app/(admin)/admin/growth/page.tsx` +
`features/customer-growth/components/admin-growth-operations.tsx`, plus
**`GET /api/growth`** (`app/api/growth/route.ts`).

## What the admin sees

Headline stats (customers, active, at-risk, retention rate, 30-day demand
forecast) plus seven dashboards:

1. **Customers** — segment table (customers, share, revenue, avg value, churn).
2. **Retention** — ranked churn assessments with drivers + retention actions.
3. **Loyalty** — tier distribution across the base.
4. **Referrals** — total / rewarded / flagged / conversion.
5. **Campaigns** — table with CTR, ROAS, schedule, revenue and validity flags.
6. **Engagement** — delivery/open/click rates + per-channel breakdown.
7. **Intelligence** — ranked growth recommendations + demand forecast.

## Data + API

`getAdminGrowthSnapshot()` aggregates real per-customer order activity into
segments, retention, loyalty tiers and intelligence (degrade-safe to the labelled
sample). `GET /api/growth` returns the same admin-gated snapshot envelope
(`okJson`/`errorJson`).

## Exit criteria — met

Marketplace demand is manageable: an admin can see and act on customers,
retention, loyalty, referrals, campaigns, engagement and growth intelligence.
