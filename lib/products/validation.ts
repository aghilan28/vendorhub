import { AttributeRegistry, type TaxonomyEngine } from "@/lib/taxonomy";
import type { BrandEngine } from "@/lib/brands";
import { resolveInheritance } from "./inheritance";
import type { ProductMaster, ProductValidationIssue, ProductValidationReport } from "./types";

export interface ProductValidationOptions {
  taxonomy?: TaxonomyEngine;
  brands?: BrandEngine;
  registry?: AttributeRegistry;
  lockedKeys?: string[];
}

/**
 * Deterministic product-ontology validator (Phase 12). Detects duplicate SKUs/barcodes/slugs, broken
 * variant trees, inheritance conflicts, orphan products, invalid taxonomy/brand mappings, missing
 * SKUs, and governance violations. Pure: identical input yields identical output.
 */
export function validateProducts(products: ProductMaster[], options: ProductValidationOptions = {}): ProductValidationReport {
  const registry = options.registry ?? new AttributeRegistry();
  const issues: ProductValidationIssue[] = [];

  const slugOwners = new Map<string, string[]>();
  const skuOwners = new Map<string, string[]>();
  const barcodeOwners = new Map<string, string[]>();
  const variantIds = new Map<string, number>();
  let variantCount = 0;
  let skuCount = 0;

  for (const product of products) {
    slugOwners.set(product.slug, [...(slugOwners.get(product.slug) ?? []), product.id]);

    // Orphan / mapping checks.
    if (!product.departmentId) {
      issues.push({ code: "ORPHAN_PRODUCT", severity: "error", entityId: product.id, message: `Product "${product.id}" has no department mapping.` });
    } else if (options.taxonomy) {
      const dept = options.taxonomy.getBySlug(product.departmentId) ?? options.taxonomy.getNode(product.departmentId);
      if (!dept || dept.level !== "DEPARTMENT") {
        issues.push({ code: "INVALID_TAXONOMY_MAPPING", severity: "error", entityId: product.id, message: `Product "${product.id}" maps to unknown department "${product.departmentId}".`, detail: { departmentId: product.departmentId } });
      }
      if (product.categoryId) {
        const cat = options.taxonomy.getBySlug(product.categoryId) ?? options.taxonomy.getNode(product.categoryId);
        if (!cat || cat.level !== "CATEGORY") {
          issues.push({ code: "INVALID_TAXONOMY_MAPPING", severity: "error", entityId: product.id, message: `Product "${product.id}" maps to unknown category "${product.categoryId}".`, detail: { categoryId: product.categoryId } });
        }
      }
    }
    if (product.brandId && options.brands && !options.brands.getBrand(product.brandId)) {
      issues.push({ code: "INVALID_BRAND_MAPPING", severity: "error", entityId: product.id, message: `Product "${product.id}" references unknown brand "${product.brandId}".`, detail: { brandId: product.brandId } });
    }

    // Governance consistency.
    if (product.status === "MERGED" && !product.mergedIntoId) {
      issues.push({ code: "GOVERNANCE_VIOLATION", severity: "error", entityId: product.id, message: `Product "${product.id}" is MERGED without mergedIntoId.` });
    }
    if (product.status === "ARCHIVED" && !product.deletedAt) {
      issues.push({ code: "GOVERNANCE_VIOLATION", severity: "warning", entityId: product.id, message: `Product "${product.id}" is ARCHIVED without deletedAt.` });
    }

    for (const variant of product.variants) {
      variantCount += 1;
      variantIds.set(variant.id, (variantIds.get(variant.id) ?? 0) + 1);

      if (variant.productId !== product.id) {
        issues.push({ code: "BROKEN_VARIANT_TREE", severity: "error", entityId: variant.id, message: `Variant "${variant.id}" points to "${variant.productId}" but is nested under "${product.id}".` });
      }
      if (!variant.internalSku) {
        issues.push({ code: "MISSING_VARIANT_SKU", severity: "error", entityId: variant.id, message: `Variant "${variant.id}" has no internal SKU.` });
      }

      for (const sku of [variant.internalSku, variant.identifiers.vendorSku, variant.identifiers.marketplaceSku, variant.identifiers.supplierSku]) {
        if (!sku) continue;
        skuCount += 1;
        skuOwners.set(sku, [...(skuOwners.get(sku) ?? []), variant.id]);
      }
      for (const barcode of [variant.identifiers.barcode, variant.identifiers.upc, variant.identifiers.ean, variant.identifiers.gtin]) {
        if (!barcode) continue;
        barcodeOwners.set(barcode, [...(barcodeOwners.get(barcode) ?? []), variant.id]);
      }

      // Inheritance conflicts (product + variant scope) against PP-1 attribute definitions.
      const { conflicts } = resolveInheritance(
        { product: product.attributes, variant: variant.attributes },
        { registry, lockedKeys: options.lockedKeys },
      );
      for (const conflict of conflicts) {
        issues.push({ code: "INHERITANCE_CONFLICT", severity: conflict.reason === "INVALID_ENUM_VALUE" ? "error" : "warning", entityId: variant.id, message: `Variant "${variant.id}" attribute "${conflict.key}" conflict: ${conflict.reason}.`, detail: { ...conflict } });
      }
    }
  }

  for (const [slug, owners] of slugOwners) {
    if (owners.length > 1) issues.push({ code: "DUPLICATE_PRODUCT_SLUG", severity: "error", entityId: owners[0], message: `Product slug "${slug}" shared by ${owners.length} products.`, detail: { slug, owners } });
  }
  for (const [id, count] of variantIds) {
    if (count > 1) issues.push({ code: "BROKEN_VARIANT_TREE", severity: "error", entityId: id, message: `Variant id "${id}" used ${count} times.`, detail: { count } });
  }
  for (const [sku, owners] of skuOwners) {
    if (new Set(owners).size > 1) issues.push({ code: "DUPLICATE_SKU", severity: "error", entityId: owners[0], message: `SKU "${sku}" used by ${new Set(owners).size} variants.`, detail: { sku, owners: Array.from(new Set(owners)) } });
  }
  for (const [barcode, owners] of barcodeOwners) {
    if (new Set(owners).size > 1) issues.push({ code: "DUPLICATE_BARCODE", severity: "error", entityId: owners[0], message: `Barcode "${barcode}" used by ${new Set(owners).size} variants.`, detail: { barcode, owners: Array.from(new Set(owners)) } });
  }

  const errorCount = issues.filter((issue) => issue.severity === "error").length;
  const warningCount = issues.filter((issue) => issue.severity === "warning").length;
  return { valid: errorCount === 0, checkedProducts: products.length, checkedVariants: variantCount, checkedSkus: skuCount, errorCount, warningCount, issues };
}
