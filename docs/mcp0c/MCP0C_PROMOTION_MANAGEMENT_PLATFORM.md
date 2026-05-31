# MCP-0C.7 — Promotion Management Platform

Engine: `lib/seller-os/promotions.ts` · UI: Promotions tab · Schema:
`supabase/migrations/...mcp0c_seller_promotions.sql` (`seller_promotions`,
`seller_promotion_redemptions` + RLS). Closes the Reality Audit's "no coupons" gap.

## Capabilities
- **Coupons / discounts (percent, flat) / bundles / campaigns** (`promotion_type`).
- **Scheduled promotions**: `starts_at` / `ends_at` + `promotion_state`
  (draft/scheduled/active/paused/expired).
- **Validation** (`validatePromotion`): code format, percent range, positive value.
- **Apply** (`applyPromotion`): honours minimum order; computes discount + total.
- **Promotional / conversion analytics** (`projectConversion`): deterministic
  uplift projection (deeper discount → higher conversion, capped) with projected
  orders; redemptions tracked in `seller_promotion_redemptions`.

## RLS
Active promotions are publicly readable (checkout can apply); vendor members
manage only their own promotions.

Verified by tests: validate (valid/invalid), apply (incl. min-order gating),
conversion projection uplift.
