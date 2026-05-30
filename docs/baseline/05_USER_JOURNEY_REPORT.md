# Deliverable 5 — User Journey Report

**Section 4 of the directive.** Journeys documented against the **certified tree**. For each role: entry point, navigation path, actions, outputs, value produced. Journeys that depend on unmerged Phase K/G surfaces are flagged **[NOT REALIZED on certified]**.

## 5.1 Buyer

- **Entry point:** `/` (marketplace home) or `/sign-in`.
- **Navigation path:** `/` → `/categories` or `/search` → `/products/[id]` → `/cart` → `/checkout` → `/orders/[id]` → `/tracking/[id]`.
- **Actions:** browse/filter, semantic search, view product detail, add to cart/wishlist, checkout via Razorpay, track delivery, manage profile.
- **Outputs:** placed order, payment confirmation, invoice (`/api/invoices/[orderId]`), live tracking status.
- **Value produced:** complete hyperlocal purchase loop with delivery tracking. **REALIZED (~100%).**

## 5.2 Seller

- **Entry point:** `/seller-registration` → `/seller/onboarding` → `/seller/dashboard`.
- **Navigation path:** dashboard → `/seller/products` (+ `/new`, `/[id]`) → `/seller/inventory` → `/seller/orders/[id]` → `/seller/analytics` → `/seller/payouts`.
- **Actions:** register store, list/edit products, manage stock, fulfil orders + status transitions, view analytics snapshot, configure store, view payouts.
- **Outputs:** live listings, inventory updates, order status changes, seller intelligence snapshot (`/api/seller/intelligence`), payout view.
- **Value produced:** full merchant operations loop. **REALIZED (~95%).**

## 5.3 Operator / Administrator

- **Entry point:** `/admin` → `/admin/dashboard`.
- **Navigation path:** dashboard → `/admin/moderation` (products/reviews) → `/admin/vendors/[id]` → `/admin/orders` → `/admin/refunds` → `/admin/analytics` → `/admin/audit-logs` → `/admin/flags` → `/admin/settings`.
- **Actions:** moderate listings/reviews, approve/suspend vendors, oversee orders, process refunds, view platform analytics, inspect audit logs, toggle feature flags.
- **Outputs:** moderation decisions, vendor state changes, refunds (`/api/payments/refunds`), governance detections (`/api/governance/detection`).
- **Value produced:** marketplace governance and trust operations. **REALIZED (~85%, operator-grade).**

## 5.4 Researcher

- **Entry point:** none in UI. Research lives in `docs/tier10–15`, `docs/kmos`, `docs/knowledge`.
- **Navigation path:** N/A (no page consumes research artifacts).
- **Actions:** read RFCs/specs/compendia in the repo; query introspection APIs (`/api/tier14`, `/api/tier15`) directly.
- **Outputs:** documents; JSON introspection payloads.
- **Value produced:** **NOT REALIZED as product** — research is documentation + backend introspection only; there is no Research Center page.

## 5.5 Analyst

- **Entry point (certified):** `/admin/analytics`, `/seller/analytics`.
- **Certified path:** admin/seller analytics pages backed by snapshot APIs + telemetry.
- **[NOT REALIZED on certified]:** Commerce Intelligence Center, Pricing/Forecast Studio, Telemetry dashboard — these analyst surfaces exist only on `phase-k`.
- **Value produced:** basic analytics realized; **deep commerce-intelligence analyst journey is unmerged.**

## 5.6 Knowledge Operator

- **Entry point:** none. Backed by `lib/tier15` (knowledge lifecycle), `/api/tier15`, `docs/knowledge`, `tier8` migration.
- **Actions:** API-level only.
- **Value produced:** **NOT REALIZED** — no Knowledge OS / Meta-Knowledge Center page exists on any branch.

## 5.7 Governance Operator

- **Entry point (certified):** `/admin/moderation`, `/admin/audit-logs` + `/api/governance/detection`, `/api/tier10/governance`.
- **Actions:** moderation + audit (realized); civilizational-governance simulation is API-only (`/api/tier10/*`) with no Governance Center page.
- **Value produced:** **PARTIALLY REALIZED** — marketplace governance realized; advanced governance/simulation is backend-only.

## 5.8 Journey realization summary

| Role | Realized on certified? | Limiting factor |
|---|:--:|---|
| Buyer | ✅ Full | — |
| Seller | ✅ Full | — |
| Operator/Admin | ✅ Full (operator-grade) | — |
| Analyst | ⚠️ Partial | intelligence studios unmerged (Phase K) |
| Governance Operator | ⚠️ Partial | advanced governance API-only |
| Researcher | ❌ Not realized | no research UI anywhere |
| Knowledge Operator | ❌ Not realized | no knowledge UI anywhere |
