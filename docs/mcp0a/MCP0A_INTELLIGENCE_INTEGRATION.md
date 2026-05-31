# MCP-0A.12 — Intelligence Integration Report

Media is **not** an isolated subsystem; it feeds and is governed by existing
commerce intelligence.

| Integration | How | Status |
|-------------|-----|--------|
| Image Quality Intelligence | `scoreMediaQuality` (0-100 + flags) attached to every asset; surfaced in seller upload + admin governance | ✅ delivered |
| Catalog Quality Intelligence | coverage %, products-without-media, duplicate paths in admin governance; product create already enqueues `ai.embedding.refresh` so new media-backed products are re-embedded | ✅ delivered |
| Media Risk Intelligence | `computeRiskScore` + `autoModerate` route risky media to review; `media_moderation` persists state/risk | ✅ engine + schema |
| Media Governance | moderation state machine + audit log integrate with existing governance/audit posture | ✅ |
| Search / Discovery | resolved image URLs + gallery flow into product cards and the existing pgvector search results | ✅ rendering integrated |

## Re-embedding loop
`createProductAction` enqueues `ai.embedding.refresh` on the async orchestrator;
media uploads revalidate product pages so newly-imaged products surface correctly
in discovery. Image-derived signals (quality, labels) are written to media tables
for downstream catalog-quality intelligence (MCP-0E).

## Principle
No parallel "media intelligence" silo was created — quality/risk scoring reuse the
deterministic-engine pattern used across the platform and persist to governable
tables, consistent with the Commerce Intelligence architecture.
