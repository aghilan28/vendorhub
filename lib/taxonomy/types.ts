import type { CommerceLanguage, CommerceRegion } from "@/types/commerce-foundation";

/**
 * Canonical 6-level commerce taxonomy hierarchy (PP-1).
 *
 * Department > Category > Subcategory > Product Family > Product Type > Variant Group
 *
 * These six levels are the directive's canonical hierarchy. They map onto the pre-existing
 * `public.taxonomy_level` enum (8 levels) via {@link LEVEL_TO_COMMERCE_FOUNDATION} so the engine
 * remains interoperable with the existing commerce-foundation schema without duplicating it.
 */
export const TAXONOMY_NODE_LEVELS = [
  "DEPARTMENT",
  "CATEGORY",
  "SUBCATEGORY",
  "PRODUCT_FAMILY",
  "PRODUCT_TYPE",
  "VARIANT_GROUP",
] as const;

export type TaxonomyNodeLevel = (typeof TAXONOMY_NODE_LEVELS)[number];

/** Zero-based depth of each level (DEPARTMENT = 0 ... VARIANT_GROUP = 5). */
export const TAXONOMY_LEVEL_DEPTH: Record<TaxonomyNodeLevel, number> = {
  DEPARTMENT: 0,
  CATEGORY: 1,
  SUBCATEGORY: 2,
  PRODUCT_FAMILY: 3,
  PRODUCT_TYPE: 4,
  VARIANT_GROUP: 5,
};

/** Maximum supported depth. The model accepts unlimited future expansion below this if needed. */
export const TAXONOMY_MAX_DEPTH = TAXONOMY_NODE_LEVELS.length - 1;

/** Mapping from the canonical PP-1 levels to the existing `public.taxonomy_level` enum values. */
export const LEVEL_TO_COMMERCE_FOUNDATION: Record<TaxonomyNodeLevel, string> = {
  DEPARTMENT: "DEPARTMENT",
  CATEGORY: "CATEGORY",
  SUBCATEGORY: "SUBCATEGORY",
  PRODUCT_FAMILY: "PRODUCT_FAMILY",
  PRODUCT_TYPE: "PRODUCT_GROUP",
  VARIANT_GROUP: "VARIANT",
};

/** Lifecycle status of a taxonomy node, governing visibility and governance transitions. */
export const TAXONOMY_NODE_STATUSES = [
  "DRAFT",
  "ACTIVE",
  "DEPRECATED",
  "ARCHIVED",
  "MERGED",
  "SPLIT",
] as const;

export type TaxonomyNodeStatus = (typeof TAXONOMY_NODE_STATUSES)[number];

export type LocalizedNames = Partial<Record<CommerceLanguage, string>>;

export interface TaxonomySeo {
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  canonicalPath: string;
}

/**
 * A fully-resolved taxonomy node. `path`/`pathIds`/`depth` are derived deterministically by the
 * engine from the parent chain; callers supply {@link TaxonomyNodeInput}.
 */
export interface TaxonomyNode {
  id: string;
  level: TaxonomyNodeLevel;
  depth: number;
  slug: string;
  localSlug: string;
  name: string;
  parentId: string | null;
  path: string;
  pathIds: string[];
  names: LocalizedNames;
  synonyms: string[];
  searchTerms: string[];
  attributeKeys: string[];
  seo: TaxonomySeo;
  regions: CommerceRegion[];
  sortOrder: number;
  status: TaxonomyNodeStatus;
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  mergedIntoId: string | null;
  metadata: Record<string, unknown>;
}

