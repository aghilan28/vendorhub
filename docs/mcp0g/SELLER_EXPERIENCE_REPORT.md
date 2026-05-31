# MCP-0G.3 — Seller Experience Report

A seller can operate an entire business from VendorHub.

| Capability | Route | Realised by |
|---|---|---|
| Dashboard | `/seller/dashboard` | merchant intelligence |
| Operations cockpit | `/seller/operations` | 0C Seller OS (8 tabs) |
| Fulfillment | `/seller/fulfillment` | 0F Fulfillment Command Center |
| Intelligence | `/seller/intelligence` | 0E seller briefing |
| Reputation/Trust | `/seller/reputation` | 0D trust score + badges |
| Products | `/seller/products`, `/new`, `/[id]` | catalog |
| Catalog ops | `/seller/catalog` | 0B bulk create/edit |
| Media | `/seller/media` | 0A media center |
| Inventory | `/seller/inventory` | 0C inventory engine |
| Orders | `/seller/orders`, `/[id]` | order actions |
| Analytics | `/seller/analytics` | merchant analytics |
| Promotions | `/seller/operations` (tab) | 0C promotions |
| Payouts | `/seller/payouts` | commerce-finance settlement ledger |
| Store settings | `/seller/store-settings` | store profile |
| Notifications | `/seller/notifications` | alerts |
| Support | `/seller/support` | **0G Help & Support center (new)** |

## Coherence improvements (0G)
- **`/seller/payouts`** — promoted from a `-placeholder` URL to the canonical
  route (the real settlement ledger was always there).
- **`/seller/support`** — replaced the dead "support not started" stub with a
  real Help & Support center: help topics deep-linking to the resolving
  workspace (fulfillment, payouts, inventory, products, store, reputation), FAQs
  and contact channels.
- Consistent seller loading skeleton (`(seller)/loading.tsx`).

## Verdict
Seller experience **feels complete**: list → sell → fulfil → get paid → get
support, all inside VendorHub. Score **9/10**.
