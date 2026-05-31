// MCP-0E — Live Commerce Intelligence engine (public surface).
//
// One assembler turns raw marketplace activity into a complete intelligence
// snapshot: fabric → demand/inventory/pricing → marketplace health/risk/growth
// → unified recommendations → workflows. Activation connectors (execution /
// governance / simulation) and buyer intelligence live alongside.

export * from "./types";
export { buildMarketplaceFabric, ASSUMED_COST_RATIO } from "./fabric";
export { analyzeDemand } from "./demand";
export { analyzeInventory, LEAD_TIME_DAYS } from "./inventory";
export { analyzePricing } from "./pricing";
export {
  computeMarketplaceHealth,
  detectMarketplaceRisks,
  detectGrowthOpportunities,
  buildMarketplaceInsights,
} from "./marketplace";
export { assembleRecommendations } from "./recommendations";
export { buildIntelligenceWorkflows, WORKFLOW_DEFS } from "./workflows";
export { buildBuyerIntelligence, type BuyerContext } from "./buyer";
export * from "./simulation";
export * from "./activation";
export { SAMPLE_MARKETPLACE_INPUT } from "./sample";

import { analyzeDemand } from "./demand";
import { buildMarketplaceFabric } from "./fabric";
import { analyzeInventory } from "./inventory";
import {
  buildMarketplaceInsights,
  computeMarketplaceHealth,
  detectGrowthOpportunities,
  detectMarketplaceRisks,
} from "./marketplace";
import { analyzePricing } from "./pricing";
import { assembleRecommendations } from "./recommendations";
import { buildIntelligenceWorkflows } from "./workflows";
import type { MarketplaceActivityInput, MarketplaceIntelligenceSnapshot } from "./types";

/**
 * Assembles the complete marketplace intelligence snapshot from live (or
 * sample) activity. Pure + deterministic so it runs identically server-side on
 * real Supabase data and offline in previews/tests.
 */
export function buildMarketplaceIntelligence(input: MarketplaceActivityInput): MarketplaceIntelligenceSnapshot {
  const fabric = buildMarketplaceFabric(input);
  const demand = analyzeDemand(fabric);
  const inventory = analyzeInventory(fabric);
  const pricing = analyzePricing(fabric);
  const health = computeMarketplaceHealth(fabric, inventory, pricing);
  const risks = detectMarketplaceRisks(fabric, demand, inventory, pricing);
  const growth = detectGrowthOpportunities(fabric, demand, pricing);
  const insights = buildMarketplaceInsights(health, fabric, demand, inventory, pricing);
  const recommendations = assembleRecommendations({ fabric, demand, inventory, pricing, risks, growth });
  const workflows = buildIntelligenceWorkflows(recommendations);

  return {
    generatedAt: fabric.generatedAt,
    windowDays: fabric.windowDays,
    fabric,
    demand,
    inventory,
    pricing,
    health,
    risks,
    growth,
    insights,
    recommendations,
    workflows,
  };
}
