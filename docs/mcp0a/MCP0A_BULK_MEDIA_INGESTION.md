# MCP-0A.9 — Bulk Media Ingestion System

Source: `lib/media/bulk.ts`; UI: bulk manifest planner in the Seller Media Center.

## Supported inputs
- CSV + images (manifest `sku,name,images` with pipe-separated filenames) —
  parsed by `parseCsvManifest`.
- ZIP / folder upload + Excel variants — same manifest model (the worker unpacks
  the archive and maps filenames to rows).

## Planning
`planIngestion(rows, batchSize=100)` → deterministic batches with totals
(rows, images, batches). The UI previews this before any processing.

## Progress, failure recovery & resume
- `computeProgress(states)` → total/done/failed/pending/percent.
- `resumableRows(rows, states)` → failed + not-yet-started rows for safe resume.
- Import history is recorded via the async orchestrator + `media_audit`.

## Scale
Batching + idempotent async jobs + per-row state make 1,000 → 100,000-row
imports tractable without blocking requests. Verified by tests (250-row plan →
3 batches; manifest parse + error cases; progress + resume).
