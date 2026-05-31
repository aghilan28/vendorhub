import type { CommerceRegion } from "@/types/commerce-foundation";

export const BRAND_STATUSES = ["DRAFT", "ACTIVE", "DEPRECATED", "ARCHIVED", "MERGED"] as const;
export type BrandStatus = (typeof BRAND_STATUSES)[number];

export const BRAND_VERIFICATION_STATUSES = ["UNVERIFIED", "PENDING", "VERIFIED", "REJECTED"] as const;
export type BrandVerificationStatus = (typeof BRAND_VERIFICATION_STATUSES)[number];

export const BRAND_INDUSTRIES = [
  "FMCG",
  "FOOD",
  "BEVERAGES",
  "DAIRY",
  "PERSONAL_CARE",
  "BEAUTY",
  "HEALTH",
  "PHARMA",
  "HOUSEHOLD",
  "BABY_CARE",
  "PET_CARE",
  "ELECTRONICS",
  "APPLIANCES",
  "KITCHEN",
  "FASHION",
  "FOOTWEAR",
  "SPORTS",
  "AUTOMOTIVE",
  "STATIONERY",
  "CONGLOMERATE",
  "OTHER",
] as const;
export type BrandIndustry = (typeof BRAND_INDUSTRIES)[number];

export type LocalizedText = Record<string, string>;

/** A parent/holding company that owns one or more brands. Supports company-to-company hierarchy. */
export interface Company {
  id: string;
  name: string;
  slug: string;
  country: string;
  industry: BrandIndustry;
  foundedYear: number | null;
  /** Parent company id, enabling M&A / holding structures. Null for a top-level company. */
  parentCompanyId: string | null;
  /** Alternate names / abbreviations (e.g. "Hindustan Unilever" for HUL). */
  aliases: string[];
  status: BrandStatus;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
}

export interface CompanyInput {
  id?: string;
  name: string;
  slug?: string;
  country?: string;
  industry?: BrandIndustry;
  foundedYear?: number | null;
  parentCompanyId?: string | null;
  aliases?: string[];
  status?: BrandStatus;
  metadata?: Record<string, unknown>;
}

/** Canonical brand entity (Phase 1). */
export interface Brand {
  id: string;
  name: string;
  slug: string;
  description: string;
  logoUrl: string | null;
  website: string | null;
  country: string;
  /** Owning company id (resolves the parent-company chain via the company engine). */
  companyId: string | null;
  industry: BrandIndustry;
  foundedYear: number | null;
  verificationStatus: BrandVerificationStatus;
  status: BrandStatus;
  /** PP-1 taxonomy department slugs this brand operates in. */
  departments: string[];
  /** PP-1 taxonomy category slugs (optional, finer-grained). */
  categories: string[];
  aliases: string[];
  originRegion: CommerceRegion | null;
  isLocalBrand: boolean;
  /** Future localization / multi-language. */
  localizedNames: LocalizedText;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  mergedIntoId: string | null;
  metadata: Record<string, unknown>;
}

export interface BrandInput {
  id?: string;
  name: string;
  slug?: string;
  description?: string;
  logoUrl?: string | null;
  website?: string | null;
  country?: string;
  companyId?: string | null;
  industry?: BrandIndustry;
  foundedYear?: number | null;
  verificationStatus?: BrandVerificationStatus;
  status?: BrandStatus;
  departments?: string[];
  categories?: string[];
  aliases?: string[];
  originRegion?: CommerceRegion | null;
  isLocalBrand?: boolean;
  localizedNames?: LocalizedText;
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------------------------
// Validation (Phase 10)
// ---------------------------------------------------------------------------------------------

export const BRAND_VALIDATION_CODES = [
  "DUPLICATE_BRAND_ID",
  "DUPLICATE_BRAND_SLUG",
  "DUPLICATE_COMPANY_SLUG",
  "BROKEN_OWNERSHIP",
  "INVALID_TAXONOMY_MAPPING",
  "ORPHAN_COMPANY",
  "CIRCULAR_OWNERSHIP",
  "ALIAS_CONFLICT",
  "UNCLASSIFIED_BRAND",
] as const;
export type BrandValidationCode = (typeof BRAND_VALIDATION_CODES)[number];

export type BrandValidationSeverity = "error" | "warning";

export interface BrandValidationIssue {
  code: BrandValidationCode;
  severity: BrandValidationSeverity;
  entityId: string | null;
  message: string;
  detail?: Record<string, unknown>;
}

export interface BrandValidationReport {
  valid: boolean;
  checkedBrands: number;
  checkedCompanies: number;
  errorCount: number;
  warningCount: number;
  issues: BrandValidationIssue[];
}

// ---------------------------------------------------------------------------------------------
// Governance (Phase 5)
// ---------------------------------------------------------------------------------------------

export const BRAND_OPERATIONS = [
  "CREATE",
  "EDIT",
  "MERGE",
  "ARCHIVE",
  "RESTORE",
  "VERIFY",
  "REJECT",
  "DEPRECATE",
] as const;
export type BrandOperation = (typeof BRAND_OPERATIONS)[number];

export const BRAND_CHANGE_REQUEST_STATUSES = ["PENDING_APPROVAL", "APPROVED", "REJECTED", "APPLIED"] as const;
export type BrandChangeRequestStatus = (typeof BRAND_CHANGE_REQUEST_STATUSES)[number];

export interface BrandAuditEntry {
  id: string;
  operation: BrandOperation;
  actor: string;
  at: string;
  brandIds: string[];
  before: Partial<Brand>[];
  after: Partial<Brand>[];
  note?: string;
}

export interface BrandChangeRequest {
  id: string;
  operation: BrandOperation;
  status: BrandChangeRequestStatus;
  requestedBy: string;
  reviewedBy: string | null;
  createdAt: string;
  updatedAt: string;
  payload: Record<string, unknown>;
  note?: string;
}

export type Clock = () => string;
