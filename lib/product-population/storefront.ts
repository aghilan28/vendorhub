import { buildCanonicalBrandEngine } from "@/lib/brands";
import { buildCanonicalTaxonomyEngine } from "@/lib/taxonomy";
import { projectToStorefront, type StorefrontCatalog } from "./discovery";
import { buildProductUniverse } from "./population";

/** Default number of products projected into the storefront fallback (display activation). */
export const STOREFRONT_DISPLAY_LIMIT = 600;

let cached: StorefrontCatalog | null = null;

/**
 * Builds the storefront display catalog (Phase 11 activation) from the populated universe. A bounded
 * display subset is projected into the storefront `Product`/`Category` shapes so the homepage,
 * category, product and search pages render real products even without a database. Cached per process.
 */
export function buildStorefrontCatalog(limit: number = STOREFRONT_DISPLAY_LIMIT): StorefrontCatalog {
  if (cached && limit === STOREFRONT_DISPLAY_LIMIT) return cached;
  const taxonomy = buildCanonicalTaxonomyEngine();
  const brands = buildCanonicalBrandEngine();
  const { engine } = buildProductUniverse({ brands, taxonomy, limit });
  const catalog = projectToStorefront(engine.products(), taxonomy, brands);
  if (limit === STOREFRONT_DISPLAY_LIMIT) cached = catalog;
  return catalog;
}
