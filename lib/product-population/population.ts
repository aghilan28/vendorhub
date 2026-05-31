import type { BrandEngine } from "@/lib/brands";
import { ProductEngine } from "@/lib/products";
import { createDeterministicClock, type Clock, type TaxonomyEngine } from "@/lib/taxonomy";
import { generateBaseDataset, generateProductDataset } from "./dataset";

export interface ProductUniverse {
  engine: ProductEngine;
  brands: BrandEngine;
  taxonomy: TaxonomyEngine;
}

export interface BuildUniverseOptions {
  brands: BrandEngine;
  taxonomy: TaxonomyEngine;
  /** When set, generates at least this many products (with real pack editions beyond the base). */
  target?: number;
  /** Caps the base catalog (used for fast display builds). */
  limit?: number;
  clock?: Clock;
}

/** Builds the populated product universe as a PP-3 ProductEngine. */
export function buildProductUniverse(options: BuildUniverseOptions): ProductUniverse {
  const clock = options.clock ?? createDeterministicClock();
  const inputs = options.target
    ? generateProductDataset(options.brands, options.target)
    : generateBaseDataset(options.brands, { limit: options.limit });
  const engine = ProductEngine.fromInputs(inputs, { clock });
  return { engine, brands: options.brands, taxonomy: options.taxonomy };
}

export interface PopulationMetrics {
  totalProducts: number;
  totalVariants: number;
  totalSkus: number;
  averageVariantsPerProduct: number;
  departmentsCovered: number;
  brandsCovered: number;
  productsPerDepartment: Record<string, number>;
  topBrandsByProductCount: { brandId: string; products: number }[];
}

/** Computes population metrics (Phase 10 measurements). */
export function computePopulationMetrics(universe: ProductUniverse): PopulationMetrics {
  const { engine } = universe;
  const productsPerDepartment: Record<string, number> = {};
  const perBrand: Record<string, number> = {};
  let variants = 0;
  for (const product of engine.products()) {
    productsPerDepartment[product.departmentId] = (productsPerDepartment[product.departmentId] ?? 0) + 1;
    if (product.brandId) perBrand[product.brandId] = (perBrand[product.brandId] ?? 0) + 1;
    variants += product.variants.length;
  }
  const topBrandsByProductCount = Object.entries(perBrand)
    .map(([brandId, products]) => ({ brandId, products }))
    .sort((a, b) => b.products - a.products || (a.brandId < b.brandId ? -1 : 1))
    .slice(0, 10);

  return {
    totalProducts: engine.productCount,
    totalVariants: variants,
    totalSkus: engine.skuRegistrySize,
    averageVariantsPerProduct: engine.productCount ? Number((variants / engine.productCount).toFixed(2)) : 0,
    departmentsCovered: Object.keys(productsPerDepartment).length,
    brandsCovered: Object.keys(perBrand).length,
    productsPerDepartment,
    topBrandsByProductCount,
  };
}
