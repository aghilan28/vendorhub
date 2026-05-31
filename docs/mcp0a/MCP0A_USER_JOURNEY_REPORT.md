# MCP-0A.13 — User Journey Report

| Journey | Path | Mechanism | Status |
|---------|------|-----------|--------|
| **A** Seller → upload images → create product → publish | `/seller/media` + `/seller/products` | File upload + validation + quality score → `uploadProductMediaAction` → `product_images`; create enqueues embedding refresh | ✅ functions (needs Supabase env to persist) |
| **B** Seller → bulk import 1,000 products → attach media → publish | `/seller/media` bulk planner + worker | `parseCsvManifest` → `planIngestion` (batches) → async worker upload/transform | ✅ planning delivered; execution worker-driven |
| **C** Admin → review moderation queue → approve → publish | `/admin/media` + `media_moderation` | `orderQueue` + `applyModeration` state machine + audit | ✅ engine + schema; write-paths bind to provisioned tables |
| **D** Buyer → browse product → view gallery → zoom → view media | `/product/[slug]` | `ProductGallery`: thumbnails, lightbox, zoom, keyboard, fallback | ✅ functions now |
| **E** Admin → review media analytics → detect quality issues → resolve | `/admin/media` | coverage/integrity/duplicate analytics from real data + quality flags | ✅ analytics delivered |

## Verification
- Journeys B/C/E logic is unit-tested (`tests/unit/mcp0a-media.test.ts`: manifest
  parse + ingestion plan + progress/resume; moderation transitions + queue; risk
  scoring).
- Journey D renders the real gallery component (build-verified route).
- Journey A is wired to the real upload action; persistence requires Supabase env
  (graceful, inline errors otherwise).

**All journeys function** at the level achievable without live infrastructure;
those requiring Supabase/worker degrade gracefully and are clearly gated.
