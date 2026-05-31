import type { StoreClassificationEngine } from "./engine";
import { CAPABILITY_FLAGS, type StoreClassificationProfile } from "./types";

/**
 * Recommendation-readiness projection (Phase 7). Deterministic store similarity / alternatives /
 * ranking inputs from classification. Builds readiness; computes no live recommendations.
 */
export function storeSimilarity(engine: StoreClassificationEngine, idA: string, idB: string): number {
  const a = engine.getProfile(idA);
  const b = engine.getProfile(idB);
  if (!a || !b) return 0;
  if (a.storeId === b.storeId) return 1;
  const sameL1 = a.categoryL1 === b.categoryL1 ? 1 : 0;
  const sameL2 = a.categoryL2 === b.categoryL2 ? 1 : 0;
  const sameFormat = a.formatType === b.formatType ? 1 : 0;
  let sharedCaps = 0;
  for (const flag of CAPABILITY_FLAGS) if (a.capabilities[flag] === b.capabilities[flag]) sharedCaps += 1;
  const capScore = sharedCaps / CAPABILITY_FLAGS.length;
  return Number((sameL1 * 0.3 + sameL2 * 0.3 + sameFormat * 0.2 + capScore * 0.2).toFixed(4));
}

/** Alternative stores: same Level-2 category, excluding the store itself. */
export function storeAlternatives(engine: StoreClassificationEngine, storeId: string): StoreClassificationProfile[] {
  const profile = engine.getProfile(storeId);
  if (!profile) return [];
  return engine.getByCategoryL2(profile.categoryL2).filter((candidate) => candidate.storeId !== storeId);
}

export interface StoreRankingInput {
  storeId: string;
  capabilityScore: number;
  fulfillmentReach: number;
  formatWeight: number;
}

/** Ranking inputs a recommender can consume (deterministic, derived from classification only). */
export function buildRankingInputs(engine: StoreClassificationEngine): StoreRankingInput[] {
  return engine.profiles().map((profile) => {
    const capabilityScore = CAPABILITY_FLAGS.filter((flag) => profile.capabilities[flag]).length / CAPABILITY_FLAGS.length;
    const formatWeight = profile.formatType === "NATIONAL_CHAIN" ? 1 : profile.formatType === "DARK_STORE" ? 0.9 : 0.6;
    return { storeId: profile.storeId, capabilityScore: Number(capabilityScore.toFixed(3)), fulfillmentReach: profile.fulfillment.maxFulfillmentRadiusKm, formatWeight };
  });
}
