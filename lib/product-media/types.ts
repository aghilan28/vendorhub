/**
 * Canonical product media ontology (PP-5). Models primary/gallery/thumbnail/packaging/brand/category
 * assets (plus future video/360/AR slots) and integrates with the PP-3/PP-4 product universe.
 */

export const MEDIA_KINDS = [
  "PRIMARY",
  "GALLERY",
  "THUMBNAIL",
  "PACKAGING",
  "BRAND_ASSET",
  "CATEGORY_ASSET",
  "VIDEO",
  "VIEW_360",
  "AR",
] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

export const MEDIA_FORMATS = ["webp", "jpg", "png", "svg", "mp4", "glb"] as const;
export type MediaFormat = (typeof MEDIA_FORMATS)[number];

export const SUPPORTED_IMAGE_FORMATS: MediaFormat[] = ["webp", "jpg", "png", "svg"];

export const MEDIA_STATUSES = ["DRAFT", "ACTIVE", "ARCHIVED", "REJECTED", "REPLACED"] as const;
export type MediaStatus = (typeof MEDIA_STATUSES)[number];

/** Gallery roles (Phase 6). */
export const GALLERY_ROLES = ["PRIMARY", "SECONDARY", "PACKAGING", "BRAND", "LIFESTYLE", "VIDEO", "VIEW_360"] as const;
export type GalleryRole = (typeof GALLERY_ROLES)[number];

/** Thumbnail variants (Phase 5). */
export const THUMBNAIL_VARIANTS = ["STOREFRONT", "SEARCH", "CARD", "CATEGORY", "ADMIN"] as const;
export type ThumbnailVariant = (typeof THUMBNAIL_VARIANTS)[number];

export interface MediaAsset {
  id: string;
  productId: string;
  variantId: string | null;
  kind: MediaKind;
  role: GalleryRole | null;
  url: string;
  format: MediaFormat;
  width: number;
  height: number;
  aspectRatio: string;
  alt: string;
  /** Deterministic content checksum used for duplicate detection. */
  checksum: string;
  isPlaceholder: boolean;
  status: MediaStatus;
  version: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductMediaSet {
  productId: string;
  primary: MediaAsset;
  gallery: MediaAsset[];
  thumbnails: Record<ThumbnailVariant, string>;
  /** 0..1 coverage score for this product's media. */
  coverageScore: number;
}

// Validation (Phase 4)
export const MEDIA_VALIDATION_CODES = [
  "BROKEN_URL",
  "MISSING_PRIMARY",
  "INVALID_FORMAT",
  "UNSUPPORTED_FORMAT",
  "INVALID_DIMENSIONS",
  "CORRUPTED_ASSET",
  "DUPLICATE_ASSET",
  "PLACEHOLDER_ASSET",
  "LOW_QUALITY",
  "MISSING_THUMBNAIL",
] as const;
export type MediaValidationCode = (typeof MEDIA_VALIDATION_CODES)[number];

export type MediaValidationSeverity = "error" | "warning";

export interface MediaValidationIssue {
  code: MediaValidationCode;
  severity: MediaValidationSeverity;
  entityId: string | null;
  message: string;
  detail?: Record<string, unknown>;
}

export interface MediaValidationReport {
  valid: boolean;
  checkedAssets: number;
  errorCount: number;
  warningCount: number;
  issues: MediaValidationIssue[];
}

// Governance (Phase 9)
export const MEDIA_OPERATIONS = ["APPROVE", "REJECT", "ARCHIVE", "RESTORE", "REPLACE", "VERSION", "MODERATE"] as const;
export type MediaOperation = (typeof MEDIA_OPERATIONS)[number];

export const MEDIA_CHANGE_REQUEST_STATUSES = ["PENDING_APPROVAL", "APPROVED", "REJECTED", "APPLIED"] as const;
export type MediaChangeRequestStatus = (typeof MEDIA_CHANGE_REQUEST_STATUSES)[number];

export interface MediaAuditEntry {
  id: string;
  operation: MediaOperation;
  actor: string;
  at: string;
  assetIds: string[];
  before: Partial<MediaAsset>[];
  after: Partial<MediaAsset>[];
  note?: string;
}

export interface MediaChangeRequest {
  id: string;
  operation: MediaOperation;
  status: MediaChangeRequestStatus;
  requestedBy: string;
  reviewedBy: string | null;
  createdAt: string;
  updatedAt: string;
  payload: Record<string, unknown>;
  note?: string;
}

export type Clock = () => string;
