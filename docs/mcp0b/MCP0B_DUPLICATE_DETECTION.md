# MCP-0B.8 — Duplicate Detection Platform

Source: `lib/catalog/dedup.ts`.

## Detected duplicate kinds
| Kind | Method |
|------|--------|
| Exact | normalized `name + brand` equality |
| Near | token Jaccard `nameSimilarity` ≥ 0.82 |
| SKU collision | repeated SKU across the batch |
| Brand collision | surfaced via exact (name+brand) grouping |

`detectDuplicates(items, nearThreshold)` returns `{ ref, duplicateOf, kind,
confidence }`; the first occurrence is canonical.

## Integration
- Ingestion flags duplicate rows (excluded from `publishableRows`).
- Complements MCP-0A media-hash dedup (image collisions) for full
  product+media duplicate coverage.
- Admin Catalog Center shows duplicate counts in the import report.

Verified by tests: exact, near (0.83 similarity), and SKU-collision detection.
