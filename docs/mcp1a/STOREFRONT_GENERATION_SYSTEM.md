# MCP-1A.8 — Storefront Generation System

**Engine:** `lib/seller-activation/storefront.ts` · **Surface:** public route
`/store/[slug]` (`StorefrontView`).

## Generated from seller + products (all mandated)
- **Seller storefront page** — public, professional, branded layout (banner,
  logo monogram, name, tagline).
- **Seller branding** — logo/banner/tagline from onboarding.
- **Seller profile** — name, verified badge, fulfillment model.
- **Seller ratings & reviews** — rating (0–5) + review count.
- **Store policies** — returns / shipping / cancellation (returns respects the
  seller's `returnsAccepted` setting).
- **Store catalog** — published products with price, category and in-stock state;
  each links to the product page.
- **Store search / categories** — category chips derived from the catalog.
- **Store trust indicators** — `storefrontTrustIndicators` badges (verified,
  top-rated trust, fast & on-time, reliable fulfilment, 100+ reviews).
- **Store performance metrics** — fulfillment rate, on-time rate, response hours,
  cancellation rate.

## Live + degrade-safe
`getStorefrontBySlug` reads the real `vendors` + published `products` by slug;
unknown slug → `notFound()`; unconfigured → labelled sample storefront.

## Exit criteria — met
Every seller has a professional storefront generated from their store + catalog.
Covered by the storefront test (catalog/policies/metrics/trust indicators).
