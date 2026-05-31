# MCP-1A.4 — Product Population Engine

**Engine:** `lib/seller-activation/population.ts` (orchestrates the **real**
MCP-0B catalog ingestion + generator). **Surface:** `/seller/import`
(`ProductImportCenter`).

## Capabilities (all mandated)
- **Single product creation** — `importSingle` routes one product through the
  same validation pipeline.
- **Bulk / CSV / JSON import** — `importCsv` / `importJson` reuse 0B `parseCsv` /
  `parseJson` → `analyzeImport`. (Excel: export-to-CSV; the engine consumes CSV.)
- **Template download** — `importTemplateCsv` + `IMPORT_TEMPLATE` (header +
  example row), downloadable in the surface.
- **Validation rules** — name/category/price required; **category mapping** via
  the 0B taxonomy (`isKnownCategory`); **attribute validation** per family
  (e.g. groceries require `weight`).
- **Duplicate detection** — 0B `detectDuplicates` (exact/near/SKU) marks rows.
- **Inventory / pricing / media import** — `stock`, `price`, `images` columns
  flow into `CatalogProductInput`.
- **Catalog review workflow + reporting** — `ImportReport`
  (total/valid/invalid/duplicates/warnings/averageQuality) → `ImportJob`.
- **Import recovery** — `recoverableRefs` lists invalid/duplicate rows to fix and
  re-import.
- **Import history** — `toHistoryEntry` records published/rejected per job.
- **Import governance** — `importGovernance` gates publishing (no publishable
  rows, quality < 40 floor, more invalid than valid).

## Exit criteria — met
A seller can upload hundreds of products at once; only validated, non-duplicate,
quality-gated rows become publishable. Covered by 4 population tests (CSV import,
single, governance, recovery).
