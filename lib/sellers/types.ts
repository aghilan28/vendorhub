import type { CommerceRegion } from "@/types/commerce-foundation";

/**
 * Canonical seller + store ontology (SP-1). A Seller is a business/chain (or its regional operating
 * entity); a Store is a physical/operating outlet owned by a seller. This is the source of truth for
 * all future inventory, hyperlocal and delivery operations (not started here).
 */

export const SELLER_TYPES = ["ENTERPRISE", "CHAIN", "REGIONAL", "FRANCHISE", "INDEPENDENT"] as const;
export type SellerType = (typeof SELLER_TYPES)[number];

export const BUSINESS_TYPES = ["PRIVATE_LIMITED", "PUBLIC_LIMITED", "LLP", "PARTNERSHIP", "PROPRIETORSHIP", "COOPERATIVE"] as const;
export type BusinessType = (typeof BUSINESS_TYPES)[number];

export const VERIFICATION_STATUSES = ["UNVERIFIED", "PENDING", "VERIFIED", "REJECTED"] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const OPERATIONAL_STATUSES = ["ACTIVE", "PAUSED", "SUSPENDED", "CLOSED"] as const;
export type OperationalStatus = (typeof OPERATIONAL_STATUSES)[number];

export const LIFECYCLE_STATUSES = ["DRAFT", "ACTIVE", "ARCHIVED", "MERGED"] as const;
export type LifecycleStatus = (typeof LIFECYCLE_STATUSES)[number];

/** Store classification (Phase 5). */
export const STORE_TYPES = [
  "GROCERY",
  "SUPERMARKET",
  "HYPERMARKET",
  "PHARMACY",
  "BAKERY",
  "FRESH_PRODUCE",
  "MEAT",
  "FISH",
  "PET_SUPPLIES",
  "ELECTRONICS",
  "FASHION",
  "HOUSEHOLD",
  "STATIONERY",
  "POOJA",
  "HEALTH",
  "BABY_CARE",
  "SWEETS",
  "SPECIALTY",
] as const;
export type StoreType = (typeof STORE_TYPES)[number];

export interface Seller {
  id: string;
  name: string;
  slug: string;
  sellerType: SellerType;
  legalEntity: string;
  businessType: BusinessType;
  verificationStatus: VerificationStatus;
  /** Masked/synthetic tax reference (GSTIN-style) — no real PII. */
  taxId: string;
  operationalStatus: OperationalStatus;
  lifecycleStatus: LifecycleStatus;
  /** Real chain this seller traces back to (regional operating entities point to the parent chain). */
  parentChainId: string | null;
  homeRegion: CommerceRegion;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
}

export interface SellerInput {
  id?: string;
  name: string;
  slug?: string;
  sellerType?: SellerType;
  legalEntity?: string;
  businessType?: BusinessType;
  verificationStatus?: VerificationStatus;
  taxId?: string;
  operationalStatus?: OperationalStatus;
  lifecycleStatus?: LifecycleStatus;
  parentChainId?: string | null;
  homeRegion?: CommerceRegion;
  metadata?: Record<string, unknown>;
}

export interface StoreLocation {
  city: string;
  area: string;
  region: CommerceRegion;
  pincode: string;
  latitude: number;
  longitude: number;
}

export interface Store {
  id: string;
  name: string;
  slug: string;
  storeType: StoreType;
  /** PP-1 department slugs this store category serves (search/analytics readiness). */
  departments: string[];
  description: string;
  sellerId: string;
  verificationStatus: VerificationStatus;
  operationalStatus: OperationalStatus;
  lifecycleStatus: LifecycleStatus;
  location: StoreLocation;
  /** Compact operating-hours descriptor (e.g. "08:00-22:00"). */
  operatingHours: string;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
}

export interface StoreInput {
  id?: string;
  name: string;
  slug?: string;
  storeType: StoreType;
  departments?: string[];
  description?: string;
  sellerId: string;
  verificationStatus?: VerificationStatus;
  operationalStatus?: OperationalStatus;
  lifecycleStatus?: LifecycleStatus;
  location: StoreLocation;
  operatingHours?: string;
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------------------------
// Validation (Phase 10)
// ---------------------------------------------------------------------------------------------

export const SELLER_VALIDATION_CODES = [
  "DUPLICATE_SELLER_ID",
  "DUPLICATE_SELLER_SLUG",
  "DUPLICATE_STORE_ID",
  "DUPLICATE_STORE_SLUG",
  "BROKEN_OWNERSHIP",
  "INVALID_CLASSIFICATION",
  "ORPHAN_STORE",
  "INVALID_GOVERNANCE_STATE",
  "VERIFICATION_CONFLICT",
] as const;
export type SellerValidationCode = (typeof SELLER_VALIDATION_CODES)[number];

export type SellerValidationSeverity = "error" | "warning";

export interface SellerValidationIssue {
  code: SellerValidationCode;
  severity: SellerValidationSeverity;
  entityId: string | null;
  message: string;
  detail?: Record<string, unknown>;
}

export interface SellerValidationReport {
  valid: boolean;
  checkedSellers: number;
  checkedStores: number;
  errorCount: number;
  warningCount: number;
  issues: SellerValidationIssue[];
}

// ---------------------------------------------------------------------------------------------
// Governance (Phase 6)
// ---------------------------------------------------------------------------------------------

export const STORE_OPERATIONS = ["CREATE", "EDIT", "ARCHIVE", "RESTORE", "APPROVE", "REJECT", "VERIFY", "SUSPEND"] as const;
export type StoreOperation = (typeof STORE_OPERATIONS)[number];

export const CHANGE_REQUEST_STATUSES = ["PENDING_APPROVAL", "APPROVED", "REJECTED", "APPLIED"] as const;
export type ChangeRequestStatus = (typeof CHANGE_REQUEST_STATUSES)[number];

export interface StoreVersionEntry {
  version: number;
  at: string;
  actor: string;
  operation: StoreOperation;
  snapshot: Partial<Store>;
}

export interface StoreAuditEntry {
  id: string;
  operation: StoreOperation;
  actor: string;
  at: string;
  storeIds: string[];
  before: Partial<Store>[];
  after: Partial<Store>[];
  note?: string;
}

export interface StoreChangeRequest {
  id: string;
  operation: StoreOperation;
  status: ChangeRequestStatus;
  requestedBy: string;
  reviewedBy: string | null;
  createdAt: string;
  updatedAt: string;
  payload: Record<string, unknown>;
  note?: string;
}

export type Clock = () => string;
