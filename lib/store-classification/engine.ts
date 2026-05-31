import { SellerNetworkEngine, type Store } from "@/lib/sellers";
import { createDeterministicClock, type Clock } from "@/lib/taxonomy";
import { capabilityProfileFor, productCapabilityFor } from "./capability";
import { categoryForStoreType, formatTypeForStore } from "./category";
import { fulfillmentProfileFor } from "./fulfillment";
import type { CapabilityFlag, StoreCategoryL1, StoreClassificationProfile, StoreFormatType } from "./types";

export interface ClassificationOptions {
  clock?: Clock;
}

/** Deterministically classifies a single store given its owning seller type. */
export function classifyStore(store: Store, sellerType: string, now: string): StoreClassificationProfile {
  const category = categoryForStoreType(store.storeType);
  const formatType = formatTypeForStore(store.id, sellerType);
  const capabilities = capabilityProfileFor(store.storeType, formatType);
  return {
    storeId: store.id,
    sellerId: store.sellerId,
    categoryL1: category.l1,
    categoryL2: category.l2,
    formatType,
    capabilities,
    productCapability: productCapabilityFor(store.storeType, store.departments),
    fulfillment: fulfillmentProfileFor(formatType, capabilities.hyperlocal),
    createdAt: now,
    updatedAt: now,
    version: 1,
  };
}

/** Indexed store-classification view built over an SP-1 seller network. */
export class StoreClassificationEngine {
  private readonly byStore = new Map<string, StoreClassificationProfile>();
  private readonly byL1 = new Map<StoreCategoryL1, string[]>();
  private readonly byL2 = new Map<string, string[]>();
  private readonly byFormat = new Map<StoreFormatType, string[]>();
  private readonly byCapability = new Map<CapabilityFlag, string[]>();
  private readonly profilesList: StoreClassificationProfile[];

  constructor(profiles: StoreClassificationProfile[]) {
    this.profilesList = [...profiles].sort((a, b) => (a.storeId < b.storeId ? -1 : a.storeId > b.storeId ? 1 : 0));
    for (const profile of this.profilesList) {
      this.byStore.set(profile.storeId, profile);
      this.push(this.byL1, profile.categoryL1, profile.storeId);
      this.push(this.byL2, profile.categoryL2, profile.storeId);
      this.push(this.byFormat, profile.formatType, profile.storeId);
      for (const [flag, enabled] of Object.entries(profile.capabilities)) {
        if (enabled) this.push(this.byCapability, flag as CapabilityFlag, profile.storeId);
      }
    }
  }

  static fromNetwork(network: SellerNetworkEngine, options: ClassificationOptions = {}): StoreClassificationEngine {
    const clock = options.clock ?? createDeterministicClock();
    const profiles = network.stores().map((store) => {
      const seller = network.getSeller(store.sellerId);
      return classifyStore(store, seller?.sellerType ?? "INDEPENDENT", clock());
    });
    return new StoreClassificationEngine(profiles);
  }

  private push<K>(map: Map<K, string[]>, key: K, value: string): void {
    const bucket = map.get(key) ?? [];
    bucket.push(value);
    map.set(key, bucket);
  }

  get size(): number {
    return this.profilesList.length;
  }

  profiles(): StoreClassificationProfile[] {
    return [...this.profilesList];
  }

  getProfile(storeId: string): StoreClassificationProfile | undefined {
    return this.byStore.get(storeId);
  }

  getByCategoryL1(l1: StoreCategoryL1): StoreClassificationProfile[] {
    return (this.byL1.get(l1) ?? []).map((id) => this.byStore.get(id) as StoreClassificationProfile);
  }

  getByCategoryL2(l2: string): StoreClassificationProfile[] {
    return (this.byL2.get(l2) ?? []).map((id) => this.byStore.get(id) as StoreClassificationProfile);
  }

  getByFormatType(formatType: StoreFormatType): StoreClassificationProfile[] {
    return (this.byFormat.get(formatType) ?? []).map((id) => this.byStore.get(id) as StoreClassificationProfile);
  }

  getByCapability(flag: CapabilityFlag): StoreClassificationProfile[] {
    return (this.byCapability.get(flag) ?? []).map((id) => this.byStore.get(id) as StoreClassificationProfile);
  }

  coverage(totalStores: number): { totalStores: number; classified: number; coveragePct: number; l1Covered: number; formatsCovered: number } {
    const classified = this.profilesList.length;
    return {
      totalStores,
      classified,
      coveragePct: totalStores ? Number(((classified / totalStores) * 100).toFixed(1)) : 0,
      l1Covered: this.byL1.size,
      formatsCovered: this.byFormat.size,
    };
  }

  stats(): { byL1: Record<string, number>; byFormat: Record<string, number>; byCapability: Record<string, number> } {
    const byL1: Record<string, number> = {};
    const byFormat: Record<string, number> = {};
    const byCapability: Record<string, number> = {};
    for (const [k, v] of this.byL1) byL1[k] = v.length;
    for (const [k, v] of this.byFormat) byFormat[k] = v.length;
    for (const [k, v] of this.byCapability) byCapability[k] = v.length;
    return { byL1, byFormat, byCapability };
  }
}
