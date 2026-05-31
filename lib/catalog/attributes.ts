// MCP-0B — Attribute Engine (Section MCP-0B.3)
// Attribute registry + per-family templates + validation + inheritance.

import { getCategory } from "./taxonomy";
import type { AttributeDef } from "./types";

const A = (
  key: string,
  label: string,
  type: AttributeDef["type"],
  opts: Partial<AttributeDef> = {},
): AttributeDef => ({
  key,
  label,
  type,
  required: opts.required ?? false,
  unit: opts.unit,
  options: opts.options,
  filterable: opts.filterable ?? true,
  searchable: opts.searchable ?? false,
});

const BRAND = A("brand", "Brand", "text", { searchable: true });

/** Per-family attribute templates. Families come from the taxonomy `attrFamily`. */
export const ATTRIBUTE_TEMPLATES: Record<string, AttributeDef[]> = {
  groceries: [BRAND, A("weight", "Weight", "unit", { unit: "g", required: true }), A("expiry", "Best before", "text"), A("veg", "Vegetarian", "boolean")],
  fresh: [A("weight", "Weight", "unit", { unit: "g", required: true }), A("organic", "Organic", "boolean"), A("origin", "Origin", "text")],
  dairy: [BRAND, A("volume", "Volume", "unit", { unit: "ml", required: true }), A("fat", "Fat content", "text"), A("expiry", "Best before", "text")],
  bakery: [BRAND, A("weight", "Weight", "unit", { unit: "g" }), A("egg", "Contains egg", "boolean")],
  snacks: [BRAND, A("weight", "Weight", "unit", { unit: "g", required: true }), A("flavour", "Flavour", "text", { searchable: true })],
  beverages: [BRAND, A("volume", "Volume", "unit", { unit: "ml", required: true }), A("flavour", "Flavour", "text", { searchable: true })],
  household: [BRAND, A("volume", "Volume", "unit", { unit: "ml" }), A("type", "Type", "text")],
  personalcare: [BRAND, A("volume", "Volume", "unit", { unit: "ml" }), A("skin_type", "Skin type", "enum", { options: ["all", "oily", "dry", "sensitive"] })],
  health: [BRAND, A("form", "Form", "enum", { options: ["tablet", "capsule", "syrup", "powder"] }), A("quantity", "Quantity", "unit", { unit: "count" })],
  beauty: [BRAND, A("color", "Shade", "text", { searchable: true }), A("volume", "Volume", "unit", { unit: "ml" })],
  baby: [BRAND, A("size", "Size", "enum", { options: ["NB", "S", "M", "L", "XL"] }), A("count", "Count", "unit", { unit: "count" })],
  pet: [BRAND, A("weight", "Weight", "unit", { unit: "g" }), A("life_stage", "Life stage", "enum", { options: ["puppy", "adult", "senior"] })],
  electronics: [BRAND, A("color", "Color", "text", { searchable: true }), A("warranty", "Warranty", "text"), A("power", "Power", "unit", { unit: "W" })],
  mobiles: [BRAND, A("ram", "RAM", "unit", { unit: "GB", required: true }), A("storage", "Storage", "unit", { unit: "GB", required: true }), A("battery", "Battery", "unit", { unit: "mAh" }), A("display", "Display", "unit", { unit: "in" }), A("color", "Color", "text", { searchable: true })],
  computers: [BRAND, A("ram", "RAM", "unit", { unit: "GB", required: true }), A("storage", "Storage", "unit", { unit: "GB", required: true }), A("processor", "Processor", "text", { searchable: true }), A("os", "OS", "text")],
  accessories: [BRAND, A("color", "Color", "text", { searchable: true }), A("compatibility", "Compatibility", "text")],
  fashion: [BRAND, A("size", "Size", "enum", { required: true, options: ["XS", "S", "M", "L", "XL", "XXL"] }), A("color", "Color", "text", { required: true, searchable: true }), A("material", "Material", "text"), A("fit", "Fit", "enum", { options: ["slim", "regular", "loose"] })],
  footwear: [BRAND, A("size", "Size", "unit", { unit: "UK", required: true }), A("color", "Color", "text", { required: true, searchable: true }), A("material", "Material", "text")],
  home: [BRAND, A("color", "Color", "text", { searchable: true }), A("material", "Material", "text")],
  kitchen: [BRAND, A("material", "Material", "enum", { options: ["steel", "aluminium", "nonstick", "glass", "ceramic"] }), A("capacity", "Capacity", "unit", { unit: "L" })],
  furniture: [BRAND, A("material", "Material", "text"), A("color", "Color", "text", { searchable: true }), A("dimensions", "Dimensions", "text")],
  sports: [BRAND, A("size", "Size", "text"), A("color", "Color", "text", { searchable: true })],
  books: [A("author", "Author", "text", { required: true, searchable: true }), A("language", "Language", "text"), A("format", "Format", "enum", { options: ["paperback", "hardcover", "ebook"] })],
  automotive: [BRAND, A("compatibility", "Vehicle", "text", { searchable: true }), A("material", "Material", "text")],
  industrial: [BRAND, A("grade", "Grade", "text"), A("spec", "Specification", "text")],
  office: [BRAND, A("color", "Color", "text"), A("pack", "Pack size", "unit", { unit: "count" })],
  generic: [BRAND],
};

export function templateForFamily(family: string): AttributeDef[] {
  return ATTRIBUTE_TEMPLATES[family] ?? ATTRIBUTE_TEMPLATES.generic;
}

/** Resolves the attribute template for a category (with family inheritance). */
export function templateForCategory(categorySlug: string): AttributeDef[] {
  const node = getCategory(categorySlug);
  return templateForFamily(node?.attrFamily ?? "generic");
}

export interface AttributeValidation {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

/** Validates supplied attribute values against the category template. */
export function validateAttributes(
  categorySlug: string,
  values: Record<string, string | number | boolean> = {},
): AttributeValidation {
  const template = templateForCategory(categorySlug);
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const def of template) {
    const value = values[def.key];
    const present = value !== undefined && value !== null && value !== "";
    if (def.required && !present) {
      errors.push(`missing_required_attribute:${def.key}`);
      continue;
    }
    if (!present) continue;
    if (def.type === "number" || def.type === "unit") {
      if (Number.isNaN(Number(value))) errors.push(`invalid_number:${def.key}`);
    }
    if (def.type === "enum" && def.options && !def.options.includes(String(value))) {
      warnings.push(`unexpected_option:${def.key}`);
    }
  }
  return { ok: errors.length === 0, errors, warnings };
}

/** The filterable facets a category exposes (for search). */
export function filterableAttributes(categorySlug: string): AttributeDef[] {
  return templateForCategory(categorySlug).filter((a) => a.filterable);
}
