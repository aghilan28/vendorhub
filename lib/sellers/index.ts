import { createDeterministicClock, type Clock } from "@/lib/taxonomy";
import { SellerNetworkEngine } from "./engine";
import { generateSellerUniverse, type SellerUniverseOptions } from "./canonical-sellers";

export * from "./types";
export { SellerNetworkEngine, resolveSellers, resolveStores } from "./engine";
export type { SellerEngineOptions } from "./engine";
export { StoreClassification, STORE_TYPE_DEPARTMENTS } from "./classification";
export type { StoreClassificationReport } from "./classification";
export { validateSellerNetwork } from "./validation";
export { StoreGovernance } from "./governance";
export type { StoreGovernanceOptions } from "./governance";
export { buildSellerSearchIndex, buildStoreSearchIndex, sellersForTerm, storesForTerm } from "./search";
export type { SellerSearchDocument, StoreSearchDocument } from "./search";
export { buildSellerAnalytics, SELLER_ANALYTICS_HOOKS } from "./analytics";
export type { SellerAnalyticsProjection, SellerAnalyticsHook } from "./analytics";
export { generateSyntheticSellerNetwork, certifySellerScaleTarget, runSellerScaleCertification } from "./scale";
export type { SellerScaleResult } from "./scale";
export { CANONICAL_CHAINS, REGION_CITIES, REGION_LABEL, generateSellerUniverse } from "./canonical-sellers";
export type { SellerUniverseOptions } from "./canonical-sellers";

/** Builds the canonical seller + store network engine from the real-chain universe. */
export function buildCanonicalSellerNetwork(options: { clock?: Clock } & SellerUniverseOptions = {}): SellerNetworkEngine {
  const { sellers, stores } = generateSellerUniverse(options);
  return SellerNetworkEngine.fromInputs(sellers, stores, { clock: options.clock ?? createDeterministicClock() });
}
