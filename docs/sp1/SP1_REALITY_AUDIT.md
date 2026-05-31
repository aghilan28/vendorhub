# SP1_REALITY_AUDIT

**Program:** VendorHub Marketplace Population — Wave 2 (SP-1): Seller Universe & Store Network
**Method:** Source-code audit only. Reports not trusted; migrations, `lib/`, `features/`, `types/` inspected.
**Audited ref:** branch `sp1-seller-universe` (cut from `pp5-media-population`, carrying Wave 1: PP-1..PP-5).

---

## 0. Headline

A seller/vendor *schema* exists (`vendors`, `vendor_members`, `vendor_settings`, `vendor_verification`,
plus `seller_kyc_profiles`, `seller_payout_*`, `seller_intelligence_*`, `seller_inventory`, …) and the
seller dashboard UI exists (`app/(seller)`, `features/seller`). But:

- the `vendors` table **conflates seller and store** (no canonical Store entity separate from the seller),
- there is **no `lib/sellers/` engine** (seller/store/governance/validation/classification/analytics), and
- **sellers = 0, stores = 0** (nothing populated).

SP-1 builds the canonical seller + store universe additively (new `seller_universe` / `store_universe`
registries) — it does **not** modify Wave-1 foundations, the existing `vendors`/`seller_*` tables, and
starts **no inventory, product-mapping, delivery or hyperlocal ranking**.

---

## 1. Subsystem classification (REAL / PARTIAL / MISSING)

| # | Subsystem | Status | Evidence |
|---|---|---|---|
| 1 | Seller tables | **PARTIAL** | `vendors` + `seller_kyc_profiles`/`seller_payout_*`/`seller_intelligence_*` exist (schema, unpopulated) |
| 2 | Vendor tables | **REAL** | `vendors`, `vendor_members`, `vendor_settings`, `vendor_verification` |
| 3 | Merchant tables | **MISSING** | no `merchant` table (vendors serve this role) |
| 4 | Store tables | **MISSING** | no canonical Store entity distinct from the seller/vendor |
| 5 | Onboarding systems | **PARTIAL** | `app/(seller)/seller/onboarding`, `seller-registration` UI; no population/registry |
| 6 | Verification systems | **PARTIAL** | `vendor_verification`, `seller_kyc_profiles` (schema only) |
| 7 | Seller dashboards | **REAL** | `features/seller/*`, `app/(seller)/seller/*` |
| 8 | Hyperlocal dependencies | **REAL (out of scope)** | `lib/hyperlocal-*`; SP-1 must not start hyperlocal ranking |
| 9 | Inventory dependencies | **REAL (out of scope)** | `seller_inventory`, `inventory`; SP-1 must not start inventory |
| 10 | Fulfillment dependencies | **REAL (out of scope)** | `lib/logistics`; SP-1 must not start delivery |
| — | `lib/sellers/` engine | **MISSING** | directory does not exist (the deliverable) |

**Summary:** schema PARTIAL/REAL but conflated and unpopulated; the seller/store universe engine is MISSING.

---

## 2. Constraints captured

- Do not modify Wave-1 foundations or existing `vendors`/`seller_*` tables. Reuse `slugify`,
  `createDeterministicClock` (PP-1) and `CommerceRegion` (`@/types/commerce-foundation`).
- Separate **Seller** (business/chain) from **Store** (outlet): a seller owns many stores.
- Additive, idempotent migration (per `ops-migration-audit`); new `seller_universe`/`store_universe`/
  classification/governance/audit registries; RLS; reuse `set_updated_at`/`current_user_has_role`.
- Deterministic (slug/hash IDs, injectable clock; no `Date.now()`/`Math.random()`).
- No inventory, product mapping, delivery, or hyperlocal ranking.

## 3. Population strategy (Phases 3–4)

Real, traceable sellers are sourced from known Indian chains (Reliance Retail, Nilgiris, Apollo
Pharmacy, MedPlus, Heritage, A2B, Saravana Stores, Ratna Stores, Croma, Poorvika, …). Each chain
operates across real South-Indian regions; the population engine deterministically expands each chain
into its **regional operating sellers** and each seller into its **city store outlets**, reaching
1,000+ sellers and 5,000+ stores — every seller traceable to a real chain (`parentChain`) and every
store to a real city. This mirrors real multi-region/multi-outlet retail structure (documented like
PP-4's edition methodology).

## 4. Decision

Build `lib/sellers/` (seller engine, store engine, governance, validation, classification, analytics)
+ canonical real-chain dataset + deterministic seller/store population (1,000+ sellers, 5,000+ stores)
+ additive migration + deterministic tests + scale certification + docs.
