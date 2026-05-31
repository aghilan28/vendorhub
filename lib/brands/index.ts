import { buildCanonicalTaxonomyEngine, createDeterministicClock, type TaxonomyEngine } from "@/lib/taxonomy";
import { buildCanonicalBrandInputs } from "./canonical-brands";
import { BrandClassification } from "./classification";
import { BrandEngine, type BrandEngineOptions } from "./engine";

export * from "./types";
export { BrandEngine, resolveBrands, resolveCompanies } from "./engine";
export type { BrandEngineOptions } from "./engine";
export { BrandClassification } from "./classification";
export type { BrandClassificationIssue } from "./classification";
export { validateBrandUniverse } from "./validation";
export type { BrandValidationOptions } from "./validation";
export { BrandGovernance } from "./governance";
export type { BrandGovernanceOptions } from "./governance";
export { buildBrandSearchIndex, buildBrandSynonymGroups, brandsForSearchTerm } from "./search";
export type { BrandSearchDocument } from "./search";
export { buildBrandAffinityGraph, brandSimilarity } from "./recommendation";
export type { BrandAffinityEdge, BrandAffinityGraph, BrandGroup } from "./recommendation";
export { buildBrandIntelligenceProjection, BRAND_INTELLIGENCE_HOOKS } from "./intelligence";
export type { BrandIntelligenceHook, BrandIntelligenceProjection } from "./intelligence";
export { generateSyntheticBrands, certifyBrandScaleTarget, runBrandScaleCertification } from "./scale";
export type { BrandScaleCertificationResult, SyntheticBrandUniverse } from "./scale";
export { CANONICAL_COMPANIES, CANONICAL_BRAND_GROUPS, buildCanonicalBrandInputs } from "./canonical-brands";

export interface CanonicalBrandOptions extends BrandEngineOptions {
  taxonomy?: TaxonomyEngine;
}

/** Builds the canonical brand engine from the bundled real-brand universe. */
export function buildCanonicalBrandEngine(options: CanonicalBrandOptions = {}): BrandEngine {
  const { brands, companies } = buildCanonicalBrandInputs();
  return BrandEngine.fromInputs(brands, companies, { clock: options.clock ?? createDeterministicClock() });
}

/** Builds the full brand system: brand engine + PP-1 taxonomy + classification binding. */
export function buildCanonicalBrandSystem(options: CanonicalBrandOptions = {}): {
  engine: BrandEngine;
  taxonomy: TaxonomyEngine;
  classification: BrandClassification;
} {
  const engine = buildCanonicalBrandEngine(options);
  const taxonomy = options.taxonomy ?? buildCanonicalTaxonomyEngine();
  const classification = new BrandClassification(engine, taxonomy);
  return { engine, taxonomy, classification };
}
