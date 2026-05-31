import { formatFromUrl, mediaChecksum, mediaUrl } from "./urls";
import type { GalleryRole, MediaAsset, MediaKind } from "./types";

export interface AssetParams {
  productId: string;
  variantId?: string | null;
  kind: MediaKind;
  role?: GalleryRole | null;
  seed: string;
  width: number;
  height: number;
  alt: string;
  sortOrder: number;
  isPlaceholder?: boolean;
  now: string;
}

function gcdRatio(width: number, height: number): string {
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(width, height) || 1;
  return `${width / divisor}:${height / divisor}`;
}

/** Deterministically builds a media asset (URL, checksum, dimensions, aspect ratio). */
export function makeImageAsset(params: AssetParams): MediaAsset {
  const url = mediaUrl(params.seed, params.width, params.height);
  return {
    id: `media-${params.seed}`,
    productId: params.productId,
    variantId: params.variantId ?? null,
    kind: params.kind,
    role: params.role ?? null,
    url,
    format: formatFromUrl(url),
    width: params.width,
    height: params.height,
    aspectRatio: gcdRatio(params.width, params.height),
    alt: params.alt,
    checksum: mediaChecksum(url),
    isPlaceholder: params.isPlaceholder ?? false,
    status: "ACTIVE",
    version: 1,
    sortOrder: params.sortOrder,
    createdAt: params.now,
    updatedAt: params.now,
  };
}
