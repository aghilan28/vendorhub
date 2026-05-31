# PLACEHOLDER & FAKE-DATA AUDIT (Section 13)

Evidence-based inventory of placeholders, stubs, mock/empty data and demo
implementations.

## A. Explicit placeholder routes (3)
- `app/(admin)/admin/platform-health-placeholder/page.tsx`
- `app/(seller)/seller/payouts-placeholder/page.tsx`
- `app/(seller)/seller/support-placeholder/page.tsx`

## B. Empty/gutted "data" modules (used as fallbacks)
- `features/marketplace/lib/data.ts` → `marketplaceProducts/Vendors/Categories/featuredDeals/buyerOrders = []` with text "pending real catalog ingestion".
- `features/products/mock-data.ts` → `productShellData: Product[] = []`.

## C. Hardcoded stub data still rendered in UI
- `features/seller/data.ts` → `sellerProfile` ("Seller workspace / Not onboarded / Awaiting onboarding"), `notifications`, `trustSignals` — rendered by `SellerDashboardScreen` alongside real snapshot data.
- `features/trust/data.ts` → `sellerKycProfiles` rendered in seller dashboard.
- `features/admin/data.ts`, `features/dashboard/shell-data.ts`, `features/transactions/data.ts`, `features/logistics/data.ts` — static modules imported by dashboards.

## D. Placeholder content inside real pages
- Product page reviews: `getProductReviewSnippets` returns a single fixed line
  ("Reviews will appear after verified real orders") — **fake reviews**.
- Product page gallery: one `imageUrl` repeated 4× — **fake gallery**.

## E. Demo/seed-backed subsystems (not live data)
- `lib/execution/seed.ts` → `/admin/execution`, `/api/execution`.
- `lib/platform/*` → `/platform`, `/platform/docs`, `/showcase`.
- `lib/tier10/14/15`, executive-intelligence, autonomous-operations → deterministic
  compute behind `/api/tier*` (not wired to live commerce).

## F. Stub APIs / unused infra
- Supabase storage buckets configured but never written to.
- Business-value metrics in `lib/platform/value.ts` are hardcoded illustrative figures.

## Verdict
The repository is **not full of fake dashboards**, but it has three distinct
placeholder classes: (1) explicit stub routes, (2) **empty fallbacks** that make
real pages look blank without env, and (3) **demo-grade intelligence/execution
surfaces** presented as finished. The most misleading items are the **fake
reviews/gallery** on the product page and the **seed-backed Execution/Showcase**
layers.
