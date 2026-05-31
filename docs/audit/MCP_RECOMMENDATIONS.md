# MARKETPLACE COMPLETION PROGRAM — RECOMMENDATIONS (Section 17)

Derived **only** from audit evidence in this folder. Ordered by blocker severity
(critical blockers first). Each MCP lists: why (evidence), scope, and done-when.

---

## MCP-1 — Media & Image Pipeline + Secret Remediation
**Why (evidence):** IMAGE_PIPELINE_AUDIT = 1/10; 0 `storage.upload` calls, 0 file
inputs, gallery faked, `next.config` allows only Unsplash, mapper uses raw
`storage_path`. PRODUCTION_READINESS flags a committed secret in `docs/tier12`.
**Scope:** Supabase Storage upload (seller product/store/profile), server-side
resize/compress + responsive variants, storage-path→URL transform, whitelist the
storage host in `next.config`, real multi-image gallery, wire `ai_image_analysis`/
`product_image_audits` for moderation. Purge the committed secret, rotate keys,
make `ops:secret-scan` green.
**Done when:** a seller uploads a photo in-app and it renders (resized) on the
product page; secret-scan passes.

## MCP-2 — Data Liveness & Catalog Ingestion
**Why:** REPOSITORY_REALITY = everything falls back to empty without env+seed;
CATALOG_AUDIT = ingestion is SQL-seed only.
**Scope:** environment/config validation + first-run onboarding/seed wizard so a
fresh deploy is not empty; self-serve catalog ingestion (CSV + API import) with
validation against the existing `master_products`/`product_validation_issues`
schema; bulk price/stock operations.
**Done when:** a new seller can create a complete, searchable listing (with image)
end-to-end, and a fresh deploy shows real seeded catalog.

## MCP-3 — Trust Loop: Reviews, Ratings, Returns
**Why:** BUYER_EXPERIENCE = reviews are placeholder; no rating/return UI;
`reviews`/`review_votes` tables already exist; refund RPCs exist but no buyer UX.
**Scope:** buyer review+rating write + moderation; product rating rollups;
buyer-initiated returns/cancellation flow on top of `request_order_refund`; refund
status UI; order timeline from `order_status_history`.
**Done when:** a buyer can review a delivered order and initiate a return/refund
in-app, and ratings reflect real reviews.

## MCP-4 — Commerce Completeness: Coupons, Addresses, Payouts, Checkout
**Why:** COMPETITIVE_GAP = missing coupons, address book, payouts (placeholder);
ORDER_PIPELINE strong but buyer-facing edges thin.
**Scope:** coupon/promotion engine (cart+product); address book + multi-address
checkout; seller payouts (ledger/accounting already present); variant/attribute
management UI; complete Shiprocket carrier + live tracking.
**Done when:** buyer applies a coupon, ships to a saved address; seller manages
variants and sees a real payout.

## MCP-5 — Make Intelligence Real (Integrate Execution & Tier Engines)
**Why:** INTELLIGENCE_INTEGRATION = buyer AI is real, but Execution OS, tier
engines and Platform/Showcase are demo/seed, not wired to live data.
**Scope:** back `/admin/execution` with real governance decisions, orders,
inventory and KPIs; feed tier/executive-intelligence from live commerce signals;
clearly separate demo "Showcase" from live data (demo-data toggle) so nothing
misleads. Replace seller-dashboard stubs with snapshot-driven panels.
**Done when:** an admin activates a real governance decision into a tracked
initiative whose KPIs read from live DB.

## MCP-6 — Search UX, Maps, Scale & Reliability Proof
**Why:** SEARCH engine strong (6/10) but UX thin; GPS lacks maps; PRODUCTION/Scale
unproven (no load evidence), single-region, e2e thin.
**Scope:** search autocomplete/typeahead + facets/sort; interactive maps over
existing PostGIS; load/relevance benchmark harness for search+checkout; embedding
throughput/cost controls; expand e2e (seller, admin, checkout, payment); caching/
read-replica strategy; observability dashboards from real events.
**Done when:** documented p95 latency + relevance metrics under load, maps render,
and e2e covers the full buyer+seller+payment journey.

---

### Sequencing rationale
MCP-1→2→3→4 unblock a **usable consumer marketplace** (the C1–C5 critical
blockers). MCP-5 converts the program's unrealized intelligence "moat" into real
value. MCP-6 proves it is fast, navigable and reliable at scale. No MCP assumes
capability the audit did not verify in source.
