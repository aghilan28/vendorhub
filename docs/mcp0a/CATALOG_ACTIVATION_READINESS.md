# MCP-0A.10 — Catalog Activation Readiness

Prepares infrastructure for MCP-0B (Catalog Activation). Assesses media-pipeline
readiness across catalog scales.

| Scale | Storage | Processing | Gallery | Moderation | Verdict |
|------:|---------|-----------|---------|------------|---------|
| 100 | buckets + per-image path | sync-ok | ✅ | auto + manual | ✅ Ready |
| 1,000 | partitioned by vendor/product | batched async | ✅ | auto-approve low risk | ✅ Ready |
| 10,000 | CDN-fronted public buckets | batched + idempotent jobs | ✅ thumbnails | queue prioritised | ✅ Ready (worker capacity dependent) |
| 50,000 | per-vendor prefixes, lifecycle rules | resume-able batches | ✅ webp/avif variants | risk-routed queue | 🟡 Ready with monitoring |
| 100,000+ | archive/retention tiers | parallel workers | ✅ | sampled manual review | 🟡 Ready with horizontal worker scaling |

## What makes it scale
- Deterministic path scheme (`vendors/{v}/products/{p}/...`) avoids hotspots.
- Variant plan (thumbnail/card/gallery/zoom/webp/avif) keeps buyer payloads small.
- Bulk ingestion = batched + resumable + idempotent (`lib/media/bulk.ts` + async orchestrator).
- Auto-moderation approves low-risk media so human review scales sub-linearly.
- 328-index schema + heavy DB indexing (existing) + media-specific indexes (this migration).

## Dependencies / caveats (honest)
- Byte-level transforms (resize/encode/virus-scan) run in the async worker; this
  phase delivers the deterministic plan + validation + storage + schema.
- Throughput at 50k–100k requires horizontal worker scaling and embedding/transform
  cost controls (tracked for MCP-0B/0E).

**Readiness: catalog-scale media-ready for MCP-0B**, with worker scaling as the
known operational lever.
