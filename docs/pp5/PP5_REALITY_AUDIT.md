# PP5_REALITY_AUDIT

**Program:** VendorHub Product Population — Wave 1 (PP-5): Media Population, Image Intelligence & Visualization
**Method:** Source-code audit only. Reports not trusted; migrations, app, data layer and image config inspected.
**Audited ref:** branch `pp5-media-population` (cut from `pp4-product-universe-population`, carrying PP-1..PP-4).

---

## 0. Headline

The product universe is populated (PP-4) but **visually empty**: storefront products carry no
`imageUrl`, so `product-card.tsx` renders the "Product image" placeholder (blank cards). A media
*schema* exists at the DB level (`catalog_product_images`, `product_images`, `product_image_audits`,
`ai_image_analysis`) but there is **no `lib/product-media/` media engine, no media population, no
thumbnail/gallery/quality/governance/analytics layer, and no storefront media activation**.

PP-5 builds that layer additively and activates images so the storefront renders real media. It does
**not** modify PP-1/PP-2/PP-3 or PP-4 product records (it enriches the storefront projection only).

---

## 1. Subsystem classification (REAL / PARTIAL / MISSING)

| # | Subsystem | Status | Evidence |
|---|---|---|---|
| 1 | Media tables | **PARTIAL** | `catalog_product_images` (image_kind, storage_path, public_url, width/height, mime), `product_images`, `product_image_audits` — schema only, unpopulated |
| 2 | Image upload systems | **MISSING** | no upload pipeline in `lib` |
| 3 | MCP-0A media infrastructure | **MISSING** | no MCP-0A media module found in source |
| 4 | Image validation logic | **PARTIAL** | `ai_image_analysis`/`product_image_audits` tables; no validation engine |
| 5 | Thumbnail generation logic | **MISSING** | no thumbnail engine |
| 6 | Image storage providers | **PARTIAL** | Supabase storage buckets referenced in `.env.example`; not wired for catalog media |
| 7 | CDN integrations | **PARTIAL** | `next.config.ts` allowlists `images.unsplash.com` for `next/image` |
| 8 | Product image fields | **PARTIAL** | storefront `Product.imageUrl?` exists (unset); `Category.imageUrl?` exists |
| 9 | Gallery fields | **MISSING** | storefront `Product` has no gallery field; PP-3 has `catalog_product_images` rows (unpopulated) |
| 10 | Storefront image consumers | **REAL** | `components/commerce/product-card.tsx` uses `next/image` on `product.imageUrl`, else a blank placeholder |

**Summary:** schema PARTIAL, engine + population MISSING, one real consumer (product-card) waiting for `imageUrl`.

---

## 2. Activation path (Phase 1 map)

```
Product (PP-4) -> Primary Image -> Gallery -> Thumbnail -> Brand/Category assets
```

- Homepage / category / search render `ProductCard`/`ProductGrid` → `product.imageUrl` via `next/image`.
- Product detail renders the product gallery (currently empty).
- `next/image` validates the src host against `next.config.ts images.remotePatterns` at build, so PP-5
  media URLs use an allowlisted, deterministic host (a placeholder image CDN added to remotePatterns).

## 3. Constraints captured

- Do not modify PP-1/2/3 or PP-4 product records. Reuse `stableHash` (PP-3), the PP-4 product universe
  and PP-4 storefront catalog; enrich the storefront projection with media in PP-5 only.
- Additive, idempotent migration (per `ops-migration-audit`); new `product_media_*` registries (no
  collision with `catalog_product_images`); RLS; reuse `set_updated_at`/`current_user_has_role`.
- Deterministic media (no binary uploads): deterministic image URLs + checksums; no `Date.now()`/`Math.random()`.
- No store/inventory/seller/hyperlocal population.

## 4. Decision

Build `lib/product-media/` (media, validation, gallery, thumbnail, quality, governance, analytics
engines) + additive migration + deterministic media population to 95%+ coverage + storefront image
activation + scale certification (10k/50k/100k) + tests + docs.
