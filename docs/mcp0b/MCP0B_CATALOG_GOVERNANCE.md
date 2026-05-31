# MCP-0B.9 — Catalog Governance

Admin surface: `/admin/catalog` (Admin Catalog Center) + live snapshot
`lib/catalog/queries.ts`. Builds on the existing governance/audit posture and
the catalog-governance schema (`master_products`, `product_validation_issues`,
`product_quality_scores`, `product_duplicate_clusters`).

## Admin capabilities
| Capability | How |
|------------|-----|
| Approve products | publish `valid` rows (`publishableRows`) → `status='ACTIVE'` |
| Reject products | `invalid` rows blocked from publish; reasons surfaced |
| Merge products | duplicate clusters (`detectDuplicates`) → canonical + merge |
| Archive products | status transition to `ARCHIVED` |
| Correct products | precise error keys per row drive correction |
| Audit / history | governance audit log + import history |
| Ownership | products carry `vendor_id`; governance tracks ownership |

## Live governance snapshot
`getCatalogRealitySnapshot` (admin-gated) reports products, active/searchable,
categories, media coverage and inventory rows — with an honest empty state when
Supabase is not configured (no fabricated counts).

Mandatory governance actions are expressed through the ingestion validity gates +
status lifecycle + duplicate clustering, consistent with marketplace governance.
