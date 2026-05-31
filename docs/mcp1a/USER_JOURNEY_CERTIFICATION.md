# MCP-1A.11 — User Journey Certification

All five mandated journeys function (live when Supabase is configured; labelled
sample otherwise).

## Journey A — New Seller: Register → Verify → Create Store → Upload Products → Activate
`/seller/onboarding` (12-step wizard, draft-saved, validated) → submission gate →
`buildVerificationCase` (KYC) → store created from the application → `/seller/import`
(bulk product population over MCP-0B) → `/seller/activation` shows the path to
`active`. ✅

## Journey B — Existing Seller: Import Catalog → Publish → Receive Intelligence
`/seller/import` (CSV → validate → publishable + governance) → publish gated rows
→ `sellerRecommendations` surfaced in `/seller/activation` and `/seller/intelligence`. ✅

## Journey C — Admin: Review Seller → Approve → Monitor
`/admin/sellers` (six governance queues: review/approval/verification/catalog/
risk/escalation) → approve via the application state machine → `/admin/population`
monitors funnel/KPIs/capacity. ✅

## Journey D — Store Visitor: Visit Storefront → Browse Products → Trust Seller
`/store/[slug]` (public) → branded storefront, catalog, policies, ratings and
trust indicators → product links to `/product/[slug]`. ✅

## Journey E — Marketplace Operations: Track Growth → Activation → Population
`/admin/population` — recruitment→activation funnel, activation rate, capacity
progress toward 100-seller / 10k-product targets, category expansion. ✅

## Validation
Backed by 393 passing unit/integration tests (incl. 21 new MCP-1A), the
navigation-coherence test (every new route resolves, no dead/placeholder routes),
and a successful production build emitting every journey route
(`/seller/onboarding`, `/seller/activation`, `/seller/import`, `/admin/sellers`,
`/admin/population`, `/store/[slug]`).
