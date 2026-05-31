# MCP-0C.3 — Store Management Center

Engine: `lib/seller-os/store.ts` · UI: Store tab in `/seller/operations`.
Benchmarks: Amazon Storefront, Shopify Store Settings.

## Delivered
- **Store health score** (0-100) + tone from verification, published products,
  catalog media coverage and order activity.
- **Profile completion %** and **verification** status.
- **Signals**: verified, published products, catalog media, order activity — each
  with an ok/action flag.

## Mapped to existing schema
Store profile/branding/media/hours/radius/categories/policies/visibility/status
are backed by `vendors` (name, logo_url, banner_url, service_radius_km, status,
metadata) + MCP-0A store-assets bucket. The Store Management Center surfaces
health/performance over these; editing reuses store-settings + media center.

Verified by tests: ACTIVE store → verified; score + signals computed.
