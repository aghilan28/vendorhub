// MCP-0A — Product Gallery builder
// Converts stored product_images rows into a renderable, ordered gallery,
// resolving storage paths to URLs and deriving thumbnail renditions.

import { resolveProductImageUrl, variantPath, buildPublicUrl } from "./storage";
import type { ProductGallery, ProductGalleryItem } from "./types";

export interface ProductImageRecord {
  storage_path: string;
  alt_text?: string | null;
  is_primary?: boolean | null;
  sort_order?: number | null;
  kind?: "image" | "video" | "image_360" | null;
}

/** Orders images: primary first, then by sort_order, then stable. */
export function orderImages(images: ProductImageRecord[]): ProductImageRecord[] {
  return [...images].sort((a, b) => {
    const primary = Number(Boolean(b.is_primary)) - Number(Boolean(a.is_primary));
    if (primary !== 0) return primary;
    return (a.sort_order ?? 0) - (b.sort_order ?? 0);
  });
}

function thumbFor(storagePath: string): string | null {
  // Prefer a generated webp thumbnail; fall back to the original URL.
  if (/^https?:\/\//i.test(storagePath)) return storagePath;
  const tPath = variantPath(storagePath, "thumbnail", "webp");
  return buildPublicUrl("product-thumbnails", tPath) ?? resolveProductImageUrl(storagePath);
}

/**
 * Builds a product gallery from image records. Returns an empty gallery (rather
 * than fabricating duplicates) when there are no images — fixing the audit's
 * "fake gallery" finding.
 */
export function buildProductGallery(
  productId: string,
  productName: string,
  images: ProductImageRecord[],
): ProductGallery {
  const ordered = orderImages(images ?? []);
  const items: ProductGalleryItem[] = ordered
    .map((image, index): ProductGalleryItem | null => {
      const url = resolveProductImageUrl(image.storage_path);
      if (!url) return null;
      return {
        url,
        thumbUrl: thumbFor(image.storage_path) ?? url,
        alt: image.alt_text || `${productName} image ${index + 1}`,
        kind: image.kind ?? "image",
        isPrimary: Boolean(image.is_primary) || index === 0,
      };
    })
    .filter((item): item is ProductGalleryItem => item !== null);

  return { productId, items };
}

/** Flat list of renderable gallery URLs (convenience for simple consumers). */
export function galleryUrls(gallery: ProductGallery): string[] {
  return gallery.items.map((item) => item.url);
}
