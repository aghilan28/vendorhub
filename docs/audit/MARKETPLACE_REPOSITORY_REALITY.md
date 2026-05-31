# MARKETPLACE REPOSITORY REALITY (Section 1)

**Method:** source-code inspection only. Prior reports, certifications and
comments were ignored. Every claim below is backed by a file path or a grep
count produced during this audit.

---

## 1. Scale of the repository

| Dir | Files | Reality |
|-----|------:|---------|
| `app/` | 109 | App Router; ~57 page routes + ~38 API routes |
| `features/` | 158 | Feature modules (commerce, seller, admin, intelligence, execution, platform…) |
| `lib/` | 203 | Engines, data layer (`lib/api/queries`), AI, payments, security, async, supabase |
| `components/` | 70 | Shared UI + design system |
| `store/` | 15 | Zustand client stores |
| `hooks/` | 2 | Minimal |
| `supabase/` | 56 | **53 SQL migrations** + config + seed |
| `scripts/` | 21 | Ops/load scripts |
| `tests/` | 46 | 38 vitest files + 5 Playwright e2e |
| `docs/` | 83 | Heavy documentation (explicitly NOT trusted for this audit) |
| `types/` | 8 | Generated DB types + domain types |

## 2. The single most important finding

**The marketplace backend is substantially REAL, but the entire data layer is
gated behind environment variables and falls back to EMPTY data when they are
absent.**

Evidence:
- **173** real Supabase DB-access call sites (`.from("…")` / `.rpc("…")`) across
  `lib/api/queries`, `lib/actions`, `lib/ai`, `lib/payments`, `lib/async`,
  `lib/transactions`, `features/governance`, `features/marketplace`.
- The product/cart/search/related-products paths each begin with
  `if (!env.supabaseUrl || !env.supabaseAnonKey) return <empty fallback>`
  (`lib/api/queries/products.ts`, `cart.ts`, `lib/ai/commerce-intelligence.ts`).
- The legacy mock arrays those fallbacks point to are now **gutted to empty**:
  `features/marketplace/lib/data.ts` → `marketplaceProducts: Product[] = []`,
  `marketplaceVendors = []`, `featuredDeals = []`; `features/products/mock-data.ts`
  → `productShellData: Product[] = []`.

**Consequence:** with Supabase + OpenAI + Razorpay env and seeded data, this is a
real, sophisticated marketplace. Without env (e.g., a fresh deploy or this audit
sandbox), buyer/catalog/cart/search render **empty but not broken**.

## 3. What is genuinely real (code-verified)

- **Catalog read layer** — `lib/api/queries/products.ts`: `products` table with
  joins to `vendors`, `categories`, `product_images`, `inventory`, full-text
  `search_document` websearch, pagination.
- **AI commerce search** — `lib/ai/commerce-intelligence.ts`: pgvector hybrid
  retrieval RPC `search_products_hybrid`, OpenAI embeddings, adaptive ranking,
  personalization, multilingual/transliteration expansion, graceful local
  fallback. Related products via `related_products_by_vector` RPC.
- **Payments** — `lib/payments/orchestration.ts`: real Razorpay SDK
  (`getRazorpayClient().orders.create`, `.payments.refund`), signature
  verification, RPC reconciliation (`register_live_razorpay_order`,
  `record_payment_signature_verification`, `request_order_refund`).
- **Orders/cart** — `lib/api/queries/orders.ts`, `cart.ts`: real per-user DB reads.
- **Seller mutations** — `lib/actions/products.ts`: real inserts + enqueues an
  `ai.embedding.refresh` async job on product create.
- **Admin moderation** — `lib/actions/admin.ts` via guarded routes with audit.
- **Schema** — 53 migrations covering marketplace core, geo/hyperlocal, delivery,
  trust/KYC, atomic transactions, payments, financial layer, performance.

## 4. What is demonstration-grade (not wired to live data)

- **Execution OS** (`/admin/execution`, `lib/execution/seed.ts`) — zustand store
  seeded from a static dataset. Not DB-backed.
- **Platform & Showcase** (`/platform`, `/showcase`, `lib/platform/*`) — static
  deterministic model. Demonstration layer.
- **Tier engines** (`lib/tier10/14/15`, executive-intelligence, autonomous-ops) —
  deterministic compute exposed via `/api/tier*`; not integrated into live
  buyer/seller/admin commerce data.

## 5. Confirmed gaps

- **No image pipeline**: 0 occurrences of `storage.from(` / `.upload(` /
  `getPublicUrl`; 0 `type="file"` inputs. Product images are metadata rows
  (`storage_path` strings). `next.config.ts` allows only `images.unsplash.com`.
- **Seller dashboard is hybrid**: real `/api/seller/snapshot` + static stub
  panels (`features/seller/data.ts` profile/notifications/trust).

See the per-domain audits for detail and scores.
