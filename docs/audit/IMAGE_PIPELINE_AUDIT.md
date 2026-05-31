# IMAGE PIPELINE AUDIT (Section 7)

**This is the single weakest core system.**

| Stage | State | Evidence |
|-------|-------|----------|
| Upload | ❌ Missing | 0 `type="file"` inputs in `app/features/components`; 0 `storage.from(` / `.upload(` calls anywhere |
| Storage | 🟡 Configured, unused | Buckets declared in `.env.example` (`product-images`, `vendor-assets`, `profile-images`); no code writes to them |
| Compression | ❌ Missing | none |
| Resizing | ❌ Missing | none |
| Variants (thumb/zoom) | ❌ Missing | product page **repeats one `imageUrl` 4×** to fake a gallery |
| Optimization | 🟡 Partial | `next/image` used, but `next.config.ts` `remotePatterns` allows **only `images.unsplash.com`** |
| CDN | 🟡 | Relies on next/image + (theoretical) Supabase CDN; not wired |
| Fallbacks | 🟡 | Renders nothing when `imageUrl` is absent |
| Moderation | 🧪 Schema only | `ai_image_analysis`, `product_image_audits`, `ai_moderation_reviews` tables exist; **no runtime image moderation code** |
| Gallery system | ❌ Missing | single-image repeat |

## Decisive evidence
- `lib/api/mappers/products.ts`: `imageUrl: image?.storage_path` — the raw
  `storage_path` is used **directly** as the image URL. There is **no
  storage-path → public/signed URL transform**.
- Because only `images.unsplash.com` is whitelisted in `next.config.ts`, any real
  uploaded Supabase storage URL would be **rejected by next/image**. Current
  images work only because seed data uses Unsplash URLs.

## Conclusion
A seller **cannot upload a product image through the application**, images are
not processed/resized/moderated, and the "gallery" is cosmetic. Every downstream
buyer surface that depends on imagery is therefore below industry-grade.

**Image Pipeline score: 1/10** (schema exists; runtime pipeline effectively absent).
