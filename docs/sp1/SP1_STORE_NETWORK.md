# SP1_STORE_NETWORK

**Phases 3–5 — Seller Universe, Store Universe & Classification**

Measured by `npm run sp1:certify` → `docs/sp1/generated/seller-certification.json`.

## Population

| Metric | Value | Target |
|---|---|---|
| Sellers | **1,147** | 1,000+ |
| Stores | **7,320** | 5,000+ |
| Avg stores per seller | ~6.4 | — |
| Store types covered | 18 / 18 | all |
| Stores classified | 7,320 / 7,320 (100%) | no unclassified |
| Integrity | 0 errors, 0 warnings | 0 |

## Methodology (Phases 3–4)

Real Indian chains (Reliance Fresh, DMart, More, Spencer's, Nilgiris, Heritage Fresh, Apollo
Pharmacy, MedPlus, Wellness Forever, A2B, Grand Sweets, Sri Krishna Sweets, Croma, Reliance Digital,
Sangeetha Mobiles, Poorvika, Saravana Stores, Ratna Stores, Pothys, GRT, Lulu, …) are expanded
deterministically into:

- a **national parent seller** per chain (traceable root),
- one **regional operating seller** per region the chain serves, per **store format** (real
  multi-format operations, e.g. Express / 24x7 / Mini / Daily), and
- **city store outlets** for each regional seller across real South-Indian cities.

Every seller traces to a real chain (`parentChainId`); every store maps to a real city. This mirrors
real multi-region / multi-format / multi-outlet retail structure.

## Store classification (Phase 5)

All 18 store types are populated: Grocery, Supermarket, Hypermarket, Pharmacy, Bakery, Fresh Produce,
Meat, Fish, Pet Supplies, Electronics, Fashion, Household, Stationery, Pooja, Health, Baby Care,
Sweets, Specialty. Each store type maps to PP-1 departments for search/analytics readiness. No store
is unclassified.
