import type { CapabilityProfile, ProductCapability, StoreFormatType } from "./types";

/** Canonical PP-1 department slugs (used to compute restricted departments). */
export const ALL_DEPARTMENTS = [
  "groceries", "fresh-produce", "dairy", "bakery", "beverages", "snacks", "frozen-foods", "personal-care",
  "beauty", "health", "baby-care", "pet-care", "household", "cleaning", "kitchen", "electronics", "stationery",
  "pooja", "automotive", "sports", "fashion", "home-essentials", "medicine", "local-specialties",
  "regional-foods", "services",
];

const DAILY_NEEDS = new Set(["GROCERY", "SUPERMARKET", "HYPERMARKET", "PHARMACY", "BAKERY", "FRESH_PRODUCE", "MEAT", "FISH", "SWEETS", "HEALTH", "BABY_CARE"]);
const HYPERLOCAL = new Set(["GROCERY", "SUPERMARKET", "PHARMACY", "FRESH_PRODUCE", "BAKERY", "MEAT", "FISH"]);
const PERISHABLE = new Set(["FRESH_PRODUCE", "MEAT", "FISH", "BAKERY", "SWEETS"]);
const BULK = new Set(["SUPERMARKET", "HYPERMARKET", "HOUSEHOLD", "GROCERY", "STATIONERY", "ELECTRONICS"]);
const SUBSCRIPTION = new Set(["GROCERY", "SUPERMARKET", "PHARMACY", "HEALTH", "BABY_CARE", "PET_SUPPLIES"]);
const B2B = new Set(["HYPERMARKET", "ELECTRONICS", "HOUSEHOLD", "STATIONERY"]);

/**
 * Capability engine (Phase 3). Deterministically derives a store's commerce/operational capability
 * profile from its SP-1 store type and store-format type. Guarantees internal consistency
 * (instant/sameDay/hyperlocal always imply delivery) so validation never finds conflicts.
 */
export function capabilityProfileFor(storeType: string, formatType: StoreFormatType): CapabilityProfile {
  const isDarkOrHub = formatType === "DARK_STORE" || formatType === "MICRO_HUB";
  const isWarehouse = formatType === "WAREHOUSE" || formatType === "FULFILLMENT_CENTER";

  const sameDay = DAILY_NEEDS.has(storeType) || isDarkOrHub;
  const hyperlocal = HYPERLOCAL.has(storeType) || isDarkOrHub;
  const instantDelivery = (HYPERLOCAL.has(storeType) && sameDay) || isDarkOrHub;
  const delivery = true; // chains deliver; also enforced because instant/sameDay/hyperlocal imply it

  return {
    delivery,
    pickup: !isDarkOrHub && !isWarehouse,
    sameDay,
    instantDelivery,
    cod: !isWarehouse,
    returns: !PERISHABLE.has(storeType),
    refunds: !PERISHABLE.has(storeType),
    bulkOrders: BULK.has(storeType) || isWarehouse,
    subscription: SUBSCRIPTION.has(storeType),
    b2b: B2B.has(storeType) || isWarehouse,
    b2c: !isWarehouse,
    hyperlocal,
  };
}

const HEALTHCARE_TYPES = new Set(["PHARMACY", "HEALTH"]);
const FOOD_TYPES = new Set(["GROCERY", "SUPERMARKET", "HYPERMARKET", "BAKERY", "FRESH_PRODUCE", "MEAT", "FISH", "SWEETS", "DAIRY"]);

/**
 * Product capability model (Phase 4). Declares allowed/restricted departments and compliance
 * requirements for a store, e.g. a Pharmacy can sell medicine/health but not electronics/fashion and
 * must hold a drug licence.
 */
export function productCapabilityFor(storeType: string, allowedDepartments: string[]): ProductCapability {
  const allowed = new Set(allowedDepartments);
  const restrictedDepartments = ALL_DEPARTMENTS.filter((dept) => !allowed.has(dept));
  const compliance: string[] = [];
  if (HEALTHCARE_TYPES.has(storeType) || allowed.has("medicine")) {
    compliance.push("drug_license", "prescription_handling");
    if (storeType === "PHARMACY") compliance.push("schedule_h_compliance");
  }
  if (FOOD_TYPES.has(storeType) || allowed.has("groceries")) compliance.push("fssai");
  if (PERISHABLE.has(storeType)) compliance.push("cold_chain");
  return { allowedDepartments: [...allowedDepartments], restrictedDepartments, complianceRequirements: Array.from(new Set(compliance)) };
}
