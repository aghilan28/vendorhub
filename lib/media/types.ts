// MCP-0A — Media Domain Model (types)
// A marketplace-grade, deterministic media model. Pure types + lifecycle enums;
// no runtime dependencies so it is safe to import on server and client and is
// fully unit-testable.

/** Lifecycle states shared by media assets. */
export type MediaStatus =
  | "uploading"
  | "processing"
  | "pending_moderation"
  | "active"
  | "rejected"
  | "archived"
  | "failed";

export type MediaKind = "image" | "video" | "image_360" | "document";

export type MediaFormat = "jpeg" | "png" | "webp" | "avif" | "gif" | "mp4" | "webm" | "unknown";

export type VariantPurpose =
  | "original"
  | "thumbnail"
  | "card"
  | "gallery"
  | "zoom"
  | "webp"
  | "avif";

export type ModerationState = "pending" | "approved" | "rejected" | "flagged" | "escalated";

export type OwnerKind = "seller" | "admin" | "system" | "brand";

export type UsageContext =
  | "product_primary"
  | "product_gallery"
  | "store_banner"
  | "brand_logo"
  | "category_hero"
  | "marketing"
  | "unused";

/** The bucket identifiers provisioned by the storage architecture. */
export type BucketId =
  | "product-images"
  | "product-thumbnails"
  | "product-webp"
  | "brand-assets"
  | "store-assets"
  | "category-assets"
  | "marketing-assets"
  | "temp-uploads"
  | "moderation-review"
  | "archive";

/** Who owns a media asset (auditability + permissions). */
export interface MediaOwnership {
  ownerKind: OwnerKind;
  ownerId: string;
  vendorId: string | null;
}

/** Provenance of a media asset. */
export interface MediaSource {
  origin: "seller_upload" | "bulk_import" | "admin_upload" | "migration" | "external_url";
  uploadedBy: string;
  originalFilename: string;
  referenceUrl?: string | null;
}

/** Rights/licensing metadata. */
export interface MediaRights {
  license: "proprietary" | "licensed" | "royalty_free" | "unknown";
  attributionRequired: boolean;
  expiresAt?: string | null;
}

/** Raw technical metadata extracted at ingest. */
export interface MediaMetadata {
  width: number;
  height: number;
  bytes: number;
  format: MediaFormat;
  aspectRatio: number;
  colorSpace?: string;
  hasAlpha?: boolean;
  durationSeconds?: number | null;
}

/** Computed quality breakdown (see quality.ts). */
export interface MediaQuality {
  score: number; // 0..100
  resolution: number;
  aspect: number;
  brightness: number;
  sharpness: number;
  noise: number;
  watermarkRisk: number;
  flags: string[];
}

/** A single derived rendition of an asset (size/format). */
export interface MediaVariant {
  id: string;
  assetId: string;
  purpose: VariantPurpose;
  bucket: BucketId;
  path: string;
  format: MediaFormat;
  width: number;
  height: number;
  bytes: number;
}

/** Perceptual + cryptographic hashes used for dedup and integrity. */
export interface MediaHashes {
  sha256: string;
  perceptual: string;
}

/** A transformation applied during processing (audited). */
export interface MediaTransformation {
  step:
    | "validate"
    | "virus_scan"
    | "moderation_scan"
    | "decode_metadata"
    | "hash"
    | "duplicate_check"
    | "compress"
    | "resize"
    | "thumbnail"
    | "webp"
    | "avif"
    | "quality_score"
    | "place_storage"
    | "cdn_publish";
  status: "pending" | "ok" | "skipped" | "failed";
  detail?: string;
}

/** A moderation decision + risk for an asset. */
export interface MediaModeration {
  state: ModerationState;
  riskScore: number; // 0..100
  reasons: string[];
  reviewedBy?: string | null;
  reviewedAt?: string | null;
}

/** AI/heuristic analysis output (labels, safety, dominant colors). */
export interface MediaAnalysis {
  labels: string[];
  unsafeScore: number; // 0..1
  dominantColors: string[];
  isLikelyDuplicateOf?: string | null;
}

/** Immutable audit record for any media lifecycle event. */
export interface MediaAudit {
  id: string;
  assetId: string;
  event:
    | "created"
    | "processed"
    | "variant_generated"
    | "moderated"
    | "replaced"
    | "deleted"
    | "reordered"
    | "published";
  actorId: string;
  at: string;
  detail?: string;
}

/** A version in an asset's history (replace creates a new version). */
export interface MediaVersion {
  version: number;
  assetId: string;
  path: string;
  createdAt: string;
  createdBy: string;
}

/** Where/how an asset is used in the catalog. */
export interface MediaUsage {
  context: UsageContext;
  entityType: "product" | "store" | "brand" | "category";
  entityId: string;
  position: number;
}

export interface MediaTag {
  id: string;
  label: string;
}

export interface MediaCategory {
  id: string;
  name: string;
  slug: string;
}

/** The central media entity. */
export interface MediaAsset {
  id: string;
  kind: MediaKind;
  status: MediaStatus;
  bucket: BucketId;
  path: string;
  ownership: MediaOwnership;
  source: MediaSource;
  rights: MediaRights;
  metadata: MediaMetadata;
  hashes: MediaHashes;
  quality: MediaQuality;
  moderation: MediaModeration;
  analysis?: MediaAnalysis;
  variants: MediaVariant[];
  tags: string[];
  altText: string;
  createdAt: string;
  updatedAt: string;
}

/** An ordered set of media for one entity (e.g. a product). */
export interface MediaCollection {
  id: string;
  ownerId: string;
  entityType: "product" | "store" | "brand" | "category";
  entityId: string;
  assetIds: string[];
}

/** A product gallery: a media collection rendered to the buyer. */
export interface ProductGalleryItem {
  url: string;
  thumbUrl: string;
  alt: string;
  kind: MediaKind;
  isPrimary: boolean;
}

export interface ProductGallery {
  productId: string;
  items: ProductGalleryItem[];
}
