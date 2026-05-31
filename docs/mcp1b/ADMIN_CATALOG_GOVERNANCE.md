# MCP-1B.10 — Admin Catalog Governance

**Engine:** `lib/catalog-population/governance.ts` · **Surface:**
`/admin/catalog-governance`.

## Six review queues (all mandated)
1. **Catalog** — listings pending review (pending/draft status).
2. **Quality** — products with quality score < 40.
3. **Duplicate** — potential duplicates (MCP-0B `detectDuplicates`).
4. **Media** — products with no media.
5. **Import** — large/at-risk imports (queue view from import analytics).
6. **Risk** — manually-flagged listings.

## Governance dashboard
`buildCatalogGovernanceSnapshot` → total pending, products, published, catalog
health + tone, duplicate risk. The center adds **category coverage** and
**population intelligence** tabs (Phase 11).

## Catalog operations center
`/admin/catalog-governance` consolidates the queues, coverage and intelligence;
admins can manage a large catalog from one surface (queues cap at 100 items).

## Exit criteria — met
Admins can review, quality-gate, de-duplicate and govern the catalog at scale.
Covered by the governance test (six queues + media queue populated).
