// MCP-0C — Seller Operating System engine (public surface)

export * from "./types";
export * from "./store";
export * from "./inventory";
export * from "./pricing";
export * from "./orders";
export * from "./promotions";
export * from "./customers";
export * from "./analytics";
export * from "./workflow";
export * from "./intelligence";
export { SAMPLE_SELLER_INPUT } from "./sample";

import { computeAnalytics } from "./analytics";
import { computeCustomers } from "./customers";
import { computeInventory } from "./inventory";
import { computeOrderOps } from "./orders";
import { computePricing } from "./pricing";
import { computeStoreHealth } from "./store";
import { assembleSellerIntelligence } from "./intelligence";
import type { SellerOperatingInput, SellerOsSnapshot } from "./types";

/**
 * Assembles the full Seller OS snapshot from a live operating input.
 * `externalHealthScore` lets callers fold in the merchant-intelligence health.
 */
export function buildSellerOs(input: SellerOperatingInput, externalHealthScore?: number): SellerOsSnapshot {
  const store = computeStoreHealth(input);
  const inventory = computeInventory(input);
  const pricing = computePricing(input);
  const orders = computeOrderOps(input);
  const customers = computeCustomers(input);
  const analytics = computeAnalytics(input);
  const intelligence = assembleSellerIntelligence({
    input,
    store,
    inventory,
    pricing,
    orders,
    analytics,
    customers,
    externalHealthScore,
  });

  return { store, inventory, pricing, orders, customers, analytics, intelligence };
}
