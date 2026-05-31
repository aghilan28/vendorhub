import { buildProductSearchIndex, type ProductEngine } from "@/lib/products";
import type { BrandEngine } from "@/lib/brands";
import { TARGET_DEPARTMENTS } from "./templates";

export interface CoverageReport {
  /** Departments that have at least one product (Phase 3 — no empty department). */
  departmentsTargeted: number;
  departmentsCovered: number;
  emptyDepartments: string[];
  departmentCoveragePct: number;
  /** Brands that have at least one product. */
  brandsCovered: number;
  /** Every product is searchable (Phase 6 — 100% target). */
  searchableProducts: number;
  searchCoveragePct: number;
  /** Every product appears in at least one discovery feed (Phase 8 — 100% target). */
  discoverableProducts: number;
  discoveryCoveragePct: number;
}

/**
 * Coverage engine (Phases 3, 6, 8). Verifies department coverage, search coverage and discovery
 * coverage over the populated universe.
 */
export function computeCoverage(engine: ProductEngine, brands: BrandEngine, discoverableIds: Set<string>): CoverageReport {
  const departmentsWithProducts = new Set(engine.products().map((product) => product.departmentId));
  const emptyDepartments = TARGET_DEPARTMENTS.filter((dept) => !departmentsWithProducts.has(dept));

  const brandsCovered = new Set(engine.products().map((product) => product.brandId).filter(Boolean) as string[]).size;

  const searchIndex = buildProductSearchIndex(engine, { brands });
  const searchableProducts = searchIndex.filter((doc) => doc.tokens.length > 0 && doc.skus.length > 0).length;

  const total = engine.productCount || 1;
  const discoverableProducts = engine.products().filter((product) => discoverableIds.has(product.id)).length;

  return {
    departmentsTargeted: TARGET_DEPARTMENTS.length,
    departmentsCovered: departmentsWithProducts.size,
    emptyDepartments,
    departmentCoveragePct: Number(((TARGET_DEPARTMENTS.length - emptyDepartments.length) / TARGET_DEPARTMENTS.length * 100).toFixed(1)),
    brandsCovered,
    searchableProducts,
    searchCoveragePct: Number(((searchableProducts / total) * 100).toFixed(1)),
    discoverableProducts,
    discoveryCoveragePct: Number(((discoverableProducts / total) * 100).toFixed(1)),
  };
}
