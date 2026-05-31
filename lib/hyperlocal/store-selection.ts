// MCP-1C Phase 6 — Nearest Store Selection (deterministic, pure).
//
// Multi-factor store ranking: distance, inventory, rating, trust, delivery
// capacity, fulfillment health and price. Reuses lib/geo `distanceKm` and the
// serviceability engine.

import { distanceKm } from "@/lib/geo";
import { evaluateServiceability } from "./serviceability";
import type { Coordinates, RankedStore, StoreLocation, StoreSelection } from "./types";

export interface StoreSelectionWeights {
  distance: number;
  inventory: number;
  rating: number;
  trust: number;
  capacity: number;
  fulfillment: number;
  price: number;
}

export const DEFAULT_WEIGHTS: StoreSelectionWeights = {
  distance: 0.3,
  inventory: 0.2,
  rating: 0.1,
  trust: 0.12,
  capacity: 0.1,
  fulfillment: 0.13,
  price: 0.05,
};

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export interface StoreSelectionInput {
  stores: StoreLocation[];
  buyer: Coordinates | null;
  weights?: Partial<StoreSelectionWeights>;
  maxDistanceKm?: number;
}

/** Rank stores for a buyer; the best serviceable store is auto-selected. */
export function selectStore(input: StoreSelectionInput): StoreSelection {
  const weights = { ...DEFAULT_WEIGHTS, ...input.weights };
  const maxDistance = input.maxDistanceKm ?? 15;

  // price normalization baseline (lower is better)
  const prices = input.stores.map((s) => s.price ?? 0).filter((p) => p > 0);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;

  const ranked: RankedStore[] = input.stores
    .map((store) => {
      const distance = input.buyer ? distanceKm(input.buyer, store.coordinates) : null;
      const serviceability = evaluateServiceability({ store, buyer: input.buyer });

      const distanceFactor = distance === null ? 0.4 : clamp01(1 - distance / Math.max(1, maxDistance));
      const inventoryFactor = store.inStock === false ? 0 : 1;
      const ratingFactor = clamp01((store.rating ?? 0) / 5);
      const trustFactor = clamp01((store.trustScore ?? 0) / 100);
      const capacityFactor = store.capacityPerDay ? clamp01(1 - (store.ordersToday ?? 0) / store.capacityPerDay) : 0.6;
      const fulfillmentFactor = clamp01((store.fulfillmentRate ?? 90) / 100);
      const priceFactor = store.price && maxPrice > minPrice ? clamp01(1 - (store.price - minPrice) / (maxPrice - minPrice)) : 0.6;

      const factors = {
        distance: distanceFactor,
        inventory: inventoryFactor,
        rating: ratingFactor,
        trust: trustFactor,
        capacity: capacityFactor,
        fulfillment: fulfillmentFactor,
        price: priceFactor,
      };

      let raw =
        distanceFactor * weights.distance +
        inventoryFactor * weights.inventory +
        ratingFactor * weights.rating +
        trustFactor * weights.trust +
        capacityFactor * weights.capacity +
        fulfillmentFactor * weights.fulfillment +
        priceFactor * weights.price;

      // hard gates: not serviceable or out of stock heavily penalised
      if (!serviceability.canDeliver) raw *= 0.25;
      if (store.inStock === false) raw *= 0.2;

      return {
        storeId: store.storeId,
        name: store.name,
        distanceKm: distance,
        serviceability: serviceability.status,
        score: Math.round(raw * 100),
        factors,
      };
    })
    .sort((a, b) => b.score - a.score);

  const serviceable = ranked.filter((r) => r.serviceability === "serviceable" || r.serviceability === "limited").length;
  const best = ranked.find((r) => r.serviceability === "serviceable" || r.serviceability === "limited") ?? ranked[0] ?? null;

  return { best, ranked, evaluated: input.stores.length, serviceable };
}
