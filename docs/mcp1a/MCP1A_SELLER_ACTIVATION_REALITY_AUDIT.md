# MCP-1A — Seller Activation Reality Audit (evidence-based, from code)

> Source of truth for this phase. Every classification is grounded in a file
> path verified on the MCP-0G tip. Prior reports were **not** trusted.

## Verified starting state
- `tsc --noEmit` ✅ · `eslint .` ✅ (1 pre-existing warning) · `vitest` ✅ 372/44 · `next build` ✅ (pre-1A).
- Chain: MCP-0A…0G complete. node_modules present.

## Capability classification

| Capability | Class | Evidence | 1A action |
|---|---|---|---|
| Seller registration | **Placeholder** | `app/(auth)/seller-registration/page.tsx` renders a static `FormShell` (no submission/validation). | Replace with a real multi-step onboarding wizard. |
| Seller authentication | **Real** | Supabase auth + `(auth)/sign-in`, `sign-up`, middleware RBAC (`SELLER_ROUTES`). | Reuse. |
| Store creation | **Partial** | `startVendorOnboardingAction` (`lib/actions/vendors.ts`) inserts a `vendors` row (name/slug/owner). No business/GST/bank/branding capture. | Wrap in onboarding wizard + application model. |
| Catalog creation | **Real** | `lib/catalog/*` (0B): taxonomy (97 nodes), attributes, variants, quality, dedup. | Reuse. |
| Inventory creation | **Real** | 0C seller-os inventory + `product_inventory`. | Reuse in import. |
| Bulk upload | **Partial** | `lib/catalog/ingestion.ts`: `parseCsv`, `parseJson`, `analyzeImport`, `publishableRows` are REAL; but no import-job orchestration, template, history, recovery or governance UX. | Build a Product Population engine over 0B ingestion. |
| Media upload | **Real** | 0A `lib/media/*` + `uploadProductMediaAction` + Supabase storage. | Reuse for media import. |
| Product approval | **Partial** | `admin/moderation/products` exists; no catalog-import review workflow. | Add catalog review/governance. |
| Store approval | **Missing** | No store/seller approval queue or application state machine. | Build onboarding approval workflow + admin queues. |
| Seller verification (KYC) | **Missing** | No identity/business/bank/document verification, risk flags or escalation. | Build a verification engine + state machine. |
| Storefront generation | **Missing** | No public per-seller storefront route (`/store/[slug]`). Seller pages are owner-only dashboards. | Build storefront generation + public route. |
| Catalog import (end-to-end) | **Partial** | Engine real; no seller import wizard, reporting, recovery, history. | Build import surface + job model. |
| Admin governance (sellers) | **Partial** | `admin/vendors` lists vendors; no review/verification/risk/escalation queues or seller governance center. | Build admin seller governance center. |
| Product universe scaling | **Real (engine)** | `generateCatalog(count)`, `catalogDistribution` scale to 100k+ (0B, unit-tested). | Reuse for universe certification. |

## Reuse map (do NOT rebuild)
`lib/catalog` (parse/analyze/publishable/generate/distribution/quality/dedup/taxonomy),
`lib/media`, `lib/seller-os` (store/inventory/pricing), `lib/trust` (reputation),
`lib/marketplace-intelligence` (recommendation/activation), `lib/commerce-transaction`
(throughput), `lib/actions/vendors` (`startVendorOnboardingAction`).

## What MCP-1A builds (`lib/seller-activation/`)
A deterministic engine on real shapes: onboarding wizard (12 steps + validation +
progress + draft + application state machine), KYC/verification (4 checks + risk
flags + fraud + escalation + score), product population (import jobs over 0B +
template + report + recovery + history + governance), storefront generation,
seller activation center (status + tasks + next-best-action + briefing),
admin seller governance (6 review queues + health), marketplace population
operations (funnel + KPIs + progress), and activation intelligence
(seller-growth/catalog/activation/population/expansion/trust + recommendations).

## Honest scope
No live DB in the sandbox; live reads degrade to clearly-labelled samples
(`sampled: true`). DB persistence for applications/verification cases is provided
as typed queries + a migration outline but not executed here. Document/identity
verification is modelled deterministically (no third-party KYC vendor wired).
