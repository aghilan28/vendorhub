# MCP-0A.8 — Media Quality Engine

Source: `lib/media/quality.ts`.

## Output
`scoreMediaQuality(metadata, signals)` → `MediaQuality`:
- `score` 0-100 (deterministic, weighted composite)
- sub-scores: resolution, aspect, brightness, sharpness, noise, watermarkRisk
- `flags[]`: low_resolution, awkward_aspect_ratio, too_dark/overexposed, blurry,
  noisy, possible_watermark, duplicate, suspiciously_small

## Weighting
`resolution 0.30 + sharpness 0.25 + aspect 0.15 + brightness 0.10 + clean 0.10 +
(1 - watermark) 0.10`; duplicates subtract 25.

## Analyzed dimensions (per directive)
Resolution, aspect ratio, brightness, blur (sharpness), noise, duplicate images,
watermarks, missing images (empty gallery handled upstream), low quality.

## Bands
`qualityBand(score)` → excellent (≥85) / good (≥70) / fair (≥50) / poor.

## Determinism
Pure function of inputs; missing perceptual signals default to neutral so partial
analysis still yields a score. Verified by tests (bounds, flag detection,
duplicate penalty, banding).
