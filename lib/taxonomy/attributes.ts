import type { AttributeDefinition, TaxonomyNodeLevel } from "./types";

const ALL_LEVELS: TaxonomyNodeLevel[] = [
  "DEPARTMENT",
  "CATEGORY",
  "SUBCATEGORY",
  "PRODUCT_FAMILY",
  "PRODUCT_TYPE",
  "VARIANT_GROUP",
];

const FAMILY_DOWN: TaxonomyNodeLevel[] = ["PRODUCT_FAMILY", "PRODUCT_TYPE", "VARIANT_GROUP"];
const TYPE_DOWN: TaxonomyNodeLevel[] = ["PRODUCT_TYPE", "VARIANT_GROUP"];
// Classification attributes are commonly declared high in the tree (incl. department) so they can
// be inherited downward; their `appliesToLevels` therefore include the upper levels too.
const DEPARTMENT_DOWN_FAMILY: TaxonomyNodeLevel[] = ["DEPARTMENT", "CATEGORY", "SUBCATEGORY", "PRODUCT_FAMILY", "PRODUCT_TYPE", "VARIANT_GROUP"];
const DEPARTMENT_DOWN_TYPE: TaxonomyNodeLevel[] = ["DEPARTMENT", "CATEGORY", "SUBCATEGORY", "PRODUCT_FAMILY", "PRODUCT_TYPE"];

/**
 * Canonical, reusable attribute definitions (Phase 4). Each attribute is defined exactly once and
 * referenced by `key` from any number of taxonomy nodes — there is no per-node duplication of the
 * definition itself.
 */
export const CANONICAL_ATTRIBUTE_DEFINITIONS: AttributeDefinition[] = [
  { key: "weight", label: "Weight", dataType: "measure", unit: "g", appliesToLevels: FAMILY_DOWN, isFilterable: true, isSearchable: false, isVariantDefining: true, description: "Net weight of the variant." },
  { key: "volume", label: "Volume", dataType: "measure", unit: "ml", appliesToLevels: FAMILY_DOWN, isFilterable: true, isSearchable: false, isVariantDefining: true, description: "Net liquid volume of the variant." },
  { key: "pack_size", label: "Pack Size", dataType: "number", unit: "count", appliesToLevels: FAMILY_DOWN, isFilterable: true, isSearchable: false, isVariantDefining: true, description: "Number of units in a multi-pack." },
  { key: "material", label: "Material", dataType: "string", appliesToLevels: FAMILY_DOWN, isFilterable: true, isSearchable: true, isVariantDefining: false },
  { key: "flavor", label: "Flavor", dataType: "string", appliesToLevels: TYPE_DOWN, isFilterable: true, isSearchable: true, isVariantDefining: true },
  { key: "color", label: "Color", dataType: "string", appliesToLevels: TYPE_DOWN, isFilterable: true, isSearchable: true, isVariantDefining: true },
  { key: "gender", label: "Gender", dataType: "enum", allowedValues: ["men", "women", "unisex", "boys", "girls"], appliesToLevels: DEPARTMENT_DOWN_TYPE, isFilterable: true, isSearchable: true, isVariantDefining: false },
  { key: "age_group", label: "Age Group", dataType: "enum", allowedValues: ["infant", "toddler", "kids", "teen", "adult", "senior"], appliesToLevels: ["DEPARTMENT", "CATEGORY", "SUBCATEGORY", "PRODUCT_FAMILY"], isFilterable: true, isSearchable: true, isVariantDefining: false },
  { key: "organic", label: "Organic", dataType: "boolean", appliesToLevels: DEPARTMENT_DOWN_FAMILY, isFilterable: true, isSearchable: true, isVariantDefining: false },
  { key: "vegetarian", label: "Vegetarian", dataType: "enum", allowedValues: ["veg", "non-veg", "vegan", "egg"], appliesToLevels: DEPARTMENT_DOWN_TYPE, isFilterable: true, isSearchable: true, isVariantDefining: false },
  { key: "prescription_required", label: "Prescription Required", dataType: "boolean", appliesToLevels: ["DEPARTMENT", "CATEGORY", "SUBCATEGORY", "PRODUCT_FAMILY"], isFilterable: true, isSearchable: false, isVariantDefining: false },
  { key: "country_of_origin", label: "Country of Origin", dataType: "string", appliesToLevels: FAMILY_DOWN, isFilterable: true, isSearchable: true, isVariantDefining: false },
  { key: "storage_type", label: "Storage Type", dataType: "enum", allowedValues: ["ambient", "cool_ventilated", "refrigerated", "frozen", "iced_insulated"], appliesToLevels: DEPARTMENT_DOWN_TYPE, isFilterable: true, isSearchable: false, isVariantDefining: false },
  { key: "shelf_life", label: "Shelf Life", dataType: "measure", unit: "days", appliesToLevels: FAMILY_DOWN, isFilterable: true, isSearchable: false, isVariantDefining: false },
  { key: "brand_required", label: "Brand Required", dataType: "boolean", appliesToLevels: ALL_LEVELS, isFilterable: false, isSearchable: false, isVariantDefining: false },
];

/**
 * An immutable registry of attribute definitions keyed by `key`. Guarantees no duplicate keys and
 * provides level-aware lookups for validation and resolution.
 */
export class AttributeRegistry {
  private readonly byKey = new Map<string, AttributeDefinition>();

  constructor(definitions: AttributeDefinition[] = CANONICAL_ATTRIBUTE_DEFINITIONS) {
    for (const definition of definitions) {
      if (this.byKey.has(definition.key)) {
        throw new Error(`Duplicate attribute definition key: ${definition.key}`);
      }
      this.byKey.set(definition.key, definition);
    }
  }

  has(key: string): boolean {
    return this.byKey.has(key);
  }

  get(key: string): AttributeDefinition | undefined {
    return this.byKey.get(key);
  }

  all(): AttributeDefinition[] {
    return Array.from(this.byKey.values());
  }

  appliesTo(key: string, level: TaxonomyNodeLevel): boolean {
    const definition = this.byKey.get(key);
    return Boolean(definition && definition.appliesToLevels.includes(level));
  }

  /** Attribute keys flagged as variant-defining (used by the variant-group readiness checks). */
  variantDefiningKeys(): string[] {
    return this.all()
      .filter((definition) => definition.isVariantDefining)
      .map((definition) => definition.key);
  }
}
