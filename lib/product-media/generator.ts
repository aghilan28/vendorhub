import type { ProductEngine } from "@/lib/products";
import { createDeterministicClock, type Clock } from "@/lib/taxonomy";
import { buildGallery } from "./gallery";
import { buildThumbnails } from "./thumbnails";
import { THUMBNAIL_VARIANTS, type MediaAsset, type ProductMediaSet } from "./types";

export interface MediaInput {
  id: string;
  name?: string;
}

export interface MediaAssignmentOptions {
  clock?: Clock;
}

function coverageScore(primary: MediaAsset | undefined, gallery: MediaAsset[], thumbnails: Record<string, string>): number {
  let score = 0;
  if (primary) score += 0.4;
  if (gallery.length >= 4) score += 0.3;
  else score += (gallery.length / 4) * 0.3;
  const thumbCount = Object.values(thumbnails).filter(Boolean).length;
  score += (thumbCount / THUMBNAIL_VARIANTS.length) * 0.3;
  return Number(score.toFixed(3));
}

/**
 * Media engine (Phase 3). Deterministically assigns a full media set (primary + gallery + thumbnails)
 * to a product. Pure and reproducible.
 */
export function assignMedia(product: MediaInput, options: MediaAssignmentOptions = {}): ProductMediaSet {
  const now = (options.clock ?? createDeterministicClock())();
  const gallery = buildGallery(product.id, { productName: product.name, now });
  const thumbnails = buildThumbnails(product.id);
  const primary = gallery[0];
  return {
    productId: product.id,
    primary,
    gallery,
    thumbnails,
    coverageScore: coverageScore(primary, gallery, thumbnails),
  };
}

/** Assigns media to every product in the populated universe. */
export function buildMediaForUniverse(engine: ProductEngine, options: MediaAssignmentOptions = {}): ProductMediaSet[] {
  const clock = options.clock ?? createDeterministicClock();
  return engine.products().map((product) => assignMedia({ id: product.id, name: product.name }, { clock }));
}

export interface MediaCoverageReport {
  totalProducts: number;
  productsWithPrimary: number;
  productsWithGallery: number;
  productsWithThumbnails: number;
  totalAssets: number;
  coveragePct: number;
  averageCoverageScore: number;
}

/** Coverage report over a set of media (Phase 3 / Phase 10). */
export function computeMediaCoverage(sets: ProductMediaSet[]): MediaCoverageReport {
  let withPrimary = 0;
  let withGallery = 0;
  let withThumbnails = 0;
  let totalAssets = 0;
  let scoreSum = 0;
  for (const set of sets) {
    if (set.primary) withPrimary += 1;
    if (set.gallery.length >= 2) withGallery += 1;
    if (Object.keys(set.thumbnails).length === THUMBNAIL_VARIANTS.length) withThumbnails += 1;
    totalAssets += set.gallery.length;
    scoreSum += set.coverageScore;
  }
  const total = sets.length || 1;
  return {
    totalProducts: sets.length,
    productsWithPrimary: withPrimary,
    productsWithGallery: withGallery,
    productsWithThumbnails: withThumbnails,
    totalAssets,
    coveragePct: Number(((withPrimary / total) * 100).toFixed(1)),
    averageCoverageScore: Number((scoreSum / total).toFixed(3)),
  };
}
