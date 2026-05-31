# MCP-0B.5 — Product Ingestion Platform

Source: `lib/catalog/ingestion.ts`; UI in Admin Catalog Center (`/admin/catalog`)
and Seller Catalog Operations (`/seller/catalog`).

## Inputs
- **CSV** (`parseCsv`): header `name,category,price[,brand,sku,description,stock,images,attributes]`;
  `images` pipe-separated, `attributes` `k=v;k=v`.
- **JSON** (`parseJson`): array of product inputs.
- **Excel / API / Bulk**: same normalized `CatalogProductInput` shape (Excel/API
  adapters convert to rows; bulk = batched CSV/JSON).

## Pipeline (`analyzeImport`)
1. **Validate** each row: name, taxonomy category (`isKnownCategory`), price,
   and attribute template (`validateAttributes`).
2. **Mass validation**: per-row `valid | invalid | warning` + errors/warnings.
3. **Duplicate detection**: batch-level (`detectDuplicates`) → rows flagged `duplicate`.
4. **Quality**: per-row `scoreCatalogQuality` (0-100).
5. **Batching**: `batches = ceil(total / batchSize)` for worker processing.
6. **Report**: totals (valid/invalid/duplicates/warnings/averageQuality).

## Mass correction / recovery / rollback / history / governance
- **Mass correction**: invalid rows surface precise error keys for fixing.
- **Recovery / resume**: batch model + per-row status (reuses the async
  orchestrator pattern); failed rows are retried.
- **Rollback**: imports run under a batch token; `publishableRows(report)` gates
  what is committed, so a batch can be reverted as a unit.
- **History / governance**: import runs + outcomes recorded via audit; only
  `valid|warning` rows are publishable (`invalid`/`duplicate` excluded).

Verified by tests: CSV parse + missing-column, JSON parse, valid/invalid/duplicate
classification, publishable filtering.