/** Caller-supplied node definition. The engine fills in derived/defaulted fields. */
export interface TaxonomyNodeInput {
  id?: string;
  level: TaxonomyNodeLevel;
  slug?: string;
  name: string;
  parentId?: string | null;
  names?: LocalizedNames;
  synonyms?: string[];
  searchTerms?: string[];
  attributeKeys?: string[];
  seo?: Partial<TaxonomySeo>;
  regions?: CommerceRegion[];
  sortOrder?: number;
  status?: TaxonomyNodeStatus;
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------------------------
// Attribute framework (Phase 4) — reusable, de-duplicated attribute definitions.
// ---------------------------------------------------------------------------------------------

export const ATTRIBUTE_DATA_TYPES = [
  "string",
  "number",
  "boolean",
  "enum",
  "measure",
] as const;

export type AttributeDataType = (typeof ATTRIBUTE_DATA_TYPES)[number];

export interface AttributeDefinition {
  /** Stable, globally-unique key. Definitions are stored once and referenced by key (no duplication). */
  key: string;
  label: string;
  dataType: AttributeDataType;
  /** Unit of measure for `measure`/`number` types (e.g. "g", "ml", "months"). */
  unit?: string;
  /** Allowed values for `enum` types. */
  allowedValues?: string[];
  /** Levels at which this attribute may be assigned. */
  appliesToLevels: TaxonomyNodeLevel[];
  isFilterable: boolean;
  isSearchable: boolean;
  /** Whether this attribute distinguishes variants (e.g. weight, color). */
  isVariantDefining: boolean;
  description?: string;
}

export interface ResolvedAttribute {
  key: string;
  definition: AttributeDefinition;
  /** Node that directly declared the attribute. */
  sourceNodeId: string;
  /** True when inherited from an ancestor rather than declared on the node itself. */
  inherited: boolean;
}

// ---------------------------------------------------------------------------------------------
// Validation (Phase 9)
// ---------------------------------------------------------------------------------------------

export const TAXONOMY_VALIDATION_CODES = [
  "CIRCULAR_REFERENCE",
  "ORPHAN_NODE",
  "DUPLICATE_SLUG",
  "DUPLICATE_PATH",
  "DUPLICATE_ID",
  "BROKEN_HIERARCHY",
  "INVALID_PARENT",
  "DEPTH_VIOLATION",
  "MISSING_ROOT_PARENT",
  "UNKNOWN_ATTRIBUTE",
  "ATTRIBUTE_LEVEL_MISMATCH",
] as const;

export type TaxonomyValidationCode = (typeof TAXONOMY_VALIDATION_CODES)[number];

export type TaxonomyValidationSeverity = "error" | "warning";

export interface TaxonomyValidationIssue {
  code: TaxonomyValidationCode;
  severity: TaxonomyValidationSeverity;
  nodeId: string | null;
  message: string;
  detail?: Record<string, unknown>;
}

export interface TaxonomyValidationReport {
  valid: boolean;
  checkedNodes: number;
  errorCount: number;
  warningCount: number;
  issues: TaxonomyValidationIssue[];
}

// ---------------------------------------------------------------------------------------------
// Governance (Phase 10)
// ---------------------------------------------------------------------------------------------

export const TAXONOMY_OPERATIONS = [
  "CREATE",
  "EDIT",
  "DEPRECATE",
  "MERGE",
  "SPLIT",
  "ARCHIVE",
  "RESTORE",
] as const;

export type TaxonomyOperation = (typeof TAXONOMY_OPERATIONS)[number];

export const CHANGE_REQUEST_STATUSES = [
  "DRAFT",
  "PENDING_APPROVAL",
  "APPROVED",
  "REJECTED",
  "APPLIED",
] as const;

export type ChangeRequestStatus = (typeof CHANGE_REQUEST_STATUSES)[number];

export interface TaxonomyAuditEntry {
  id: string;
  operation: TaxonomyOperation;
  actor: string;
  at: string;
  nodeIds: string[];
  before: Partial<TaxonomyNode>[];
  after: Partial<TaxonomyNode>[];
  note?: string;
}

export interface TaxonomyChangeRequest {
  id: string;
  operation: TaxonomyOperation;
  status: ChangeRequestStatus;
  requestedBy: string;
  reviewedBy: string | null;
  createdAt: string;
  updatedAt: string;
  payload: Record<string, unknown>;
  note?: string;
}

/** Injectable, deterministic clock so tests are 100% reproducible. */
export type Clock = () => string;
