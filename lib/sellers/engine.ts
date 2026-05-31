import { createDeterministicClock, slugify } from "@/lib/taxonomy";
import type { CommerceRegion } from "@/types/commerce-foundation";
import type {
  Clock,
  Seller,
  SellerInput,
  Store,
  StoreInput,
  StoreType,
} from "./types";

export interface SellerEngineOptions {
  clock?: Clock;
}

export function resolveSellers(inputs: SellerInput[], clock: Clock = createDeterministicClock()): Seller[] {
  return inputs.map((input) => {
    const slug = input.slug ?? slugify(input.name);
    const id = input.id ?? slug;
    const now = clock();
    return {
      id,
      name: input.name,
      slug,
      sellerType: input.sellerType ?? "INDEPENDENT",
      legalEntity: input.legalEntity ?? `${input.name} Retail Pvt Ltd`,
      businessType: input.businessType ?? "PRIVATE_LIMITED",
      verificationStatus: input.verificationStatus ?? "VERIFIED",
      taxId: input.taxId ?? `GSTIN-${slug.slice(0, 6).toUpperCase()}`,
      operationalStatus: input.operationalStatus ?? "ACTIVE",
      lifecycleStatus: input.lifecycleStatus ?? "ACTIVE",
      parentChainId: input.parentChainId ?? null,
      homeRegion: input.homeRegion ?? "TN",
      createdAt: now,
      updatedAt: now,
      metadata: { ...(input.metadata ?? {}) },
    };
  });
}

export function resolveStores(inputs: StoreInput[], clock: Clock = createDeterministicClock()): Store[] {
  return inputs.map((input) => {
    const slug = input.slug ?? slugify(input.name);
    const id = input.id ?? slug;
    const now = clock();
    return {
      id,
      name: input.name,
      slug,
      storeType: input.storeType,
      departments: [...(input.departments ?? [])],
      description: input.description ?? "",
      sellerId: input.sellerId,
      verificationStatus: input.verificationStatus ?? "VERIFIED",
      operationalStatus: input.operationalStatus ?? "ACTIVE",
      lifecycleStatus: input.lifecycleStatus ?? "ACTIVE",
      location: input.location,
      operatingHours: input.operatingHours ?? "08:00-22:00",
      createdAt: now,
      updatedAt: now,
      metadata: { ...(input.metadata ?? {}) },
    };
  });
}

/** Indexed view over the seller + store universe with ownership traversal. */
export class SellerNetworkEngine {
  private readonly sellersById = new Map<string, Seller>();
  private readonly sellersBySlug = new Map<string, string>();
  private readonly storesById = new Map<string, Store>();
  private readonly storesBySlug = new Map<string, string>();
  private readonly storesBySeller = new Map<string, string[]>();
  private readonly sellersByChain = new Map<string, string[]>();
  private readonly storesByType = new Map<StoreType, string[]>();
  private readonly storesByRegion = new Map<string, string[]>();
  private readonly storesByCity = new Map<string, string[]>();
  private readonly sellersList: Seller[];
  private readonly storesList: Store[];

  constructor(sellers: Seller[], stores: Store[]) {
    this.sellersList = [...sellers].sort((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));
    this.storesList = [...stores].sort((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));

    for (const seller of this.sellersList) {
      this.sellersById.set(seller.id, seller);
      this.sellersBySlug.set(seller.slug, seller.id);
      if (seller.parentChainId) {
        const bucket = this.sellersByChain.get(seller.parentChainId) ?? [];
        bucket.push(seller.id);
        this.sellersByChain.set(seller.parentChainId, bucket);
      }
    }
    for (const store of this.storesList) {
      this.storesById.set(store.id, store);
      this.storesBySlug.set(store.slug, store.id);
      this.pushTo(this.storesBySeller, store.sellerId, store.id);
      this.pushTo(this.storesByType, store.storeType, store.id);
      this.pushTo(this.storesByRegion, store.location.region, store.id);
      this.pushTo(this.storesByCity, store.location.city, store.id);
    }
  }

  static fromInputs(sellers: SellerInput[], stores: StoreInput[], options: SellerEngineOptions = {}): SellerNetworkEngine {
    const clock = options.clock ?? createDeterministicClock();
    return new SellerNetworkEngine(resolveSellers(sellers, clock), resolveStores(stores, clock));
  }

  private pushTo<K>(map: Map<K, string[]>, key: K, value: string): void {
    const bucket = map.get(key) ?? [];
    bucket.push(value);
    map.set(key, bucket);
  }

  get sellerCount(): number {
    return this.sellersList.length;
  }

  get storeCount(): number {
    return this.storesList.length;
  }

  sellers(): Seller[] {
    return [...this.sellersList];
  }

  stores(): Store[] {
    return [...this.storesList];
  }

  getSeller(id: string): Seller | undefined {
    return this.sellersById.get(id);
  }

  getSellerBySlug(slug: string): Seller | undefined {
    const id = this.sellersBySlug.get(slug);
    return id ? this.sellersById.get(id) : undefined;
  }

  getStore(id: string): Store | undefined {
    return this.storesById.get(id);
  }

  getStoreBySlug(slug: string): Store | undefined {
    const id = this.storesBySlug.get(slug);
    return id ? this.storesById.get(id) : undefined;
  }

  getStoresBySeller(sellerId: string): Store[] {
    return (this.storesBySeller.get(sellerId) ?? []).map((id) => this.storesById.get(id) as Store);
  }

  getSellersByChain(chainId: string): Seller[] {
    return (this.sellersByChain.get(chainId) ?? []).map((id) => this.sellersById.get(id) as Seller);
  }

  getStoresByType(type: StoreType): Store[] {
    return (this.storesByType.get(type) ?? []).map((id) => this.storesById.get(id) as Store);
  }

  getStoresByRegion(region: CommerceRegion): Store[] {
    return (this.storesByRegion.get(region) ?? []).map((id) => this.storesById.get(id) as Store);
  }

  getStoresByCity(city: string): Store[] {
    return (this.storesByCity.get(city) ?? []).map((id) => this.storesById.get(id) as Store);
  }

  stats(): {
    sellers: number;
    stores: number;
    storesByType: Record<string, number>;
    storesByRegion: Record<string, number>;
    sellersByType: Record<string, number>;
    averageStoresPerSeller: number;
  } {
    const storesByType: Record<string, number> = {};
    const storesByRegion: Record<string, number> = {};
    const sellersByType: Record<string, number> = {};
    for (const store of this.storesList) {
      storesByType[store.storeType] = (storesByType[store.storeType] ?? 0) + 1;
      storesByRegion[store.location.region] = (storesByRegion[store.location.region] ?? 0) + 1;
    }
    for (const seller of this.sellersList) {
      sellersByType[seller.sellerType] = (sellersByType[seller.sellerType] ?? 0) + 1;
    }
    return {
      sellers: this.sellersList.length,
      stores: this.storesList.length,
      storesByType,
      storesByRegion,
      sellersByType,
      averageStoresPerSeller: this.sellersList.length ? Number((this.storesList.length / this.sellersList.length).toFixed(2)) : 0,
    };
  }
}
