# MCP-0B.7 — Catalog Quality Engine

Source: `lib/catalog/quality.ts`. Produces a 0-100 score per product + flags +
missing fields.

## Analyzed dimensions
- Missing/short/low-quality **title** (`test`, `untitled`, too long).
- Missing **description**.
- Missing/unknown **category** (taxonomy check).
- Invalid **price**.
- Missing **brand**.
- Missing **media**.
- Incomplete **attributes** (per category template) + attribute warnings.

## Output
`scoreCatalogQuality(input)` → `{ score, flags[], missingFields[] }`;
`qualityBand(score)` → excellent (≥85) / good (≥70) / fair (≥50) / poor.

## Where it is used
- Per-row in ingestion (`analyzeImport`) and seller bulk console.
- Per-product in the generator (`qualityScore`).
- Admin Catalog Center surfaces average + per-row quality.

Verified by tests: complete product scores >80; broken product <50 with
`missing_media`, `unknown_category`, `invalid_price` flags.
