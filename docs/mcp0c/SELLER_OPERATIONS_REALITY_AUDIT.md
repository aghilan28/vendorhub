# MCP-0C.1 — Seller Operations Reality Audit (Baseline)

Source-of-truth audit before this phase (re-verified against the repo).

| Capability | Before MCP-0C | Evidence |
|------------|---------------|----------|
| Seller dashboard | ✅ real (hybrid) | `getSellerOperationalSnapshot` reads real products/inventory/orders + builds **real merchant intelligence** (`buildMerchantIntelligence`) and persists to `seller_intelligence_snapshots`/`_alerts` |
| Product management | ✅ | `createProductAction`/`updateProductAction`; MCP-0B bulk |
| Inventory management | ✅ partial | `/api/seller/inventory` PATCH; no forecast/reorder/turnover surface |
| Order management | ✅ partial | `/api/seller/orders/:id/status` PATCH; no unified ops queue / next-action engine |
| Pricing management | 🟡 field-level | `base_price` editable; no margin/optimization/scheduled |
| Promotions | ❌ missing | no coupons/discounts/campaigns tables or UI |
| Customers | ❌ missing | no segmentation / CRM |
| Analytics | 🟡 partial | dashboard charts; not a cohesive analytics surface |
| Store management | 🟡 thin | `store-settings` shell |
| Workflows | ❌ missing | no seller workflow engine |
| Intelligence | ✅ real but under-surfaced | merchant-intelligence runs on real data but isn't presented as an operating cockpit |

## Verdict (before)
The backend was **more real than expected** (real snapshot + real intelligence),
but it presented as a **catalog manager**, not a **business operating system**:
no unified cockpit, no promotions/CRM/workflow layers, pricing/inventory
intelligence under-surfaced.

## What MCP-0C delivers
A unified **Seller Operating System** (`/seller/operations`) with eight centers
(Store, Inventory, Pricing, Orders, Promotions, Customers, Analytics,
Intelligence), a deterministic engine (`lib/seller-os/`) that operates on the
**real** seller snapshot and folds in the existing merchant-intelligence health,
a workflow engine, and a promotions schema. See the remaining MCP-0C documents.
