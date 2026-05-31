import type { StoreClassificationEngine } from "./engine";

export interface StoreIntelligenceHook {
  key: string;
  label: string;
  consumes: string[];
}

/** Declarative store-intelligence hooks (Phase 8). No analysis performed here. */
export const STORE_INTELLIGENCE_HOOKS: StoreIntelligenceHook[] = [
  { key: "store_health", label: "Store Health", consumes: ["orders", "classification"] },
  { key: "store_growth", label: "Store Growth", consumes: ["orders", "classification"] },
  { key: "store_risk", label: "Store Risk", consumes: ["governance", "compliance"] },
  { key: "store_expansion", label: "Store Expansion", consumes: ["coverage", "regions"] },
  { key: "store_coverage", label: "Store Coverage", consumes: ["classification", "geo"] },
  { key: "store_demand", label: "Store Demand", consumes: ["orders", "capability"] },
  { key: "store_performance", label: "Store Performance", consumes: ["orders", "fulfillment"] },
  { key: "store_quality", label: "Store Quality", consumes: ["classification", "compliance"] },
];

export interface StoreIntelligenceProjection {
  hooks: StoreIntelligenceHook[];
  totalStores: number;
  byCategoryL1: Record<string, number>;
  byFormatType: Record<string, number>;
  capabilityAdoption: Record<string, number>;
  complianceCoverage: number;
}

/** Builds deterministic aggregation buckets for store intelligence/analytics consumers. */
export function buildStoreIntelligenceProjection(engine: StoreClassificationEngine): StoreIntelligenceProjection {
  const stats = engine.stats();
  const total = engine.size || 1;
  let withCompliance = 0;
  for (const profile of engine.profiles()) {
    if (profile.productCapability.complianceRequirements.length > 0) withCompliance += 1;
  }
  return {
    hooks: STORE_INTELLIGENCE_HOOKS,
    totalStores: engine.size,
    byCategoryL1: stats.byL1,
    byFormatType: stats.byFormat,
    capabilityAdoption: stats.byCapability,
    complianceCoverage: Number(((withCompliance / total) * 100).toFixed(1)),
  };
}
