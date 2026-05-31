import { AttributeRegistry, CANONICAL_ATTRIBUTE_DEFINITIONS } from "./attributes";
import { buildCanonicalTaxonomyInputs } from "./canonical-taxonomy";
import { TaxonomyEngine } from "./engine";
import { TaxonomyGovernance, type GovernanceOptions } from "./governance";
import { createDeterministicClock } from "./slug";
import type { TaxonomyEngineOptions } from "./engine";

export * from "./types";
export { slugify, buildHierarchicalSlug, buildPath, createDeterministicClock, systemClock } from "./slug";
export { AttributeRegistry, CANONICAL_ATTRIBUTE_DEFINITIONS } from "./attributes";
export { TaxonomyEngine, resolveInputs, rederiveStructure } from "./engine";
export type { TaxonomyEngineOptions } from "./engine";
export { validateTaxonomy } from "./validation";
export type { ValidationOptions } from "./validation";
export { TaxonomyGovernance } from "./governance";
export type { GovernanceOptions, SplitTarget } from "./governance";
export { buildSearchIndex, buildSynonymGroups, nodesForSearchTerm } from "./search";
export type { TaxonomySearchDocument } from "./search";
export { buildAffinityGraph, similarityScore } from "./recommendation";
export type { AffinityEdge, SubstitutionGroup, TaxonomyAffinityGraph } from "./recommendation";
export { buildIntelligenceProjection, TAXONOMY_INTELLIGENCE_HOOKS } from "./intelligence";
export type { IntelligenceHook, DepartmentRollup, TaxonomyIntelligenceProjection } from "./intelligence";
export { generateSyntheticTaxonomy, certifyScaleTarget, runScaleCertification } from "./scale";
export type { ScaleCertificationResult, SyntheticOptions } from "./scale";
export { CANONICAL_DEPARTMENTS, buildCanonicalTaxonomyInputs } from "./canonical-taxonomy";

/** Builds the canonical VendorHub taxonomy engine from the bundled production-grade sample. */
export function buildCanonicalTaxonomyEngine(options: TaxonomyEngineOptions = {}): TaxonomyEngine {
  const registry = options.attributeRegistry ?? new AttributeRegistry(CANONICAL_ATTRIBUTE_DEFINITIONS);
  return TaxonomyEngine.fromInputs(buildCanonicalTaxonomyInputs(), {
    clock: options.clock ?? createDeterministicClock(),
    attributeRegistry: registry,
  });
}

/** Builds a governance session seeded with the canonical taxonomy. */
export function buildCanonicalGovernance(options: GovernanceOptions = {}): TaxonomyGovernance {
  return new TaxonomyGovernance(buildCanonicalTaxonomyEngine(options), options);
}
