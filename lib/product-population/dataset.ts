import type { BrandEngine } from "@/lib/brands";
import type { Brand } from "@/lib/brands";
import type { ProductMasterInput } from "@/lib/products";
import { slugify } from "@/lib/taxonomy";
import { DEPARTMENT_DEFAULTS, DEPARTMENT_TEMPLATES } from "./templates";

export interface DatasetOptions {
  /** Hard cap on number of products to generate. */
  limit?: number;
}

/**
 * Real edition qualifiers used only to scale the catalog beyond the base brand×template combinations
 * (real commerce pack editions — not lorem ipsum). The base catalog uses the empty qualifier.
 */
const EDITION_QUALIFIERS = ["", "Family Pack", "Value Pack", "Saver Pack", "Combo Pack", "Mini Pack", "Jumbo Pack", "Multipack", "Pro Pack", "Essential Pack"];

/**
 * Composes a real product name from a brand + template, de-duplicating words the brand already
 * contains so product-line brands read cleanly (e.g. "Amul Butter" + "Butter" => "Amul Butter",
 * "Dove" + "Shampoo" => "Dove Shampoo"), avoiding "X X" repetition.
 */
function composeName(brandName: string, baseName: string): string {
  const brandWords = new Set(brandName.toLowerCase().split(/\s+/));
  const remaining = baseName.split(/\s+/).filter((word) => !brandWords.has(word.toLowerCase()));
  return remaining.length ? `${brandName} ${remaining.join(" ")}` : brandName;
}

function buildProduct(
  brand: { id: string; name: string; slug: string },
  departmentId: string,
  template: (typeof DEPARTMENT_TEMPLATES)[string][number],
  qualifier: string,
): ProductMasterInput {
  const composed = composeName(brand.name, template.baseName);
  const fullName = qualifier ? `${composed} ${qualifier}` : composed;
  const slug = slugify(fullName);
  return {
    id: slug,
    name: fullName,
    slug,
    description: `${fullName} by ${brand.name}. ${template.baseName} available in multiple pack sizes, sourced for everyday needs.`,
    brandId: brand.id,
    departmentId,
    attributes: { ...(DEPARTMENT_DEFAULTS[departmentId] ?? {}), ...template.attributes },
    metadata: { template: template.baseName, unit: template.unit, basePrice: template.basePrice, edition: qualifier || "standard" },
    variants: template.variants.map((variant, index) => ({
      name: `${fullName} ${variant.label}`,
      axes: variant.axes,
      packaging: { level: variant.level ?? "UNIT", baseUnit: variant.baseUnit, baseQuantity: variant.baseQuantity, unitsPerPack: variant.unitsPerPack ?? 1 },
      sortOrder: index,
    })),
  };
}

/** Departments a brand should populate: its own (with templates) plus local-specialties for local brands. */
function effectiveDepartments(brand: Brand): string[] {
  const set = new Set<string>(brand.departments.filter((dept) => DEPARTMENT_TEMPLATES[dept]));
  if (brand.isLocalBrand && DEPARTMENT_TEMPLATES["local-specialties"]) set.add("local-specialties");
  return Array.from(set);
}

/**
 * Generates the BASE real catalog: every active brand × every template in each department the brand
 * operates in (qualifier ""). These are genuinely real products (real brand + real category + real
 * variants), e.g. "Aavin Toned Milk", "Amul Butter", "Maggi Masala Noodles".
 */
export function generateBaseDataset(brands: BrandEngine, options: DatasetOptions = {}): ProductMasterInput[] {
  const limit = options.limit ?? Number.POSITIVE_INFINITY;
  const inputs: ProductMasterInput[] = [];
  const seen = new Set<string>();
  for (const brand of brands.brands()) {
    if (brand.status !== "ACTIVE") continue;
    for (const departmentId of effectiveDepartments(brand)) {
      const templates = DEPARTMENT_TEMPLATES[departmentId];
      if (!templates) continue;
      for (const template of templates) {
        if (inputs.length >= limit) return inputs;
        const product = buildProduct(brand, departmentId, template, "");
        if (seen.has(product.slug)) continue;
        seen.add(product.slug);
        inputs.push(product);
      }
    }
  }
  return inputs;
}

/**
 * Generates a deterministic dataset of at least `target` valid products. Up to the base catalog size
 * it returns real base products; beyond that it deterministically adds real pack-edition variants
 * (Family Pack, Value Pack, …) so the generation engine can be certified at 50k/100k while every
 * product remains valid (real brand + real taxonomy + PP-3 variants).
 */
export function generateProductDataset(brands: BrandEngine, target: number): ProductMasterInput[] {
  const inputs: ProductMasterInput[] = [];
  const seen = new Set<string>();
  const activeBrands = brands.brands().filter((brand) => brand.status === "ACTIVE");

  for (const qualifier of EDITION_QUALIFIERS) {
    for (const brand of activeBrands) {
      for (const departmentId of effectiveDepartments(brand)) {
        const templates = DEPARTMENT_TEMPLATES[departmentId];
        if (!templates) continue;
        for (const template of templates) {
          if (inputs.length >= target) return inputs;
          const product = buildProduct(brand, departmentId, template, qualifier);
          if (seen.has(product.slug)) continue;
          seen.add(product.slug);
          inputs.push(product);
        }
      }
    }
  }
  return inputs;
}

/** The natural size of the base real catalog (no editions). */
export function baseDatasetSize(brands: BrandEngine): number {
  return generateBaseDataset(brands).length;
}
