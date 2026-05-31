import { SellerNetworkEngine, generateSyntheticSellerNetwork } from "@/lib/sellers";
import { StoreClassificationEngine } from "./engine";
import { buildClassificationSearchIndex } from "./search";
import { buildStoreIntelligenceProjection } from "./intelligence";
import { buildRankingInputs } from "./recommendation";
import { validateClassification } from "./validation";

export interface ClassificationScaleResult {
  targetStores: number;
  classifiedStores: number;
  coveragePct: number;
  valid: boolean;
  errorCount: number;
  l1Covered: number;
  formatsCovered: number;
  searchReady: boolean;
  recommendationReady: boolean;
  intelligenceReady: boolean;
  performanceOk: boolean;
  buildMs: number;
}

/** Certifies classification at a target store count (Phase 12). */
export function certifyClassificationScaleTarget(targetStores: number, performanceBudgetMs = 30_000): ClassificationScaleResult {
  const start = Date.now();
  const { sellers, stores } = generateSyntheticSellerNetwork(Math.ceil(targetStores / 5), 5);
  const built = SellerNetworkEngine.fromInputs(sellers, stores);
  const engine = StoreClassificationEngine.fromNetwork(built);
  const validStoreIds = new Set(built.stores().map((s) => s.id));
  const report = validateClassification(engine.profiles(), { validStoreIds });
  const coverage = engine.coverage(built.storeCount);
  const buildMs = Date.now() - start;

  return {
    targetStores: built.storeCount,
    classifiedStores: coverage.classified,
    coveragePct: coverage.coveragePct,
    valid: report.valid,
    errorCount: report.errorCount,
    l1Covered: coverage.l1Covered,
    formatsCovered: coverage.formatsCovered,
    searchReady: buildClassificationSearchIndex(engine).length === engine.size,
    recommendationReady: buildRankingInputs(engine).length === engine.size,
    intelligenceReady: buildStoreIntelligenceProjection(engine).totalStores === engine.size,
    performanceOk: buildMs <= performanceBudgetMs,
    buildMs,
  };
}

export function runClassificationScaleCertification(targets: number[] = [1_000, 5_000, 10_000, 50_000]): ClassificationScaleResult[] {
  return targets.map((target) => certifyClassificationScaleTarget(target));
}
