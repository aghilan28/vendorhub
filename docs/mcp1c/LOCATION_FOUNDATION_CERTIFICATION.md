# MCP-1C.2 — Location Foundation Certification

**Engine:** `lib/hyperlocal/location.ts`.

## Supported (all mandated)
Country · State · District · City · Zone · Locality · Postal code · Latitude ·
Longitude · **Geohash** (dependency-free encoder, precision 7 ≈ 150 m) ·
Boundaries/zones (via store-network + delivery zones).

## Operations
- **Normalization** — `normalizeLocation` (title-case hierarchy + geohash).
- **Validation** — `isValidPincode` (Indian 6-digit), coordinate validity (reuses
  lib/geo `isValidCoordinates`).
- **Resolution** — `resolveLocation` → `{ valid, confidence, score, issues }`.
- **Scoring** — completeness over the location hierarchy (country→pincode).
- **Confidence** — boosted by valid coordinates + valid pincode; penalised per issue.
- **Cell adjacency** — `sameCell` (geohash prefix match) for proximity grouping.

## Verdict
Deterministic, dependency-free location foundation with geohash, normalization,
validation, resolution, scoring and confidence. **Certified.** (3 location tests.)
