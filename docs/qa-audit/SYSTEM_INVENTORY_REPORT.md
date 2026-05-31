# System Inventory Report

**Source:** Direct filesystem analysis of `/projects/sandbox/vendorhub`  
**Date:** 2026-05-31  

---

## Summary

| Category | Count |
|----------|-------|
| Pages (routes) | 57 |
| API Routes | 38 |
| lib/ Modules | 41 directories |
| features/ Modules | 17 directories |
| Components | 70 files in 12 dirs |
| Zustand Stores | 17 |
| Test Files | 38 (280 tests) |
| DB Migrations | 44 |
| DB Tables | 280+ |

---

## Pages by Role

### Buyer (18 pages)
`/home`, `/search`, `/categories`, `/categories/[slug]`, `/cart`, `/checkout`, `/orders`, `/orders/[id]`, `/product/[slug]`, `/products/[id]`, `/profile`, `/wishlist`, `/tracking`, `/tracking/[id]`, `/support`, `/disputes`, root page

### Seller (16 pages)
`/seller/dashboard`, `/seller/products`, `/seller/products/new`, `/seller/products/[id]`, `/seller/inventory`, `/seller/orders`, `/seller/orders/[id]`, `/seller/analytics`, `/seller/payouts`, `/seller/payouts-placeholder`, `/seller/store-settings`, `/seller/onboarding`, `/seller/notifications`, `/seller/support`, `/seller/support-placeholder`, root page

### Admin (17 pages)
`/admin/dashboard`, `/admin/vendors`, `/admin/vendors/[id]`, `/admin/moderation`, `/admin/moderation/products`, `/admin/moderation/reviews`, `/admin/orders`, `/admin/refunds`, `/admin/categories`, `/admin/analytics`, `/admin/notifications`, `/admin/flags`, `/admin/audit-logs`, `/admin/settings`, `/admin/platform-health-placeholder`, `/admin/operations`, root page

### Auth (5 pages)
`/sign-in`, `/sign-up`, `/auth/login`, `/auth/register`, `/seller-registration`

### Public (2 pages)
`/demo`, `/launch`

### System (1 page)
`/offline`

---

## API Routes (38)

### Commerce (12)
- POST `/api/payments/razorpay/order` — Create Razorpay order
- POST `/api/payments/razorpay/verify` — Verify payment signature
- POST `/api/payments/razorpay/webhook` — Webhook handler
- POST `/api/payments/reconciliation` — Payment reconciliation
- POST `/api/payments/refunds` — Process refund
- GET `/api/invoices/[orderId]` — Generate invoice
- PUT `/api/seller/orders/[orderId]/status` — Update order status
- GET `/api/seller/inventory` — Seller inventory
- GET `/api/seller/snapshot` — Seller operational data
- GET `/api/seller/intelligence` — Seller intelligence

### Admin (3)
- POST `/api/admin/moderation/product` — Moderate product
- POST `/api/admin/moderation/vendor` — Moderate vendor
- GET `/api/admin/snapshot` — Admin dashboard data

### Intelligence & Search (4)
- POST `/api/intelligence/search` — AI-powered product search
- POST `/api/intelligence/embedding` — Generate embeddings
- POST `/api/intelligence/embeddings/refresh` — Refresh embeddings
- GET `/api/governance/detection` — Governance detection

### Logistics (5)
- GET `/api/logistics/deliveries` — List deliveries
- GET `/api/logistics/deliveries/[id]` — Delivery detail
- POST `/api/logistics/dispatch` — Dispatch order
- GET `/api/logistics/health` — Logistics health
- POST `/api/logistics/reconciliation` — Logistics reconciliation

### Operations (4)
- GET `/api/operations/health` — Operational health
- GET `/api/operations/marketplace` — Marketplace ops snapshot
- GET `/api/operations/release` — Release info
- POST `/api/ops/async/worker` — Async worker
- GET `/api/ops/async/health` — Worker health

### Infrastructure (6)
- GET `/api/health` — Health check
- GET `/api/readiness` — Readiness probe
- POST `/api/push/subscribe` — Push subscription
- POST `/api/public/v1/events` — Public events API
- GET `/api/worker` — Worker endpoint
- GET `/api/tier10|14|15` — Tier research APIs (4 routes)

---

## Core lib/ Modules (Key Systems)

| Module | Purpose | Real DB Integration |
|--------|---------|-------------------|
| `lib/actions/` | Server actions (cart, orders, products, vendors, wishlist, auth) | ✅ Yes — Supabase RPCs |
| `lib/ai/` | Embeddings, search, ranking, personalization, recommendations | ✅ Yes — OpenAI + pgvector |
| `lib/api/queries/` | Data fetching (admin, cart, logistics, orders, products, seller, vendors, wishlist) | ✅ Yes — Supabase client |
| `lib/payments/` | Razorpay orchestration, rate limiting | ✅ Yes — Razorpay SDK |
| `lib/transactions/` | Atomic checkout, reconciliation | ✅ Yes — Supabase RPC |
| `lib/logistics/` | Live operations, providers, reconciliation | ✅ Yes (env-gated) |
| `lib/security/` | Auth, rate limiting, replay protection, upload security | ✅ Yes |
| `lib/marketplace-operations/` | Support, disputes, incidents, fulfillment, intelligence | ⚠️ Deterministic engine (sample data) |
| `lib/launch-certification/` | Certification engine, security audit | ⚠️ Assessment engine |
| `lib/pilot-launch/` | Pilot readiness, go/no-go decision | ⚠️ Assessment engine |
| `lib/observability/` | Operational health, alerts | ✅ Yes — reads from DB |
| `lib/autonomous-operations/` | Infrastructure incident detection | ⚠️ Signal-based (infra level) |
| `lib/geo/` | Geocoding, delivery feasibility, spatial queries | ✅ Yes (env-gated PostGIS) |
| `lib/realtime/` | Supabase realtime subscriptions | ✅ Yes |
| `lib/supabase/` | DB clients (admin, browser, server, middleware) | ✅ Yes |

---

## Honest Classification

### REAL (talks to database, processes real data)
- Cart operations (upsert/remove via Supabase RPC)
- Order creation and status transitions
- Product CRUD with image management
- Payment processing (Razorpay order/verify/webhook)
- AI search (OpenAI embeddings + pgvector)
- Auth & RBAC (Supabase Auth + user_roles)
- Seller dashboard data (real DB queries)
- Admin moderation (real DB updates)
- Operational health monitoring (real DB counts)

### DETERMINISTIC ENGINES (pure functions, sample-driven without DB)
- Marketplace operations (support, disputes, incidents)
- Certification engine (security, performance audit)
- Pilot launch engine (readiness, go/no-go)
- Fulfillment operations (risk assessment, SLA checking)
- Refund governance (risk scoring, auto-approve/block)

### ENV-GATED (works only with external services)
- AI embeddings (requires OPENAI_API_KEY)
- Geo/hyperlocal (requires PostGIS)
- Logistics providers (requires Shiprocket credentials)
- Push notifications (requires web-push config)
- Sentry monitoring (requires SENTRY_DSN)
