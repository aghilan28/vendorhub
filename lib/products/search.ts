import { normalizeCommerceText } from "@/lib/commerce-foundation";
import type { BrandEngine } from "@/lib/brands";
import type { ProductEngine } from "./engine";
import type { ProductMaster } from "./types";

export interface ProductSearchDocument {
  productId: string;
  name: string;
  slug: string;
  departmentId: string;
  brandId: string | null;
  brandName: string | null;
  tokens: string[];
  skus: string[];
  barcodes: string[];
  variantNames: string[];
  attributeKeys: string[];
  fuzzyReady: boolean;
  semanticReady: boolean;
  vectorReady: boolean;
}

export interface ProductSearchOptions {
  brands?: BrandEngine;
}

/**
 * Search-readiness projection (Phase 8). Produces product search documents (name + brand + variant
 * + attribute tokens) and SKU/barcode lookup surfaces. Builds search-ready structures; performs no
 * search.
 */
export function buildProductSearchIndex(engine: ProductEngine, options: ProductSearchOptions = {}): ProductSearchDocument[] {
  return engine.products().map((product) => {
    const brand = product.brandId && options.brands ? options.brands.getBrand(product.brandId) : undefined;
    const skus: string[] = [];
    const barcodes: string[] = [];
    const variantNames: string[] = [];
    for (const variant of product.variants) {
      variantNames.push(variant.name);
      for (const sku of [variant.internalSku, variant.identifiers.vendorSku, variant.identifiers.marketplaceSku, variant.identifiers.supplierSku]) {
        if (sku) skus.push(sku);
      }
      for (const barcode of [variant.identifiers.barcode, variant.identifiers.upc, variant.identifiers.ean, variant.identifiers.gtin]) {
        if (barcode) barcodes.push(barcode);
      }
    }
    const surfaceForms = [product.name, ...Object.values(product.localizedNames), brand?.name ?? "", ...variantNames].filter(Boolean);
    const tokens = Array.from(new Set(surfaceForms.flatMap((value) => normalizeCommerceText(value).split(" ")))).filter(Boolean).sort();

    return {
      productId: product.id,
      name: product.name,
      slug: product.slug,
      departmentId: product.departmentId,
      brandId: product.brandId,
      brandName: brand?.name ?? null,
      tokens,
      skus,
      barcodes,
      variantNames,
      attributeKeys: Object.keys(product.attributes).sort(),
      fuzzyReady: tokens.length > 0,
      semanticReady: tokens.length > 0,
      vectorReady: tokens.length > 0,
    };
  });
}

/** Resolves products discoverable via a free-text term (name / brand / variant tokens). */
export function productsForSearchTerm(engine: ProductEngine, term: string, options: ProductSearchOptions = {}): ProductMaster[] {
  const tokens = normalizeCommerceText(term).split(" ").filter(Boolean);
  if (!tokens.length) return [];
  const index = buildProductSearchIndex(engine, options);
  const matches: ProductMaster[] = [];
  for (const document of index) {
    if (tokens.every((token) => document.tokens.includes(token))) {
      const product = engine.getProduct(document.productId);
      if (product) matches.push(product);
    }
  }
  return matches;
}
