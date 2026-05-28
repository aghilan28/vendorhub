import type { CatalogVariant, CommerceLanguage, CommerceRegion, MasterProduct, ProductImageKind } from "./commerce-foundation";

export const CATALOG_PRODUCT_STATUSES = [
  "active",
  "hidden",
  "archived",
  "deprecated",
  "experimental",
  "pending_review",
  "blocked",
  "duplicate_candidate",
  "incomplete",
  "ai_generated",
] as const;

export const CATALOG_VALIDATION_DOMAINS = [
  "metadata",
  "image",
  "category",
  "variant",
  "search",
  "seller_catalog",
  "duplicate",
  "moderation",
  "ai_dataset",
] as const;

export const CATALOG_ISSUE_SEVERITIES = ["info", "warning", "major", "critical"] as const;
export const CATALOG_ISSUE_STATES = ["open", "acknowledged", "resolved", "waived", "rolled_back"] as const;

export const CATALOG_MODERATION_ACTIONS = [
  "approve",
  "reject",
  "archive",
  "escalate",
  "restrict_seller",
  "require_manual_review",
  "hide",
  "restore",
] as const;

export const BULK_NORMALIZATION_JOB_TYPES = [
  "bulk_category_fix",
  "bulk_image_replacement",
  "bulk_alias_generation",
  "bulk_transliteration",
  "bulk_sku_regeneration",
  "bulk_duplicate_merging",
  "bulk_status_change",
  "nightly_quality_scan",
  "duplicate_detection_scan",
  "image_validation_scan",
  "taxonomy_integrity_scan",
  "search_readiness_scan",
  "multilingual_coverage_scan",
  "seller_catalog_scan",
  "ai_safe_dataset_preparation",
] as const;

export type CatalogProductStatus = (typeof CATALOG_PRODUCT_STATUSES)[number];
export type CatalogValidationDomain = (typeof CATALOG_VALIDATION_DOMAINS)[number];
export type CatalogIssueSeverity = (typeof CATALOG_ISSUE_SEVERITIES)[number];
export type CatalogIssueState = (typeof CATALOG_ISSUE_STATES)[number];
export type CatalogModerationAction = (typeof CATALOG_MODERATION_ACTIONS)[number];
export type BulkNormalizationJobType = (typeof BULK_NORMALIZATION_JOB_TYPES)[number];

export interface CatalogValidationIssue {
  domain: CatalogValidationDomain;
  severity: CatalogIssueSeverity;
  issueCode: string;
  title: string;
  detail: string;
  suggestedFix?: Record<string, unknown>;
  reversible: boolean;
  autoFixable: boolean;
}

export interface CatalogImageAuditInput {
  imageKind: ProductImageKind;
  width?: number;
  height?: number;
  blurScore?: number;
  brightnessScore?: number;
  backgroundQualityScore?: number;
  watermarkDetected?: boolean;
  compressionArtifactScore?: number;
  packagingVisibility?: number;
  ocrReadability?: number;
  duplicateHash?: string;
  aiGeneratedSuspicion?: number;
}

export interface CatalogQualityInput {
  product: MasterProduct & {
    status?: CatalogProductStatus;
    isMvpEnabled?: boolean;
  };
  variants: CatalogVariant[];
  images: CatalogImageAuditInput[];
  aliasesCount?: number;
  searchTokenCount?: number;
  sellerUsage?: {
    sellerCount: number;
    reorderFrequency?: number;
    successfulSales?: number;
  };
  duplicateSignals?: {
    likelyDuplicate: boolean;
    confidence: number;
    conflictingMetadata?: boolean;
  };
  moderationSignals?: {
    aiGeneratedSuspicion?: number;
    policyRisk?: number;
    malformedDescription?: boolean;
    openIssueCount?: number;
  };
}

export interface CatalogQualityScore {
  score: number;
  grade: "production_grade" | "good_improvable" | "needs_review" | "auto_hidden";
  autoVisibility: CatalogProductStatus;
  factors: {
    metadataCompleteness: number;
    imageQuality: number;
    categoryConsistency: number;
    variantValidity: number;
    searchReadiness: number;
    sellerUsage: number;
    duplicateConfidence: number;
    moderationConfidence: number;
  };
  issues: CatalogValidationIssue[];
  aiSafeDatasetEligible: boolean;
}

export interface DuplicateDetectionInput {
  productId: string;
  canonicalName: string;
  normalizedName: string;
  barcode?: string;
  variantCodes: string[];
  aliases: string[];
  imageHashes: string[];
  languages: Partial<Record<CommerceLanguage, string>>;
  regionCodes: CommerceRegion[];
}

export interface DuplicateCandidate {
  productIds: [string, string];
  confidence: number;
  methods: Array<"name_similarity" | "barcode_match" | "image_hash_match" | "variant_overlap" | "phonetic_match" | "multilingual_match">;
  recommendedAction: "flag" | "review_merge";
}

export interface BulkNormalizationPlan {
  jobType: BulkNormalizationJobType;
  dryRun: boolean;
  targetCount: number;
  reversible: boolean;
  rollbackRequired: boolean;
  expectedIssueDomains: CatalogValidationDomain[];
}
