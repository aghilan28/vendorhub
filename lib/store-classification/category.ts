import type { StoreCategoryL1, StoreFormatType } from "./types";

/** Level-1 → Level-2 store category hierarchy (Phase 1). Supports unlimited expansion. */
export const STORE_CATEGORY_HIERARCHY: Record<StoreCategoryL1, string[]> = {
  RETAIL: ["Supermarket", "Grocery", "Convenience", "Hypermarket", "Baby Care", "Department Store"],
  FOOD: ["Bakery", "Fresh Produce", "Meat", "Seafood", "Sweets", "Dairy"],
  HEALTHCARE: ["Pharmacy", "Medical Store", "Wellness Store"],
  ELECTRONICS: ["Consumer Electronics", "Mobile Store", "Computer Store"],
  FASHION: ["Clothing", "Footwear", "Jewelry"],
  HOME: ["Household", "Furniture", "Kitchen"],
  SERVICES: ["Home Services", "Repair"],
  SPECIALTY: ["Specialty Store", "Stationery", "Pooja", "Regional"],
  AUTOMOTIVE: ["Auto Parts", "Auto Services"],
  PET: ["Pet Supplies", "Pet Care"],
};

/** Maps an SP-1 store type to its canonical (Level-1, Level-2) category. */
export const STORE_TYPE_TO_CATEGORY: Record<string, { l1: StoreCategoryL1; l2: string }> = {
  GROCERY: { l1: "RETAIL", l2: "Grocery" },
  SUPERMARKET: { l1: "RETAIL", l2: "Supermarket" },
  HYPERMARKET: { l1: "RETAIL", l2: "Hypermarket" },
  PHARMACY: { l1: "HEALTHCARE", l2: "Pharmacy" },
  HEALTH: { l1: "HEALTHCARE", l2: "Wellness Store" },
  BAKERY: { l1: "FOOD", l2: "Bakery" },
  FRESH_PRODUCE: { l1: "FOOD", l2: "Fresh Produce" },
  MEAT: { l1: "FOOD", l2: "Meat" },
  FISH: { l1: "FOOD", l2: "Seafood" },
  SWEETS: { l1: "FOOD", l2: "Sweets" },
  BABY_CARE: { l1: "RETAIL", l2: "Baby Care" },
  ELECTRONICS: { l1: "ELECTRONICS", l2: "Consumer Electronics" },
  FASHION: { l1: "FASHION", l2: "Clothing" },
  HOUSEHOLD: { l1: "HOME", l2: "Household" },
  STATIONERY: { l1: "SPECIALTY", l2: "Stationery" },
  POOJA: { l1: "SPECIALTY", l2: "Pooja" },
  PET_SUPPLIES: { l1: "PET", l2: "Pet Supplies" },
  SPECIALTY: { l1: "SPECIALTY", l2: "Specialty Store" },
};

/** Resolves the category for an SP-1 store type (defaults to SPECIALTY for unknowns). */
export function categoryForStoreType(storeType: string): { l1: StoreCategoryL1; l2: string } {
  return STORE_TYPE_TO_CATEGORY[storeType] ?? { l1: "SPECIALTY", l2: "Specialty Store" };
}

function smallHash(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/**
 * Derives a store-format type (Phase 2) deterministically from the owning seller type, with a stable
 * hash-based distribution of operational formats (dark store, micro hub, warehouse, …) so the full
 * format taxonomy is represented.
 */
export function formatTypeForStore(storeId: string, sellerType: string): StoreFormatType {
  const hash = smallHash(storeId);
  if (hash % 19 === 0) return "DARK_STORE";
  if (hash % 23 === 0) return "MICRO_HUB";
  if (hash % 31 === 0) return "WAREHOUSE";
  if (hash % 37 === 0) return "FULFILLMENT_CENTER";
  if (hash % 13 === 0) return "HYBRID_STORE";
  if (hash % 41 === 0) return "FLAGSHIP";
  switch (sellerType) {
    case "ENTERPRISE":
      return "NATIONAL_CHAIN";
    case "CHAIN":
      return "REGIONAL_CHAIN";
    case "REGIONAL":
      return hash % 3 === 0 ? "LOCAL_CHAIN" : "REGIONAL_CHAIN";
    case "FRANCHISE":
      return "FRANCHISE";
    default:
      return "INDEPENDENT_STORE";
  }
}
