# MCP-0A.1 — Media Baseline Audit

Source-of-truth audit of media handling **before** this phase, re-verified
against the repository (not prior reports).

| Area | Before MCP-0A | Evidence |
|------|---------------|----------|
| Image storage | ❌ Missing | 0 `storage.upload` / `storage.from` calls in app/features/lib |
| Image rendering | ⚠️ Broken for stored images | `mapProductRowToProduct` set `imageUrl: image.storage_path` (raw path); `next.config` whitelisted only `images.unsplash.com` |
| Image references | 🟡 Schema only | `product_images(storage_path, alt_text, is_primary, sort_order)` rows; populated via SQL seeds |
| Gallery behavior | ❌ Fake | product page rendered `[imageUrl, imageUrl, imageUrl, imageUrl]` (one image repeated 4×) |
| Upload behavior | ❌ Missing | 0 `type="file"` inputs anywhere; `createProductAction` attached image **metadata rows only** |
| Admin media controls | ❌ Missing | no media governance route/queries |
| Seller media controls | ❌ Missing | no media UI; seller could not add a photo |
| Product media architecture | 🟡 Partial | rich catalog schema (`product_images`, `ai_image_analysis`, `product_image_audits`) but **no runtime pipeline** |

## Verdict (before)
Media was the marketplace's weakest system (Image Pipeline scored **1/10** in the
Marketplace Reality Audit). A seller could not upload a product photo; buyers saw
a cosmetic single-image "gallery"; stored-image URLs would not even render.

## What MCP-0A changes (delivered in this PR)
- Real Supabase Storage upload/delete/reorder server actions (`lib/media/actions.ts`).
- Storage-path → URL resolution + `next.config` Supabase host whitelist.
- A real multi-image gallery with zoom/lightbox/thumbnails/fallback.
- A deterministic media engine (validation, quality scoring, variant + pipeline
  planning, dedup, moderation, bulk ingestion).
- Seller Media Center and Admin Media Governance surfaces.
- 10 storage buckets + media domain tables + RLS migration.

See the remaining MCP-0A documents for detail.
