# MCP-1D — Customer Growth Reality Audit

> Evidence-only. Every classification cites a real file path verified in the
> repository at the MCP-1C HEAD (`41d2a1f`). Previous-phase prose was **not**
> trusted; this audit is the source of truth for MCP-1D scope.

## Method

Audited by reading source under `app/`, `lib/`, `features/`, `supabase/migrations/`
and `lib/constants/`. Each subsystem is graded:

- **Real** — exists, wired, usable.
- **Partial** — primitives exist but no customer-growth surface/loop.
- **Broken** — present but not functioning for this purpose.
- **Missing** — no implementation.

## Findings

| # | Subsystem | State | Evidence |
|---|-----------|-------|----------|
| 1 | Authentication | **Real** | `middleware.ts` (Supabase SSR + `user_roles` RBAC), `lib/api/auth.ts` (`requireUser`/`requireRole`). |
| 2 | Customer profiles | **Partial** | `app/(buyer)/profile/` route exists; no preference/interest/segment/lifecycle/value model. |
| 3 | Wishlist | **Real** | `app/(buyer)/wishlist/` route + `components/commerce`. Saved products exist. |
| 4 | Cart | **Real** | `app/(buyer)/cart/`, `lib/commerce-transaction/` cart module (MCP-0F). |
| 5 | Coupons | **Partial** | `lib/commerce-transaction` coupon logic + `supabase/migrations/20260531020000_mcp0c_seller_promotions.sql`. Seller-scoped; no marketplace campaign layer. |
| 6 | Rewards / loyalty | **Missing** | No `lib/loyalty`, no points ledger, no tier system anywhere. |
| 7 | Referrals | **Missing** | No referral codes/links/attribution/leaderboards in source. |
| 8 | Notifications | **Partial** | `lib/push/sender.ts` (web-push). No customer-growth alert/engagement orchestration, no in-app feed for growth. |
| 9 | Campaigns | **Missing** | Only the word "campaign" in intelligence *recommendations* text (`lib/executive-intelligence`, `lib/hyperlocal-operations`). No campaign builder/scheduler/governance. |
| 10 | Recommendations | **Partial** | `lib/marketplace-intelligence/recommendations.ts` + `buyer.ts` (seller/admin oriented); `components/commerce/intelligent-product-grid.tsx`. No customer reward/referral/continue-shopping recommendation surface. |
| 11 | Personalization | **Missing** | No interest/affinity model (store/category/brand/location) for customers. |
| 12 | Customer analytics | **Partial** | `lib/marketplace-intelligence` computes marketplace/seller analytics; no per-customer value/segment/lifecycle analytics. |
| 13 | Growth intelligence | **Missing** | No retention/churn/referral/campaign opportunity engine over customers. |
| 14 | Email systems | **Missing** | No transactional/marketing email engine. |
| 15 | Engagement systems | **Missing** | No price-drop/restock/store alert orchestration for customers. |

## Reusable assets (no rebuild)

- **Auth + RBAC** (`middleware.ts`, `lib/api/auth.ts`) — reuse for `/rewards`
  (protected) and `/admin/growth` (admin-gated).
- **Degrade-safe query pattern** (`lib/hyperlocal/queries.ts`) — copy the
  `{configured, sampled, snapshot}` contract exactly.
- **Coupons / promotions** (`lib/commerce-transaction`, `seller_promotions`
  migration) — campaigns reference coupons rather than re-implementing them.
- **Recommendations** (`lib/marketplace-intelligence/recommendations.ts`,
  `buyer.ts`) — personalization/recommendation modules build on these shapes.
- **Push** (`lib/push/sender.ts`) — engagement deliveries plan over it.

## Gap → MCP-1D scope

The marketplace can **list sellers (1A), populate products (1B) and deliver
locally (1C)** but has **no embedded demand engine**: nothing makes a customer
return, refer, or receive personalization, and growth is not measurable or
intelligence-driven.

MCP-1D therefore builds, on real shapes and the degrade-safe pattern:

1. **Customer Identity Platform** — profile completion, preferences, interests,
   saved entities, segments, lifecycle state, customer value score.
2. **Loyalty Engine** — points, 4 tiers (Bronze/Silver/Gold/Platinum), ledger,
   rules, redemption, expiration, analytics, progress.
3. **Referral Platform** — codes/links, tracking, rewards, fraud protection,
   attribution, leaderboards, governance.
4. **Campaign Management** — builder, coupon/discount/category/store/location/
   hyperlocal/seasonal campaigns, scheduling, analytics, governance.
5. **Engagement Platform** — push/email/in-app, price-drop/restock/store/order
   alerts, activity feed, engagement intelligence.
6. **Personalization Engine** — interests + affinities (store/category/brand/
   location) → personalized home/search/recommendations/offers.
7. **Recommendation System** — recommended/trending/nearby/similar, cross/up-sell,
   recently viewed, continue shopping, analytics.
8. **Customer Growth Center** (`/rewards`) and **Admin Growth Operations**
   (`/admin/growth`).
9. **Growth Intelligence** — retention/churn risks, growth/campaign/referral
   opportunities, demand forecasts, segment + hyperlocal demand intelligence.

### Honest scope

No live customer-event DB in the sandbox: live reads execute only against a
configured Supabase and degrade to a clearly-labelled sample (`sampled: true`) —
never demo data inside a "live" result. Email/push *delivery* is planned
deterministically over the existing `lib/push` rail; the engine computes points,
tiers, attribution, segments, churn and recommendations deterministically so it
runs identically on live and sample data.
