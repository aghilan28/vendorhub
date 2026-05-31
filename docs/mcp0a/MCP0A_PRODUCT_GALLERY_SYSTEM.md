# MCP-0A.5 — Product Gallery System

Component: `components/commerce/product-gallery.tsx`; builder
`lib/media/gallery.ts`; wired into `app/(buyer)/product/[slug]/page.tsx`.

## Delivered
| Capability | Status |
|------------|--------|
| Primary image | ✅ primary-first ordering (`orderImages`) |
| Secondary images | ✅ real multi-image (no more repeated single image) |
| Gallery ordering | ✅ primary then `sort_order` |
| Hover preview | ✅ scale-on-hover |
| Zoom | ✅ click-to-zoom in lightbox |
| Lightbox / Fullscreen | ✅ modal with prev/next, counter |
| Thumbnail navigation | ✅ thumbnail strip, active state |
| Keyboard nav | ✅ Esc/Arrow keys in lightbox |
| Mobile gallery | ✅ responsive grid + arrows |
| Image fallback | ✅ `SafeImage` onError → "Image unavailable" |
| Broken-image recovery | ✅ per-image error state |
| Empty state | ✅ honest "No product images yet" (no fabrication) |
| Video support | architecture present (`MediaKind`/`kind`); renderer is a follow-up |
| 360° media | architecture present (`image_360` kind); renderer is a follow-up |

## The fix
Replaces the prior `[imageUrl, imageUrl, imageUrl, imageUrl]` fake gallery with a
real gallery built from `product_images` rows, with URLs resolved through the
storage layer and thumbnails derived per image.
