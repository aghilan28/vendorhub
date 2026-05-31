import { normalizeCommerceText } from "@/lib/commerce-foundation";
import type { StoreClassificationEngine } from "./engine";
import { CAPABILITY_FLAGS, type CapabilityFlag, type StoreClassificationProfile } from "./types";

export interface ClassificationSearchDocument {
  storeId: string;
  categoryL1: string;
  categoryL2: string;
  formatType: string;
  capabilities: CapabilityFlag[];
  fulfillmentModes: string[];
  tokens: string[];
}

/**
 * Search-readiness projection (Phase 6). Produces store-classification search documents (category /
 * type / capability / fulfillment tokens). Builds search-ready structures; no search UI.
 */
export function buildClassificationSearchIndex(engine: StoreClassificationEngine): ClassificationSearchDocument[] {
  return engine.profiles().map((profile) => {
    const capabilities = CAPABILITY_FLAGS.filter((flag) => profile.capabilities[flag]);
    const surface = [profile.categoryL1, profile.categoryL2, profile.formatType, ...capabilities, ...profile.fulfillment.modes].join(" ");
    return {
      storeId: profile.storeId,
      categoryL1: profile.categoryL1,
      categoryL2: profile.categoryL2,
      formatType: profile.formatType,
      capabilities,
      fulfillmentModes: profile.fulfillment.modes,
      tokens: Array.from(new Set(normalizeCommerceText(surface).split(" "))).filter(Boolean).sort(),
    };
  });
}

export function storesWithCapability(engine: StoreClassificationEngine, flag: CapabilityFlag): StoreClassificationProfile[] {
  return engine.getByCapability(flag);
}

export function classificationForTerm(engine: StoreClassificationEngine, term: string): ClassificationSearchDocument[] {
  const tokens = normalizeCommerceText(term).split(" ").filter(Boolean);
  if (!tokens.length) return [];
  return buildClassificationSearchIndex(engine).filter((doc) => tokens.every((token) => doc.tokens.includes(token)));
}
