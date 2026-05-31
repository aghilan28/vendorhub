# SELLER EXPERIENCE AUDIT (Section 4)

Benchmarks: Amazon Seller Central, Flipkart Seller Hub.

| Surface | State | Grade | Evidence / gap |
|---------|-------|-------|----------------|
| Dashboard | Hybrid | 🟡 | `useSellerDashboard` → real `/api/seller/snapshot`, **but** screen also renders static stubs: `sellerProfile`, `notifications`, `trustSignals` from `features/seller/data.ts` ("Awaiting onboarding") + `sellerKycProfiles` from `features/trust/data` |
| Catalog | Real CRUD | 🟡 | `createProductAction`/`updateProductAction` (`lib/actions/products.ts`) insert to DB + enqueue embedding refresh |
| Products | Real | 🟡 | CRUD works; list via DB |
| Variants | Schema only | 🟡 | `product_variants` table + selected in queries; **no variant management UI verified** |
| Inventory | Real | ✅ | `inventory-screen.tsx` → PATCH `/api/seller/inventory` |
| Pricing | Field-level | 🟡 | `base_price` editable; no rule-based/dynamic pricing UI |
| Coupons / Promotions | **Missing** | ❌ | No coupon/promotion tables or UI found |
| Orders | Real | ✅ | `orders-screen.tsx` → PATCH `/api/seller/orders/:id/status` |
| Returns / Refunds | Backend only | 🟡 | Refund RPCs exist; seller-side return mgmt UI not found |
| Reviews | **Missing for seller** | ❌ | No seller review-response surface |
| Analytics | Largely static | 🟡 | `seller/analytics` derived/sparse; merchant-intelligence panel present |
| Payouts | **Placeholder** | 🚧 | `/seller/payouts-placeholder` explicit stub |
| Store management | Thin | 🟡 | `store-settings` shell |
| Shipping / Fulfillment | Backend partial | 🟡 | `lib/logistics`, dispatch; Shiprocket env present, integration partial |
| **Image upload** | **Missing** | ❌ | No `type="file"`, no `storage.upload`; `createProductAction` accepts image **metadata rows only** |

## Brutal summary
- **Strengths:** real product/inventory/order mutations with security guards and
  async embedding refresh — a legitimate operational core.
- **Weaknesses:** **no image upload** (a seller cannot add a product photo through
  the app), **no coupons/promotions**, payouts placeholder, dashboard mixes real
  snapshot with hardcoded "awaiting onboarding" stubs that read as fake.
- **Blocking reality:** a seller cannot complete a real listing (no images) and
  cannot get paid through the UI (payouts stub).

**Seller Experience score: 4/10.**
