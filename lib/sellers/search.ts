import { normalizeCommerceText } from "@/lib/commerce-foundation";
import type { SellerNetworkEngine } from "./engine";
import type { Seller, Store } from "./types";

export interface SellerSearchDocument {
  sellerId: string;
  name: string;
  slug: string;
  sellerType: string;
  parentChainId: string | null;
  homeRegion: string;
  tokens: string[];
}

export interface StoreSearchDocument {
  storeId: string;
  name: string;
  slug: string;
  storeType: string;
  sellerId: string;
  city: string;
  region: string;
  tokens: string[];
}

/** Seller/store search-readiness projection (Phase 7). Builds tokens + lookups; no search UI. */
export function buildSellerSearchIndex(engine: SellerNetworkEngine): SellerSearchDocument[] {
  return engine.sellers().map((seller) => ({
    sellerId: seller.id,
    name: seller.name,
    slug: seller.slug,
    sellerType: seller.sellerType,
    parentChainId: seller.parentChainId,
    homeRegion: seller.homeRegion,
    tokens: Array.from(new Set(normalizeCommerceText(`${seller.name} ${seller.sellerType} ${seller.homeRegion}`).split(" "))).filter(Boolean).sort(),
  }));
}

export function buildStoreSearchIndex(engine: SellerNetworkEngine): StoreSearchDocument[] {
  return engine.stores().map((store) => ({
    storeId: store.id,
    name: store.name,
    slug: store.slug,
    storeType: store.storeType,
    sellerId: store.sellerId,
    city: store.location.city,
    region: store.location.region,
    tokens: Array.from(new Set(normalizeCommerceText(`${store.name} ${store.storeType} ${store.location.city} ${store.location.area} ${store.location.region}`).split(" "))).filter(Boolean).sort(),
  }));
}

export function sellersForTerm(engine: SellerNetworkEngine, term: string): Seller[] {
  const tokens = normalizeCommerceText(term).split(" ").filter(Boolean);
  if (!tokens.length) return [];
  return buildSellerSearchIndex(engine)
    .filter((doc) => tokens.every((token) => doc.tokens.includes(token)))
    .map((doc) => engine.getSeller(doc.sellerId))
    .filter((seller): seller is Seller => Boolean(seller));
}

export function storesForTerm(engine: SellerNetworkEngine, term: string): Store[] {
  const tokens = normalizeCommerceText(term).split(" ").filter(Boolean);
  if (!tokens.length) return [];
  return buildStoreSearchIndex(engine)
    .filter((doc) => tokens.every((token) => doc.tokens.includes(token)))
    .map((doc) => engine.getStore(doc.storeId))
    .filter((store): store is Store => Boolean(store));
}
