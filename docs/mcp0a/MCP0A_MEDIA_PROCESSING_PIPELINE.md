# MCP-0A.6 — Media Processing Pipeline

Source: `lib/media/processing.ts` (+ `analyzeIngest` in `lib/media/index.ts`).

## Audited steps (in order)
`validate → virus_scan → moderation_scan → decode_metadata → hash →
duplicate_check → compress → resize → thumbnail → webp → avif → quality_score →
place_storage → cdn_publish`

`planPipeline()` returns each step with a status (`pending`/`skipped`/`failed`);
video assets skip image-only steps, and `avif` is skipped when the source is too
small to warrant it.

## Validation
`validateUpload(candidate, bucket)` enforces the bucket policy: mime allow-list,
size ceiling, non-empty, known format. Returns structured `errors[]`.

## Variants (no upscaling)
`planVariants(longEdge)` produces thumbnail(200), card(480), gallery(1080),
zoom(2000) webp + an avif(1080), never exceeding the source long edge.

## Hashing & dedup inputs
`hashContent` (sha256, deterministic) + `perceptualHash` (coarse, deterministic
surrogate) feed `lib/media/dedup.ts`.

## Where the bytes are transformed
This module is the **deterministic planner/validator** (pure, testable). The
actual resize/encode/virus-scan run in the async worker using this plan; product
create already enqueues `ai.embedding.refresh`, and the same orchestrator
(`lib/async`) carries media jobs.

## Tests
`tests/unit/mcp0a-media.test.ts` covers validation, format detection, variant
no-upscale, pipeline step planning (avif skip), hashing determinism, and the
end-to-end `analyzeIngest` integration.
