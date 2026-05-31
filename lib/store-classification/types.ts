/**
 * Canonical store classification, capability & fulfillment ontology (SP-2). Enriches every SP-1 store
 * with a category hierarchy, a store-format type, a capability profile, a product capability and a
 * fulfillment profile — the foundation for product↔store mapping, hyperlocal discovery and delivery
 * eligibility (none of which are started here).
 */

/** Level-1 store categories (Phase 1). */
export const STORE_CATEGORY_L1 = [
  "RETAIL",
  "FOOD",
  "HEALTHCARE",
  "ELECTRONICS",
  "FASHION",
  "HOME",
  "SERVICES",
  "SPECIALTY",
  "AUTOMOTIVE",
  "PET",
] as const;
export type StoreCategoryL1 = (typeof STORE_CATEGORY_L1)[number];

/** Store-format type system (Phase 2). */
export const STORE_FORMAT_TYPES = [
  "NATIONAL_CHAIN",
  "REGIONAL_CHAIN",
  "LOCAL_CHAIN",
  "INDEPENDENT_STORE",
  "FRANCHISE",
  "FLAGSHIP",
  "WAREHOUSE",
  "DARK_STORE",
  "FULFILLMENT_CENTER",
  "MICRO_HUB",
  "HYBRID_STORE",
] as const;
export type StoreFormatType = (typeof STORE_FORMAT_TYPES)[number];

/** Commerce/operational capabilities (Phase 3). */
export const CAPABILITY_FLAGS = [
  "delivery",
  "pickup",
  "sameDay",
  "instantDelivery",
  "cod",
  "returns",
  "refunds",
  "bulkOrders",
  "subscription",
  "b2b",
  "b2c",
  "hyperlocal",
] as const;
export type CapabilityFlag = (typeof CAPABILITY_FLAGS)[number];

export type CapabilityProfile = Record<CapabilityFlag, boolean>;

/** Fulfillment modes (Phase 5). */
export const FULFILLMENT_MODES = [
  "PICKUP",
  "STORE_DELIVERY",
  "COURIER",
  "PARTNER_DELIVERY",
  "WAREHOUSE_FULFILLMENT",
  "DARK_STORE_FULFILLMENT",
  "HYBRID_FULFILLMENT",
] as const;
export type FulfillmentMode = (typeof FULFILLMENT_MODES)[number];

export interface FulfillmentProfile {
  modes: FulfillmentMode[];
  primaryMode: FulfillmentMode;
  maxFulfillmentRadiusKm: number;
}

export interface ProductCapability {
  allowedDepartments: string[];
  restrictedDepartments: string[];
  complianceRequirements: string[];
}

/** The full classification profile for one store. */
export interface StoreClassificationProfile {
  storeId: string;
  sellerId: string;
  categoryL1: StoreCategoryL1;
  categoryL2: string;
  formatType: StoreFormatType;
  capabilities: CapabilityProfile;
  productCapability: ProductCapability;
  fulfillment: FulfillmentProfile;
  createdAt: string;
  updatedAt: string;
  version: number;
}

// ---------------------------------------------------------------------------------------------
// Validation (Phase 10)
// ---------------------------------------------------------------------------------------------

export const CLASSIFICATION_VALIDATION_CODES = [
  "INVALID_CATEGORY",
  "INVALID_TYPE",
  "INVALID_CAPABILITY",
  "BROKEN_ASSIGNMENT",
  "CONFLICTING_CAPABILITY",
  "ORPHAN_RECORD",
  "COMPLIANCE_VIOLATION",
  "CLASSIFICATION_ERROR",
] as const;
export type ClassificationValidationCode = (typeof CLASSIFICATION_VALIDATION_CODES)[number];

export type ValidationSeverity = "error" | "warning";

export interface ClassificationValidationIssue {
  code: ClassificationValidationCode;
  severity: ValidationSeverity;
  entityId: string | null;
  message: string;
  detail?: Record<string, unknown>;
}

export interface ClassificationValidationReport {
  valid: boolean;
  checkedProfiles: number;
  errorCount: number;
  warningCount: number;
  issues: ClassificationValidationIssue[];
}

// ---------------------------------------------------------------------------------------------
// Governance (Phase 9 audit/governance tables)
// ---------------------------------------------------------------------------------------------

export const CLASSIFICATION_OPERATIONS = ["ASSIGN", "EDIT", "OVERRIDE", "APPROVE", "REJECT", "RESET"] as const;
export type ClassificationOperation = (typeof CLASSIFICATION_OPERATIONS)[number];

export const CHANGE_REQUEST_STATUSES = ["PENDING_APPROVAL", "APPROVED", "REJECTED", "APPLIED"] as const;
export type ChangeRequestStatus = (typeof CHANGE_REQUEST_STATUSES)[number];

export interface ClassificationAuditEntry {
  id: string;
  operation: ClassificationOperation;
  actor: string;
  at: string;
  storeIds: string[];
  before: Partial<StoreClassificationProfile>[];
  after: Partial<StoreClassificationProfile>[];
  note?: string;
}

export interface ClassificationChangeRequest {
  id: string;
  operation: ClassificationOperation;
  status: ChangeRequestStatus;
  requestedBy: string;
  reviewedBy: string | null;
  createdAt: string;
  updatedAt: string;
  payload: Record<string, unknown>;
}

export type Clock = () => string;
