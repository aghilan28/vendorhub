# MCP-0F.2 — Cart Platform

**Engine:** `lib/commerce-transaction/cart.ts` · **Surface:** `CartCheckoutPanel`
on `/cart`.

## Capabilities (all mandated)
- **Add / remove / update quantity** — `addItem` (merges same product+sku),
  `removeItem`, `updateQuantity` (clamped to availability). Pure; never mutate input.
- **Save for later / wishlist / move between lists** — `saveForLater`,
  `moveToCart`, `toggleWishlist`, `setListStatus` over `CartListStatus`
  (`active | saved | wishlist`).
- **Multi-seller cart** — `validateCart` groups active lines by seller
  (`CartSellerGroup`) with per-seller subtotals.
- **Cart / inventory / price / promotion validation** — `CartIssue[]`:
  `out_of_stock`, `insufficient_stock`, `low_stock`, `price_above_mrp`,
  `quantity_invalid`, `coupon_invalid`. `ok` is true only when no
  critical/warning issues and item count > 0.

## Totals
`CartTotals` = subtotal, savings (MRP − price), itemCount, sellerCount.

Tested in `mcp0f-commerce-transaction.test.ts` (add/merge, clamp, list moves,
grouping, low/insufficient/out-of-stock).
