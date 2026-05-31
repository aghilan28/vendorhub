import type { ProductMasterInput } from "./types";

/**
 * A small ILLUSTRATIVE set of product masters demonstrating the ontology (incl. the directive's own
 * examples: Aavin Milk, Dove Shampoo). This is NOT product population / a mass dataset — it exists so
 * the model, variants, packaging and brand/taxonomy binding can be exercised by docs and tests.
 * Brand ids reference PP-2 brand slugs; department ids reference PP-1 taxonomy slugs.
 */
export const CANONICAL_SAMPLE_PRODUCTS: ProductMasterInput[] = [
  {
    id: "aavin-milk",
    name: "Aavin Milk",
    brandId: "aavin-milk",
    departmentId: "dairy",
    categoryId: "dairy-milk",
    attributes: { storage_type: "refrigerated", vegetarian: "veg", country_of_origin: "India" },
    variants: [
      { name: "Aavin Milk 500ml", axes: { volume: "500ml" }, packaging: { level: "UNIT", baseUnit: "ml", baseQuantity: 500, unitsPerPack: 1 }, identifiers: { ean: "8901234500015" } },
      { name: "Aavin Milk 1L", axes: { volume: "1l" }, packaging: { level: "UNIT", baseUnit: "ml", baseQuantity: 1000, unitsPerPack: 1 }, identifiers: { ean: "8901234500022" } },
      { name: "Aavin Milk 2L", axes: { volume: "2l" }, packaging: { level: "UNIT", baseUnit: "ml", baseQuantity: 2000, unitsPerPack: 1 }, identifiers: { ean: "8901234500039" } },
    ],
  },
  {
    id: "dove-shampoo",
    name: "Dove Shampoo",
    brandId: "dove",
    departmentId: "personal-care",
    categoryId: "personal-care-hair-care",
    attributes: { country_of_origin: "India" },
    variants: [
      { name: "Dove Shampoo 180ml", axes: { volume: "180ml" }, packaging: { level: "UNIT", baseUnit: "ml", baseQuantity: 180, unitsPerPack: 1 }, identifiers: { ean: "8901030700015" } },
      { name: "Dove Shampoo 340ml", axes: { volume: "340ml" }, packaging: { level: "UNIT", baseUnit: "ml", baseQuantity: 340, unitsPerPack: 1 }, identifiers: { ean: "8901030700022" } },
      { name: "Dove Shampoo 650ml", axes: { volume: "650ml" }, packaging: { level: "UNIT", baseUnit: "ml", baseQuantity: 650, unitsPerPack: 1 }, identifiers: { ean: "8901030700039" } },
    ],
  },
  {
    id: "amul-butter",
    name: "Amul Butter",
    brandId: "amul-butter",
    departmentId: "dairy",
    categoryId: "dairy-butter",
    attributes: { storage_type: "refrigerated", vegetarian: "veg" },
    variants: [
      { name: "Amul Butter 100g", axes: { weight: "100g" }, packaging: { level: "UNIT", baseUnit: "g", baseQuantity: 100, unitsPerPack: 1 } },
      { name: "Amul Butter 500g", axes: { weight: "500g" }, packaging: { level: "UNIT", baseUnit: "g", baseQuantity: 500, unitsPerPack: 1 } },
    ],
  },
  {
    id: "maggi-noodles",
    name: "Maggi Noodles",
    brandId: "maggi",
    departmentId: "groceries",
    attributes: { vegetarian: "veg" },
    variants: [
      { name: "Maggi 70g", axes: { weight: "70g" }, packaging: { level: "UNIT", baseUnit: "g", baseQuantity: 70, unitsPerPack: 1 } },
      { name: "Maggi 280g Multipack", axes: { weight: "70g", pack_size: 4 }, packaging: { level: "MULTIPACK", baseUnit: "g", baseQuantity: 70, unitsPerPack: 4 } },
    ],
  },
  {
    id: "boat-airdopes-141",
    name: "boAt Airdopes 141",
    brandId: "boat-airdopes",
    departmentId: "electronics",
    attributes: { country_of_origin: "India" },
    variants: [
      { name: "boAt Airdopes 141 Black", axes: { color: "black" }, packaging: { level: "BOX", baseUnit: "count", baseQuantity: 1, unitsPerPack: 1 }, identifiers: { gtin: "06942659400015" } },
      { name: "boAt Airdopes 141 White", axes: { color: "white" }, packaging: { level: "BOX", baseUnit: "count", baseQuantity: 1, unitsPerPack: 1 }, identifiers: { gtin: "06942659400022" } },
    ],
  },
  {
    id: "tata-salt-1kg",
    name: "Tata Salt",
    brandId: "tata-salt",
    departmentId: "groceries",
    attributes: { vegetarian: "veg" },
    variants: [{ name: "Tata Salt 1kg", axes: { weight: "1kg" }, packaging: { level: "UNIT", baseUnit: "g", baseQuantity: 1000, unitsPerPack: 1 } }],
  },
];
