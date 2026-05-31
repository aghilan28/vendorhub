// MCP-1B — Catalog Population engine (public surface).
//
// Import V2, media population, variant expansion, catalog quality, discovery
// readiness, taxonomy extensions, capacity, seller catalog ops, admin catalog
// governance and population intelligence — reusing MCP-0A/0B/1A.

export * from "./types";

// Import Platform V2
export {
  planImportJob,
  processChunk,
  failChunk,
  retryableChunks,
  importProgress,
  importAnalytics,
  importQueue,
  importCapacity,
} from "./import-v2";

// Media population
export {
  scoreMediaAsset,
  planMediaPopulation,
  mediaGovernance,
  parseCsvManifest,
  planIngestion,
  computeProgress,
  resumableRows,
} from "./media-population";

// Variant expansion
export { VARIANT_SETS, getVariantSet, buildVariantSet, recommendVariantAxes, variantGap } from "./variants";

// Catalog quality platform
export { buildCatalogQualityReport } from "./quality";

// Discovery readiness
export { SORT_OPTIONS, buildFacets, assessDiscoveryReadiness } from "./discovery";

// Taxonomy extensions
export { buildBrandHierarchy, buildTags, buildCollection, auditTaxonomy, leafCategories, rootCategories, type CollectionRuleInput } from "./taxonomy-ext";

// Capacity
export { CAPACITY_TIERS, buildUniverseCapacityReport, validateUniverseScale, type CapacityTier, type UniverseCapacityReport } from "./capacity";

// Seller catalog operations
export { buildSellerCatalogSnapshot, type SellerCatalogInput } from "./catalog-ops";

// Admin catalog governance
export { buildCatalogGovernanceSnapshot, type GovernanceProductInput } from "./governance";

// Population intelligence
export { buildPopulationIntelligence, type PopulationProductInput, type PopulationIntelligenceOptions } from "./intelligence";

// Sample
export {
  SAMPLE_PRODUCTS,
  SAMPLE_PRODUCTS_WITH_GAPS,
  SAMPLE_POPULATION_PRODUCTS,
  SAMPLE_GOVERNANCE_PRODUCTS,
  SAMPLE_MEDIA_ASSETS,
  sampleImportJob,
} from "./sample";
