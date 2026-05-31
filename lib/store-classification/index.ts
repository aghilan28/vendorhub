import { buildCanonicalSellerNetwork } from "@/lib/sellers";
import { createDeterministicClock, type Clock } from "@/lib/taxonomy";
import { StoreClassificationEngine } from "./engine";

export * from "./types";
export { STORE_CATEGORY_HIERARCHY, STORE_TYPE_TO_CATEGORY, categoryForStoreType, formatTypeForStore } from "./category";
export { capabilityProfileFor, productCapabilityFor, ALL_DEPARTMENTS } from "./capability";
export { fulfillmentProfileFor } from "./fulfillment";
export { StoreClassificationEngine, classifyStore } from "./engine";
export type { ClassificationOptions } from "./engine";
export { validateClassification } from "./validation";
export type { ClassificationValidationOptions } from "./validation";
export { ClassificationGovernance } from "./governance";
export type { ClassificationGovernanceOptions } from "./governance";
export { buildClassificationSearchIndex, storesWithCapability, classificationForTerm } from "./search";
export type { ClassificationSearchDocument } from "./search";
export { storeSimilarity, storeAlternatives, buildRankingInputs } from "./recommendation";
export type { StoreRankingInput } from "./recommendation";
export { buildStoreIntelligenceProjection, STORE_INTELLIGENCE_HOOKS } from "./intelligence";
export type { StoreIntelligenceProjection, StoreIntelligenceHook } from "./intelligence";
export { certifyClassificationScaleTarget, runClassificationScaleCertification } from "./scale";
export type { ClassificationScaleResult } from "./scale";

/** Builds the canonical store-classification engine over the SP-1 seller network. */
export function buildCanonicalStoreClassification(options: { clock?: Clock } = {}): {
  network: ReturnType<typeof buildCanonicalSellerNetwork>;
  classification: StoreClassificationEngine;
} {
  const network = buildCanonicalSellerNetwork({ clock: options.clock ?? createDeterministicClock() });
  const classification = StoreClassificationEngine.fromNetwork(network, { clock: options.clock ?? createDeterministicClock() });
  return { network, classification };
}
