import type { BrandEngine } from "@/lib/brands";
import type { ProductEngine, ProductMaster } from "@/lib/products";
import type { TaxonomyEngine } from "@/lib/taxonomy";

export interface ProductQuality {
  productId: string;
  score: number;
  flags: string[];
}

export interface QualityReport {
  averageScore: number;
  attributeCompletenessPct: number;
  duplicateProducts: number;
  brokenBrandMappings: number;
  brokenTaxonomyMappings: number;
  missingAttributes: number;
  missingVariants: number;
  missingDescriptions: number;
  incompleteProducts: number;
  worstProducts: ProductQuality[];
}

const MIN_ATTRIBUTES = 3;

function scoreProduct(product: ProductMaster, brands: BrandEngine, taxonomy: TaxonomyEngine): ProductQuality {
  const flags: string[] = [];
  let score = 100;

  if (!product.description || product.description.length < 10) {
    flags.push("MISSING_DESCRIPTION");
    score -= 15;
  }
  if (product.variants.length === 0) {
    flags.push("MISSING_VARIANTS");
    score -= 25;
  }
  if (Object.keys(product.attributes).length < MIN_ATTRIBUTES) {
    flags.push("MISSING_ATTRIBUTES");
    score -= 20;
  }
  if (!product.brandId || !brands.getBrand(product.brandId)) {
    flags.push("BROKEN_BRAND_MAPPING");
    score -= 20;
  }
  const dept = taxonomy.getBySlug(product.departmentId) ?? taxonomy.getNode(product.departmentId);
  if (!dept || dept.level !== "DEPARTMENT") {
    flags.push("BROKEN_TAXONOMY_MAPPING");
    score -= 20;
  }
  if (product.variants.some((variant) => !variant.internalSku)) {
    flags.push("MISSING_SKU");
    score -= 10;
  }

  return { productId: product.id, score: Math.max(0, score), flags };
}

/**
 * Catalog quality engine (Phase 7). Detects duplicates, broken brand/taxonomy mappings, missing
 * attributes/variants/descriptions and incomplete products, and produces per-product + overall scores.
 */
export function computeQuality(engine: ProductEngine, brands: BrandEngine, taxonomy: TaxonomyEngine): QualityReport {
  const products = engine.products();
  const nameCounts = new Map<string, number>();
  for (const product of products) nameCounts.set(product.name, (nameCounts.get(product.name) ?? 0) + 1);

  let totalScore = 0;
  let attributeComplete = 0;
  let brokenBrand = 0;
  let brokenTaxonomy = 0;
  let missingAttributes = 0;
  let missingVariants = 0;
  let missingDescriptions = 0;
  let incomplete = 0;
  const scored: ProductQuality[] = [];

  for (const product of products) {
    const quality = scoreProduct(product, brands, taxonomy);
    scored.push(quality);
    totalScore += quality.score;
    if (!quality.flags.includes("MISSING_ATTRIBUTES")) attributeComplete += 1;
    if (quality.flags.includes("BROKEN_BRAND_MAPPING")) brokenBrand += 1;
    if (quality.flags.includes("BROKEN_TAXONOMY_MAPPING")) brokenTaxonomy += 1;
    if (quality.flags.includes("MISSING_ATTRIBUTES")) missingAttributes += 1;
    if (quality.flags.includes("MISSING_VARIANTS")) missingVariants += 1;
    if (quality.flags.includes("MISSING_DESCRIPTION")) missingDescriptions += 1;
    if (quality.flags.length > 0) incomplete += 1;
  }

  const duplicateProducts = Array.from(nameCounts.values()).filter((count) => count > 1).reduce((sum, count) => sum + (count - 1), 0);
  const total = products.length || 1;

  return {
    averageScore: Number((totalScore / total).toFixed(2)),
    attributeCompletenessPct: Number(((attributeComplete / total) * 100).toFixed(1)),
    duplicateProducts,
    brokenBrandMappings: brokenBrand,
    brokenTaxonomyMappings: brokenTaxonomy,
    missingAttributes,
    missingVariants,
    missingDescriptions,
    incompleteProducts: incomplete,
    worstProducts: scored.filter((q) => q.flags.length > 0).slice(0, 10),
  };
}
