import type { ProductEngine } from "@/lib/products";
import { MINIMUM_QUALITY_WIDTH } from "./urls";
import { THUMBNAIL_VARIANTS, type ProductMediaSet } from "./types";

export interface MediaQualityScore {
  productId: string;
  coverage: number;
  resolution: number;
  completeness: number;
  duplication: number;
  validation: number;
  readiness: number;
  health: number;
}

export interface MediaHealthReport {
  marketplaceHealth: number;
  averageCoverageScore: number;
  perBrand: { brandId: string; health: number; products: number }[];
  perCategory: { departmentId: string; health: number; products: number }[];
  worstProducts: MediaQualityScore[];
}

function scoreSet(set: ProductMediaSet, seenChecksums: Map<string, number>): MediaQualityScore {
  const coverage = set.primary ? 1 : 0;
  const resolution = set.gallery.length ? set.gallery.filter((a) => a.width >= MINIMUM_QUALITY_WIDTH).length / set.gallery.length : 0;
  const completeness = Number(((set.gallery.length >= 4 ? 1 : set.gallery.length / 4) * 0.5 + (Object.keys(set.thumbnails).length / THUMBNAIL_VARIANTS.length) * 0.5).toFixed(3));
  const duplication = set.gallery.every((a) => (seenChecksums.get(a.checksum) ?? 0) <= 1) ? 1 : 0;
  const validation = set.gallery.every((a) => a.width > 0 && a.height > 0 && /^https?:\/\//.test(a.url)) ? 1 : 0;
  const readiness = set.coverageScore;
  const health = Number((((coverage + resolution + completeness + duplication + validation + readiness) / 6) * 100).toFixed(2));
  return { productId: set.productId, coverage, resolution, completeness, duplication, validation, readiness, health };
}

/**
 * Media quality engine (Phase 7). Produces a media health score per product, brand, category and
 * marketplace-wide, combining coverage, resolution, completeness, duplication, validation and readiness.
 */
export function computeMediaQuality(sets: ProductMediaSet[], engine: ProductEngine): MediaHealthReport {
  const seenChecksums = new Map<string, number>();
  for (const set of sets) for (const asset of set.gallery) seenChecksums.set(asset.checksum, (seenChecksums.get(asset.checksum) ?? 0) + 1);

  const brandTotals = new Map<string, { sum: number; count: number }>();
  const deptTotals = new Map<string, { sum: number; count: number }>();
  const scores: MediaQualityScore[] = [];
  let healthSum = 0;
  let coverageScoreSum = 0;

  for (const set of sets) {
    const score = scoreSet(set, seenChecksums);
    scores.push(score);
    healthSum += score.health;
    coverageScoreSum += set.coverageScore;
    const product = engine.getProduct(set.productId);
    if (product?.brandId) {
      const entry = brandTotals.get(product.brandId) ?? { sum: 0, count: 0 };
      entry.sum += score.health;
      entry.count += 1;
      brandTotals.set(product.brandId, entry);
    }
    if (product) {
      const entry = deptTotals.get(product.departmentId) ?? { sum: 0, count: 0 };
      entry.sum += score.health;
      entry.count += 1;
      deptTotals.set(product.departmentId, entry);
    }
  }

  const total = sets.length || 1;
  return {
    marketplaceHealth: Number((healthSum / total).toFixed(2)),
    averageCoverageScore: Number((coverageScoreSum / total).toFixed(3)),
    perBrand: Array.from(brandTotals.entries())
      .map(([brandId, entry]) => ({ brandId, health: Number((entry.sum / entry.count).toFixed(2)), products: entry.count }))
      .sort((a, b) => (a.brandId < b.brandId ? -1 : 1))
      .slice(0, 50),
    perCategory: Array.from(deptTotals.entries())
      .map(([departmentId, entry]) => ({ departmentId, health: Number((entry.sum / entry.count).toFixed(2)), products: entry.count }))
      .sort((a, b) => (a.departmentId < b.departmentId ? -1 : 1)),
    worstProducts: scores.filter((s) => s.health < 100).slice(0, 10),
  };
}
