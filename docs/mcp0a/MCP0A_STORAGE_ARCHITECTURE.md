# MCP-0A.3 — Supabase Storage Architecture

Source: `lib/media/storage.ts` (config + helpers) and
`supabase/migrations/20260531000000_mcp0a_media_platform.sql` (provisioning).

## Buckets (10)
| Bucket | Public | Max size | Retention | Purpose |
|--------|:------:|---------:|----------:|---------|
| product-images | yes | 15 MB | ∞ | Original seller product images |
| product-thumbnails | yes | 2 MB | ∞ | Generated thumbnails |
| product-webp | yes | 8 MB | ∞ | Optimised webp/avif renditions |
| brand-assets | yes | 8 MB | ∞ | Brand logos |
| store-assets | yes | 12 MB | ∞ | Store banners |
| category-assets | yes | 8 MB | ∞ | Category hero imagery |
| marketing-assets | yes | 20 MB | ∞ | Campaign media |
| temp-uploads | no | 25 MB | 2 days | Pre-processing staging |
| moderation-review | no | 25 MB | 30 days | Awaiting moderation |
| archive | no | 25 MB | 365 days | Soft-deleted / superseded |

## Path convention
`vendors/{vendorId}/products/{productId}/{assetId}.{ext}` (deterministic via
`productImagePath`). Variants: `{base}__{purpose}.{ext}` (via `variantPath`).

## URL resolution
`buildPublicUrl(bucket, pathOrUrl)`:
- absolute URL → returned unchanged (seeded/external images keep working);
- bare path + configured origin → `${SUPABASE_URL}/storage/v1/object/public/{bucket}/{path}`;
- bare path + no origin → `null` (caller renders a graceful fallback).
`resolveProductImageUrl` defaults to the product-images bucket and is used by the
product mapper — fixing the prior raw-`storage_path` bug.

## Policies / RLS (migration)
- Public read on the seven public buckets.
- Authenticated insert to product/store/brand buckets + temp.
- Owner-only update/delete (`owner = auth.uid()`).
- Media tables RLS: public read of `active` assets; owner full control; admin via
  existing role helpers.

## next.config
Supabase storage host (and `*.supabase.co/.in`) added to `images.remotePatterns`
with `/storage/v1/object/public/**`, so stored images render via `next/image`.
