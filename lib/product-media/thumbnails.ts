import { THUMBNAIL_DIMENSIONS, mediaUrl } from "./urls";
import { THUMBNAIL_VARIANTS, type ThumbnailVariant } from "./types";

/**
 * Thumbnail engine (Phase 5). Produces deterministic thumbnail URLs for every storefront surface
 * (storefront / search / card / category / admin). Readiness structures only — no binary resizing.
 */
export function buildThumbnails(productId: string): Record<ThumbnailVariant, string> {
  const thumbnails = {} as Record<ThumbnailVariant, string>;
  for (const variant of THUMBNAIL_VARIANTS) {
    const dimensions = THUMBNAIL_DIMENSIONS[variant];
    thumbnails[variant] = mediaUrl(`${productId}-thumb-${variant.toLowerCase()}`, dimensions.width, dimensions.height);
  }
  return thumbnails;
}

export function thumbnailFor(productId: string, variant: ThumbnailVariant): string {
  const dimensions = THUMBNAIL_DIMENSIONS[variant];
  return mediaUrl(`${productId}-thumb-${variant.toLowerCase()}`, dimensions.width, dimensions.height);
}
