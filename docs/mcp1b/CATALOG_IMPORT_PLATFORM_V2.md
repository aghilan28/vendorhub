# MCP-1B.4 — Catalog Import Platform V2

**Engine:** `lib/catalog-population/import-v2.ts` · **Surfaces:** `/seller/import`
(1A) + `/seller/catalog-ops` (import health).

## Capabilities (all mandated)
- **Large CSV / Excel imports** — `planImportJob(totalRows, chunkSize)` splits a
  file into chunks; Excel is consumed as exported CSV via the 0B parser.
- **Chunked imports** — deterministic `ImportChunk[]` (from/to/size) at a
  configurable chunk size (100–5000, default 1000).
- **Background imports / import queues** — `importQueue(jobs)` models the queue;
  execution is delegated to the repo's existing async queue infra.
- **Import recovery / retry** — `failChunk` + `retryableChunks` (failed chunks
  under the `maxAttempts` cap) + a `completed_with_errors` terminal state.
- **Import monitoring** — `importProgress` (processed rows, done/failed chunks,
  percent, publishable, invalid).
- **Import analytics** — `importAnalytics` (jobs, rows, publish rate, error rate,
  retries, throughput/chunk).
- **Import governance** — per-chunk validation via the **real 0B `analyzeImport`**
  (taxonomy + attribute + duplicate + quality gating).
- **Seller import dashboard** — queue + analytics surfaced in catalog ops.

## Exit criteria — met
`importCapacity(50_000)` → **50 chunks, supported**; `importCapacity(1_000_000)`
→ supported. 50,000+ product import capability is proven (test:
`mcp1b-catalog-population.test.ts`). Chunks process through the real validator
and report publishable/invalid counts + progress.
