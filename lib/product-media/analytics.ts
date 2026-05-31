import type { ProductEngine } from "@/lib/products";
import { computeMediaCoverage } from "./generator";
import { validateMediaSets } from "./validation";
import type { ProductMediaSet } from "./types";

export interface MediaAnalyticsReport {
  marketplaceCoveragePct: number;
  totalProducts: number;
  totalAssets: number;
  missingPrimary: string[];
  brandCoverage: { brandId: string; coveragePct: number; products: number }[];
  categoryCoverage: { departmentId: string; coveragePct: number; products: number }[];
  topDefects: { code: string; count: number }[];
  readiness: { storefrontReady: number; readinessPct: number };
}

/**
 * Media analytics engine (Phase 10). Produces coverage / missing-asset / brand / category /
 * marketplace reports, top defects and readiness from the media sets.
 */
export function computeMediaAnalytics(sets: ProductMediaSet[], engine: ProductEngine): MediaAnalyticsReport {
  const coverage = computeMediaCoverage(sets);
  const validation = validateMediaSets(sets);

  const brandAgg = new Map<string, { covered: number; total: number }>();
  const deptAgg = new Map<string, { covered: number; total: number }>();
  const missingPrimary: string[] = [];
  let storefrontReady = 0;

  for (const set of sets) {
    const hasPrimary = Boolean(set.primary);
    if (!hasPrimary) missingPrimary.push(set.productId);
    if (hasPrimary && Object.keys(set.thumbnails).length > 0) storefrontReady += 1;
    const product = engine.getProduct(set.productId);
    if (product?.brandId) {
      const entry = brandAgg.get(product.brandId) ?? { covered: 0, total: 0 };
      entry.total += 1;
      if (hasPrimary) entry.covered += 1;
      brandAgg.set(product.brandId, entry);
    }
    if (product) {
      const entry = deptAgg.get(product.departmentId) ?? { covered: 0, total: 0 };
      entry.total += 1;
      if (hasPrimary) entry.covered += 1;
      deptAgg.set(product.departmentId, entry);
    }
  }

  const defectCounts = new Map<string, number>();
  for (const issue of validation.issues) defectCounts.set(issue.code, (defectCounts.get(issue.code) ?? 0) + 1);

  const total = sets.length || 1;
  return {
    marketplaceCoveragePct: coverage.coveragePct,
    totalProducts: sets.length,
    totalAssets: coverage.totalAssets,
    missingPrimary: missingPrimary.slice(0, 50),
    brandCoverage: Array.from(brandAgg.entries())
      .map(([brandId, entry]) => ({ brandId, coveragePct: Number(((entry.covered / entry.total) * 100).toFixed(1)), products: entry.total }))
      .sort((a, b) => (a.brandId < b.brandId ? -1 : 1))
      .slice(0, 50),
    categoryCoverage: Array.from(deptAgg.entries())
      .map(([departmentId, entry]) => ({ departmentId, coveragePct: Number(((entry.covered / entry.total) * 100).toFixed(1)), products: entry.total }))
      .sort((a, b) => (a.departmentId < b.departmentId ? -1 : 1)),
    topDefects: Array.from(defectCounts.entries())
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count),
    readiness: { storefrontReady, readinessPct: Number(((storefrontReady / total) * 100).toFixed(1)) },
  };
}
