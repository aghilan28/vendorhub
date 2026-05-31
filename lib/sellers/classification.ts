import type { SellerNetworkEngine } from "./engine";
import { STORE_TYPES, type Store, type StoreType } from "./types";

/** Maps each store type to the PP-1 departments it primarily serves (search/analytics readiness). */
export const STORE_TYPE_DEPARTMENTS: Record<StoreType, string[]> = {
  GROCERY: ["groceries", "snacks", "beverages"],
  SUPERMARKET: ["groceries", "dairy", "snacks", "beverages", "household", "personal-care"],
  HYPERMARKET: ["groceries", "dairy", "household", "electronics", "fashion", "kitchen"],
  PHARMACY: ["medicine", "health", "personal-care", "baby-care"],
  BAKERY: ["bakery", "snacks"],
  FRESH_PRODUCE: ["fresh-produce"],
  MEAT: ["fresh-produce"],
  FISH: ["fresh-produce"],
  PET_SUPPLIES: ["pet-care"],
  ELECTRONICS: ["electronics"],
  FASHION: ["fashion"],
  HOUSEHOLD: ["household", "cleaning", "kitchen"],
  STATIONERY: ["stationery"],
  POOJA: ["pooja"],
  HEALTH: ["health", "personal-care"],
  BABY_CARE: ["baby-care"],
  SWEETS: ["snacks", "regional-foods"],
  SPECIALTY: ["local-specialties", "regional-foods"],
};

export interface StoreClassificationReport {
  totalStores: number;
  classifiedStores: number;
  unclassifiedStores: string[];
  typesCovered: number;
  storesByType: Record<string, number>;
}

/**
 * Store classification engine (Phase 5). Every store carries a `storeType`; this validates the
 * classification and provides type/department lookups and a coverage report.
 */
export class StoreClassification {
  private readonly byType = new Map<StoreType, string[]>();

  constructor(private readonly engine: SellerNetworkEngine) {
    for (const store of engine.stores()) {
      const bucket = this.byType.get(store.storeType) ?? [];
      bucket.push(store.id);
      this.byType.set(store.storeType, bucket);
    }
  }

  departmentsFor(store: Store): string[] {
    return STORE_TYPE_DEPARTMENTS[store.storeType] ?? [];
  }

  getStoresOfType(type: StoreType): Store[] {
    return (this.byType.get(type) ?? []).map((id) => this.engine.getStore(id) as Store);
  }

  unclassifiedStores(): Store[] {
    return this.engine.stores().filter((store) => !STORE_TYPES.includes(store.storeType));
  }

  report(): StoreClassificationReport {
    const stores = this.engine.stores();
    const storesByType: Record<string, number> = {};
    for (const store of stores) storesByType[store.storeType] = (storesByType[store.storeType] ?? 0) + 1;
    const unclassified = this.unclassifiedStores().map((store) => store.id);
    return {
      totalStores: stores.length,
      classifiedStores: stores.length - unclassified.length,
      unclassifiedStores: unclassified.slice(0, 50),
      typesCovered: this.byType.size,
      storesByType,
    };
  }
}
