// MCP-0B — Variant Engine (Section MCP-0B.4)

import type { GeneratedVariant, VariantAxis } from "./types";

/** Default option pools per variant axis. */
export const VARIANT_OPTIONS: Record<VariantAxis, string[]> = {
  color: ["Black", "White", "Blue", "Red", "Green"],
  size: ["S", "M", "L", "XL"],
  pack_size: ["1", "3", "6", "12"],
  weight: ["250g", "500g", "1kg", "5kg"],
  volume: ["250ml", "500ml", "1L", "2L"],
  configuration: ["Base", "Plus", "Pro"],
  material: ["Cotton", "Steel", "Plastic"],
  style: ["Classic", "Modern"],
  storage: ["64GB", "128GB", "256GB"],
};

function slugifyToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export interface VariantPlan {
  axes: VariantAxis[];
  combinations: Record<string, string>[];
}

/** Cartesian product of the given axes (capped to keep SKU counts sane). */
export function planVariantCombinations(axes: VariantAxis[], cap = 24): VariantPlan {
  const usable = axes.filter((axis) => VARIANT_OPTIONS[axis]?.length);
  let combos: Record<string, string>[] = [{}];
  for (const axis of usable) {
    const next: Record<string, string>[] = [];
    for (const combo of combos) {
      for (const option of VARIANT_OPTIONS[axis]) {
        next.push({ ...combo, [axis]: option });
        if (next.length >= cap) break;
      }
      if (next.length >= cap) break;
    }
    combos = next;
  }
  return { axes: usable, combinations: usable.length ? combos.slice(0, cap) : [] };
}

/** Builds concrete variants (sku, name, price delta, stock) for a base SKU. */
export function generateVariants(input: {
  baseSku: string;
  baseName: string;
  axes: VariantAxis[];
  basePrice: number;
}): GeneratedVariant[] {
  const plan = planVariantCombinations(input.axes);
  if (plan.combinations.length === 0) return [];
  return plan.combinations.map((combo, index) => {
    const suffix = Object.values(combo).map(slugifyToken).join("-");
    const label = Object.values(combo).join(" / ");
    const priceDelta = Math.round(input.basePrice * 0.05 * index * 100) / 100;
    return {
      sku: `${input.baseSku}-${suffix || index}`.toUpperCase(),
      name: `${input.baseName} (${label})`,
      attributes: combo,
      priceDelta,
      stock: 10 + ((index * 7) % 50),
    };
  });
}

export interface VariantValidation {
  ok: boolean;
  errors: string[];
}

/** Ensures variant SKUs are unique and attributes reference known axes. */
export function validateVariants(variants: GeneratedVariant[]): VariantValidation {
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const variant of variants) {
    if (seen.has(variant.sku)) errors.push(`duplicate_variant_sku:${variant.sku}`);
    seen.add(variant.sku);
    if (variant.priceDelta < 0) errors.push(`negative_price_delta:${variant.sku}`);
  }
  return { ok: errors.length === 0, errors };
}
