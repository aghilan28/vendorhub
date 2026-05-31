import { slugify } from "@/lib/taxonomy";
import { stableHash } from "@/lib/products";
import type { MediaFormat, ThumbnailVariant } from "./types";

/**
 * Deterministic media host. A placeholder image CDN that returns a real, stable image per seed, so
 * the storefront renders real visuals without binary uploads. Must be allowlisted in next.config
 * `images.remotePatterns` for `next/image`.
 */
export const MEDIA_HOST = "https://picsum.photos";

export const MINIMUM_QUALITY_WIDTH = 200;

/** Deterministic image URL for a given product/kind seed at the requested dimensions. */
export function mediaUrl(seed: string, width: number, height: number): string {
  return `${MEDIA_HOST}/seed/${slugify(seed)}/${width}/${height}`;
}

/** Deterministic checksum for an asset URL (duplicate detection). */
export function mediaChecksum(url: string): string {
  return stableHash(url);
}

export const THUMBNAIL_DIMENSIONS: Record<ThumbnailVariant, { width: number; height: number }> = {
  STOREFRONT: { width: 400, height: 400 },
  SEARCH: { width: 200, height: 200 },
  CARD: { width: 300, height: 300 },
  CATEGORY: { width: 240, height: 240 },
  ADMIN: { width: 80, height: 80 },
};

export function formatFromUrl(url: string): MediaFormat {
  if (url.endsWith(".png")) return "png";
  if (url.endsWith(".jpg") || url.endsWith(".jpeg")) return "jpg";
  if (url.endsWith(".svg")) return "svg";
  if (url.endsWith(".mp4")) return "mp4";
  if (url.endsWith(".glb")) return "glb";
  return "webp";
}

const URL_PATTERN = /^https?:\/\/[^\s]+$/i;

export function isWellFormedUrl(url: string): boolean {
  return URL_PATTERN.test(url);
}
