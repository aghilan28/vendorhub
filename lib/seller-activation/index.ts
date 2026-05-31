// MCP-1A — Seller Activation engine (public surface).
//
// One import for onboarding, verification, product population (over MCP-0B),
// storefront generation, the seller activation center, admin seller governance,
// marketplace population operations and activation intelligence.

export * from "./types";

// Onboarding
export {
  ONBOARDING_STEPS,
  validateStep,
  computeProgress,
  isValidGstin,
  isValidPan,
  isValidIfsc,
  canTransitionApplication,
  transitionApplication,
  createApplication,
  type ApplicationTransitionResult,
} from "./onboarding";

// Verification
export { buildVerificationCase, verificationSummary } from "./verification";

// Product population (reuses MCP-0B)
export {
  IMPORT_TEMPLATE,
  importTemplateCsv,
  buildImportJob,
  importCsv,
  importJson,
  importSingle,
  toHistoryEntry,
  importGovernance,
  validateUniverseScale,
  catalogHealth,
  type ImportResult,
  type UniverseScaleResult,
} from "./population";

// Storefront
export { buildStorefront, storefrontTrustIndicators, type StorefrontSellerInput, type StorefrontProductInput, type StorefrontActivityInput } from "./storefront";

// Activation center
export { buildActivationSnapshot, type ActivationInput } from "./activation";

// Admin governance
export { buildGovernanceSnapshot, type GovernanceSellerInput } from "./governance";

// Population operations
export { buildPopulationSnapshot, type PopulationSellerInput, type PopulationTargets } from "./operations";

// Activation intelligence
export { sellerRecommendations, marketplaceRecommendations } from "./intelligence";

// Sample
export {
  SAMPLE_COMPLETE_DATA,
  SAMPLE_PARTIAL_DATA,
  SAMPLE_COMPLETE_APPLICATION,
  SAMPLE_PARTIAL_APPLICATION,
  SAMPLE_ACTIVATION_INPUT,
  SAMPLE_GOVERNANCE_SELLERS,
  SAMPLE_POPULATION_SELLERS,
  SAMPLE_STOREFRONT_SELLER,
  SAMPLE_STOREFRONT_PRODUCTS,
  SAMPLE_IMPORT_CSV,
} from "./sample";
