// MCP-1B Phase 6 — Variant System Expansion (deterministic, pure).
//
// Named variant sets (size/weight/color/pack/volume/material/brand/regional/
// custom) built on the MCP-0B variant engine, plus variant intelligence
// (recommend variant axes per category from its taxonomy variantAxes).

import { generateVariants, getCategory, validateVariants, type VariantAxis } from "@/lib/catalog";
import type { VariantBuildResult, VariantRecommendation, VariantSetDef } from "./types";

export const VARIANT_SETS: VariantSetDef[] = [
  { id: "apparel", label: "Apparel (Size × Color)", axes: ["size", "color"], description: "Clothing with size and colour options." },
  { id: "footwear", label: "Footwear (Size × Color)", axes: ["size", "color"], description: "Shoes with size and colour options." },
  { id: "grocery_pack", label: "Grocery (Weight × Pack)", axes: ["weight", "pack_size"], description: "Packaged goods by weight and pack size." },
  { id: "beverage", label: "Beverage (Volume × Pack)", axes: ["volume", "pack_size"], description: "Drinks by volume and pack size." },
  { id: "electronics", label: "Electronics (Storage × Color)", axes: ["storage", "color"], description: "Devices by storage and colour." },
  { id: "material", label: "Material variants", axes: ["material"], description: "Products differentiated by material." },
  { id: "style", label: "Style variants", axes: ["style", "color"], description: "Products by style and colour." },
];

export function getVariantSet(id: string): VariantSetDef | undefined {
  return VARIANT_SETS.find((s) => s.id === id);
}

/** Build a concrete variant set for a base product. */
export function buildVariantSet(input: {
  setId?: string;
  axes?: VariantAxis[];
  baseSku: string;
  baseName: string;
  basePrice: number;
}): VariantBuildResult {
  const set = input.setId ? getVariantSet(input.setId) : undefined;
  const axes = input.axes ?? set?.axes ?? [];
  const variants = generateVariants({ baseSku: input.baseSku, baseName: input.baseName, axes, basePrice: input.basePrice });
  const validation = validateVariants(variants);
  const uniqueSkus = new Set(variants.map((v) => v.sku)).size;
  return {
    setId: input.setId ?? "custom",
    axes,
    variants,
    count: variants.length,
    uniqueSkus,
    ok: validation.ok && uniqueSkus === variants.length,
    errors: validation.errors,
  };
}

/** Recommend variant axes for a category from its taxonomy definition. */
export function recommendVariantAxes(categorySlug: string): VariantRecommendation {
  const node = getCategory(categorySlug);
  const recommendedAxes = node?.variantAxes ?? [];
  return {
    categorySlug,
    recommendedAxes,
    reason: recommendedAxes.length
      ? `Category "${node?.name ?? categorySlug}" commonly varies by ${recommendedAxes.join(", ")}.`
      : "No standard variant axes for this category — single-SKU products are typical.",
  };
}

/** Variant gap: products in a variant-capable category that have no variants. */
export function variantGap(input: { categorySlug: string; productsInCategory: number; productsWithVariants: number }): {
  categorySlug: string;
  gap: number;
  recommendedAxes: VariantAxis[];
  opportunity: boolean;
} {
  const rec = recommendVariantAxes(input.categorySlug);
  const gap = Math.max(0, input.productsInCategory - input.productsWithVariants);
  return {
    categorySlug: input.categorySlug,
    gap,
    recommendedAxes: rec.recommendedAxes,
    opportunity: rec.recommendedAxes.length > 0 && gap > 0,
  };
}
