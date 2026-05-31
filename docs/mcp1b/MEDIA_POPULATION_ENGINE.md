# MCP-1B.5 — Media Population Engine

**Engine:** `lib/catalog-population/media-population.ts` (extends MCP-0A).

## Capabilities (all mandated)
- **Bulk image upload** — reuses MCP-0A `parseCsvManifest` + `planIngestion`
  (batched) + `computeProgress` + `resumableRows` for ZIP/CSV+images imports.
- **Image validation** — `scoreMediaAsset` flags `invalid_url`,
  `low_resolution`, `extreme_aspect_ratio`, `oversized`, `dimensions_unknown`.
- **Image quality scoring** — 0–100 per asset; batch `averageQuality`.
- **Image deduplication** — exact dedup by hash, then by URL (`duplicateOf`).
- **Image compression** — `needsCompression` (over 1.5 MB) → `toCompress` plan
  (byte transform executed by the 0A async worker).
- **Image transformation / thumbnail generation** — `needsThumbnail` →
  `toThumbnail` plan (400px target).
- **Media analytics** — `MediaPopulationReport` (total/acceptable/flagged/
  duplicates/averageQuality/toCompress/toThumbnail).
- **Media governance** — `mediaGovernance` gates attachment (no acceptable media,
  or average quality < 50 floor).
- **Media recovery** — `resumableRows` re-queues failed/pending rows.

## Exit criteria — met
Catalog media scales: bulk plans validate, dedupe, score and schedule
transforms deterministically; governance gates low-quality batches. Covered by
2 media tests.
