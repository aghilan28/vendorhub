# PP5_MEDIA_ARCHITECTURE

**Program:** VendorHub Product Population — Wave 1 (PP-5)
**Deliverable:** Media Population, Image Intelligence & Visualization (`lib/product-media/`)
**Status:** Built, validated, certified. PP-1/2/3/4 records untouched.

## 1. Media flow (Phase 1)

```
Product (PP-4) -> Primary Image -> Gallery (secondary/packaging/brand/lifestyle) -> Thumbnails -> Brand/Category assets
```

Storefront surfaces (`product-card`, grids, detail, search) render `product.imageUrl` via `next/image`.
PP-5 deterministic media URLs use an allowlisted host (`picsum.photos`, added to `next.config` image
remotePatterns), so images render and the build validates.

## 2. Module map (`lib/product-media/`)

| Module | Responsibility |
|---|---|
| `types.ts` | Media asset / set / thumbnail / validation / governance / analytics types |
| `urls.ts` | Deterministic media URLs, checksums, thumbnail dimensions, format/URL helpers |
| `asset.ts` | Deterministic media-asset factory (URL, checksum, dimensions, aspect ratio) |
| `thumbnails.ts` | Thumbnail engine — storefront/search/card/category/admin variants (Phase 5) |
| `gallery.ts` | Gallery engine — primary/secondary/packaging/brand/lifestyle + unlimited expansion (Phase 6) |
| `generator.ts` | Media engine — `assignMedia`, `buildMediaForUniverse`, coverage (Phase 3) |
| `validation.ts` | Validation engine — broken/missing/format/dimension/duplicate/placeholder/low-quality (Phase 4) |
| `quality.ts` | Quality engine — media health per product/brand/category/marketplace (Phase 7) |
| `governance.ts` | Governance engine — approve/reject/archive/restore/replace/version/moderate + audit + approval (Phase 9) |
| `analytics.ts` | Analytics engine — coverage/missing/brand/category/marketplace/defects/readiness (Phase 10) |
| `certification.ts` | Scale certification 10k/50k/100k (Phase 12) |
| `storefront.ts` | Media activation — enriches PP-4 storefront catalog with image URLs (Phase 8) |
| `index.ts` | Barrel |

## 3. Media model (Phase 2)

`MediaAsset` supports kinds PRIMARY / GALLERY / THUMBNAIL / PACKAGING / BRAND_ASSET / CATEGORY_ASSET
and future VIDEO / VIEW_360 / AR, with url, format, width, height, aspect ratio, alt, checksum,
status, version and sort order. `ProductMediaSet` bundles primary + gallery + thumbnails + coverage
score and integrates with the PP-3/PP-4 product master.

## 4. Determinism & reuse

Deterministic image URLs seeded by product id + role; checksums via PP-3 `stableHash`; injectable
clock. No `Date.now()`/`Math.random()`. PP-1/2/3 and PP-4 product records are consumed via imports
and never mutated — the storefront projection is enriched in PP-5 only.

## 5. Database (Phase 11)

`supabase/migrations/20260531030000_pp5_product_media.sql` (additive + idempotent): `product_media_assets`,
`product_media_gallery`, `product_media_thumbnails`, `product_media_quality`, `product_media_audit_log`,
`product_media_change_requests`; RLS enabled; reuses `set_updated_at`/`current_user_has_role`;
`product_media_integrity_check()` function. The pre-existing `catalog_product_images` table is untouched.
