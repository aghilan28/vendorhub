# M0 — Unified Route Registry (Section 5)

Inventory after all merges. Integrated tree: **67 pages + 48 API routes**. Evidence: enumeration of `app/**/page.tsx` and `app/api/**/route.ts` on `integration/phase-m0-unified-platform`.

Status: ✅ builds + routes (HTTP 200 verified) · ⚙️ auth-gated operator · 🔌 API · 🧩 placeholder. Owner = primary domain.

## 5.1 Marketplace / Buyer routes (group `(buyer)`)
| Path | Page | API deps | Status | Access | Owner |
|---|---|---|:--:|---|---|
| `/`, `/home` | Marketplace | products, geo, recs | ✅ 200 | public | Commerce |
| `/categories`, `/categories/[slug]` | Category browse | catalog | ✅ | public | Commerce |
| `/products/[id]`, `/product/[slug]` | Product detail | catalog/pricing | ✅ | public | Commerce |
| `/search` | Search | `/api/intelligence/search` | ✅ | public | Commerce-Intel |
| `/cart`, `/checkout` | Cart/checkout | `/api/payments/razorpay/*` | ✅ | public/auth | Commerce |
| `/orders`, `/orders/[id]` | Orders | orders | ✅ | auth | Commerce |
| `/tracking`, `/tracking/[id]` | Tracking | `/api/logistics/*` | ✅ | auth | Logistics |
| `/wishlist`, `/profile` | Wishlist/profile | — | ✅ | auth | Commerce |

## 5.2 Seller routes (group `(seller)`)
| Path | API deps | Status | Owner |
|---|---|:--:|---|
| `/seller`, `/seller/dashboard` | `/api/seller/snapshot` | ⚙️ | Seller |
| `/seller/products*`, `/seller/inventory` | `/api/seller/inventory` | ⚙️ | Seller |
| `/seller/orders*` | `/api/seller/orders/[orderId]/status` | ⚙️ | Seller |
| `/seller/analytics` | `/api/seller/intelligence` | ⚙️ | Merchant-Intel |
| `/seller/payouts`, `/store-settings`, `/notifications`, `/onboarding` | finance/push | ⚙️ | Seller |

## 5.3 Admin / Operator routes (group `(admin)`)
| Path | API deps | Status | Owner |
|---|---|:--:|---|
| `/admin`, `/admin/dashboard` | `/api/admin/snapshot` | ⚙️ | Ops |
| `/admin/moderation*`, `/admin/vendors*` | `/api/admin/moderation/*`, `/api/governance/detection` | ⚙️ | Governance |
| `/admin/orders`, `/refunds`, `/categories` | `/api/payments/refunds` | ⚙️ | Ops |
| `/admin/analytics`, `/audit-logs`, `/flags`, `/settings`, `/notifications` | observability/flags | ⚙️ | Ops |

## 5.4 Commerce Intelligence routes (group `(intelligence)` — merged from K) **NEW**
| Path | Page | Status | Owner |
|---|---|:--:|---|
| `/commerce-intelligence` | Commerce Intelligence Center | ✅ 200 | Commerce-Intel |
| `/pricing`, `/pricing/simulator`, `/pricing/recommendations` | Pricing Studio | ✅ 200 | Commerce-Intel |
| `/forecasting`, `/forecasting/scenarios`, `/forecasting/comparison` | Forecast Studio | ✅ 200 | Commerce-Intel |
| `/inventory-intelligence` | Inventory Intelligence | ✅ 200 | Commerce-Intel |
| `/supply-intelligence` | Supply Intelligence | ✅ 200 | Commerce-Intel |
| `/routing` | Routing Intelligence | ✅ 200 | Logistics-Intel |
| `/telemetry` | Telemetry Intelligence | ✅ 200 | Observability |
| `/search-intelligence` | Search Intelligence | ✅ 200 | Commerce-Intel |
| `/recommendations` | Recommendations | ✅ 200 | Commerce-Intel |

## 5.5 Advanced Intelligence / Runtime API (merged from F/G) **NEW**
| Path | Type | Status | Owner |
|---|---|:--:|---|
| `/api/advanced/{decisions,governance,knowledge,operations,simulation}` | 🔌 API | builds | Advanced-Intel |
| `/api/intelligence/{decisions,operations,pricing,search,embedding,embeddings/refresh}` | 🔌 API | builds | Commerce-Intel |
| `/api/runtime/health` | 🔌 API | ✅ 200 | Runtime |
| `/api/ai/health` | 🔌 API | ✅ 200 | AI-Platform |
| `/api/metrics` | 🔌 API | ✅ 200 | Observability |
| `/api/tier10/{alignment,governance,knowledge,simulation}`, `/api/tier14`, `/api/tier15` | 🔌 API | builds | Advanced-Intel |

## 5.6 System routes
`/api/health` ✅200 · `/api/readiness` ✅(503 demo-safe, by design) · `/api/operations/*`, `/api/ops/async/*`, `/api/worker`, `/api/payments/*`, `/api/logistics/*`, `/api/invoices/[orderId]`, `/api/push/subscribe`, `/api/public/v1/events`.

## 5.7 Coverage vs directive Section 5 checklist
| Required surface | Present? | Path |
|---|:--:|---|
| Marketplace / Seller / Admin | ✅ | as above |
| Commerce Intelligence | ✅ | `/commerce-intelligence` |
| Pricing / Forecast Studio | ✅ | `/pricing*`, `/forecasting*` |
| Inventory / Supply / Routing / Telemetry Intelligence | ✅ | respective routes |
| Advanced Intelligence (API) | ✅ (API only) | `/api/advanced/*`, `/api/tier*` |
| **Research Center / Research Registry / Research Workflows** | ❌ | no page exists on any branch |
| **Knowledge OS / Knowledge Graph / Knowledge Workflows** | ❌ | backend/docs only |
| **Meta-Knowledge Center / Ontology Studio** | ❌ | does not exist |
| **Simulation Studio (page)** | ❌ | `/api/advanced/simulation` exists; no page |
| **SECIS Studio (page)** | ❌ | `lib/tier11` + docs only; no page |
| **Governance Center (page)** | ⚠️ partial | admin moderation/audit + `/api/advanced/governance`; no dedicated "Governance Center" page |

**Finding:** Integration brought ALL existing surfaces into one tree. Surfaces that remain absent **were never built as pages on any branch** (Research/Knowledge/Meta-Knowledge/Simulation/SECIS/Governance "centers"). M0 cannot surface what does not exist without building — which is out of scope. These are carried as **backend/API/docs-only** and flagged for a future productization phase.
