# MCP-0A.4 — Seller Media Center

Route: `/seller/media` · Component: `features/media/components/seller-media-center.tsx`
Benchmarks: Amazon Seller Central, Shopify Media Manager.

## Capabilities (delivered)
- **Upload**: drag-and-drop or file browse, multi-select (`<input type="file" multiple>`).
- **Live validation**: each file checked against bucket policy (mime/size).
- **Live quality scoring**: image dimensions decoded in-browser → `scoreMediaQuality`
  → quality band + flags shown before publish.
- **Variant preview**: planned rendition count per image (`planVariants`).
- **Preview / Delete / Remove**: per-candidate thumbnails and removal.
- **Publish**: per-image or "Publish all valid" → `uploadProductMediaAction`
  (real Supabase Storage upload + `product_images` insert, primary auto-set).
- **Storage usage & media health**: selected count, total MB, average quality.
- **Bulk import planner**: paste a CSV manifest → batches/rows/images/errors preview.

## Capabilities mapped to backend
Replace/Reorder → `reorderProductMediaAction`; Delete → `deleteProductMediaAction`;
Crop/Rotate/Compress → planned worker transforms (variant plan emitted now).

## Graceful degradation
Client-side analysis (validation, quality, variant/bulk planning) works without
any backend. Publishing requires Supabase env; errors are surfaced inline per file.
