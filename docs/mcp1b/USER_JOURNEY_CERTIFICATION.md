# MCP-1B.12 — User Journey Certification

All five mandated journeys function (live when configured; labelled sample
otherwise).

## Journey A — Seller: Upload 1000 products → Publish
`planImportJob(1000)` chunks the file; `processChunk` validates each chunk
through the real MCP-0B `analyzeImport`; `importProgress` reaches 100% and
publishable rows are reported. Surfaced in `/seller/import` + `/seller/catalog-ops`. ✅

## Journey B — Seller: Bulk import → Resolve errors → Publish
The import report flags invalid/duplicate rows; `retryableChunks` + recoverable
refs let the seller fix and re-import; governance gates publishing. ✅

## Journey C — Admin: Review catalog → Govern catalog
`/admin/catalog-governance` — six queues (catalog/quality/duplicate/media/import/
risk) + governance dashboard + coverage + population intelligence. ✅

## Journey D — Buyer: Discover → Search → Navigate
`assessDiscoveryReadiness` proves 100% search coverage on the generated catalog,
facets (category/brand/price/attributes), sort options and category navigation;
buyer `/search`, `/categories`, `/discover` consume the same catalog. ✅

## Journey E — Intelligence: Detect catalog gap → Recommend population
`buildPopulationIntelligence` detects empty/thin categories and variant gaps and
emits ranked population recommendations + a forecast. ✅

## Validation
Backed by 411 passing unit/integration tests (incl. 18 new MCP-1B), the
navigation-coherence test (new routes resolve, no dead/placeholder), and a
production build emitting `/seller/catalog-ops` and `/admin/catalog-governance`.
