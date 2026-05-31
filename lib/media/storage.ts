// MCP-0A — Storage Architecture (deterministic config + URL/path helpers)

import { env } from "@/lib/env";
import type { BucketId, VariantPurpose } from "./types";

export interface BucketPolicy {
  id: BucketId;
  public: boolean;
  maxBytes: number;
  allowedMime: string[];
  /** Retention in days for transient buckets; null = permanent. */
  retentionDays: number | null;
  description: string;
}

const IMAGE_MIME = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"];

/** The ten production buckets provisioned by the storage migration. */
export const BUCKET_POLICIES: Record<BucketId, BucketPolicy> = {
  "product-images": { id: "product-images", public: true, maxBytes: 15_000_000, allowedMime: IMAGE_MIME, retentionDays: null, description: "Original seller product images" },
  "product-thumbnails": { id: "product-thumbnails", public: true, maxBytes: 2_000_000, allowedMime: ["image/webp", "image/jpeg"], retentionDays: null, description: "Generated small thumbnails" },
  "product-webp": { id: "product-webp", public: true, maxBytes: 8_000_000, allowedMime: ["image/webp", "image/avif"], retentionDays: null, description: "Optimised next-gen renditions" },
  "brand-assets": { id: "brand-assets", public: true, maxBytes: 8_000_000, allowedMime: IMAGE_MIME, retentionDays: null, description: "Brand logos and assets" },
  "store-assets": { id: "store-assets", public: true, maxBytes: 12_000_000, allowedMime: IMAGE_MIME, retentionDays: null, description: "Store banners and assets" },
  "category-assets": { id: "category-assets", public: true, maxBytes: 8_000_000, allowedMime: IMAGE_MIME, retentionDays: null, description: "Category hero imagery" },
  "marketing-assets": { id: "marketing-assets", public: true, maxBytes: 20_000_000, allowedMime: IMAGE_MIME, retentionDays: null, description: "Campaign and marketing media" },
  "temp-uploads": { id: "temp-uploads", public: false, maxBytes: 25_000_000, allowedMime: IMAGE_MIME, retentionDays: 2, description: "Pre-processing staging area" },
  "moderation-review": { id: "moderation-review", public: false, maxBytes: 25_000_000, allowedMime: IMAGE_MIME, retentionDays: 30, description: "Assets awaiting moderation" },
  archive: { id: "archive", public: false, maxBytes: 25_000_000, allowedMime: IMAGE_MIME, retentionDays: 365, description: "Soft-deleted / superseded media" },
};

export const ALL_BUCKETS = Object.keys(BUCKET_POLICIES) as BucketId[];

export function getBucketPolicy(bucket: BucketId): BucketPolicy {
  return BUCKET_POLICIES[bucket];
}

/**
 * Deterministic storage object path for a product asset:
 * `vendors/{vendorId}/products/{productId}/{assetId}.{ext}`.
 */
export function productImagePath(input: {
  vendorId: string;
  productId: string;
  assetId: string;
  ext: string;
}): string {
  const ext = input.ext.replace(/^\./, "").toLowerCase();
  return `vendors/${input.vendorId}/products/${input.productId}/${input.assetId}.${ext}`;
}

export function variantPath(originalPath: string, purpose: VariantPurpose, ext: string): string {
  const dir = originalPath.replace(/\/[^/]+$/, "");
  const base = originalPath.split("/").pop()?.replace(/\.[^.]+$/, "") ?? originalPath;
  const e = ext.replace(/^\./, "").toLowerCase();
  return `${dir}/${base}__${purpose}.${e}`;
}

/** True when the string is already an absolute URL. */
export function isAbsoluteUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

/**
 * Builds the public URL for a storage object. If the supplied value is already
 * an absolute URL (e.g. seeded Unsplash images), it is returned unchanged.
 * Returns null when the storage origin is not configured and the value is a
 * bare path (so callers can render a graceful fallback).
 */
export function buildPublicUrl(bucket: BucketId, pathOrUrl: string | null | undefined): string | null {
  if (!pathOrUrl) return null;
  if (isAbsoluteUrl(pathOrUrl)) return pathOrUrl;
  const origin = env.supabaseUrl;
  if (!origin) return null;
  const clean = pathOrUrl.replace(/^\/+/, "");
  return `${origin}/storage/v1/object/public/${bucket}/${clean}`;
}

/**
 * Resolves a stored product image reference (path or URL) to a renderable URL,
 * defaulting to the product-images bucket. This fixes the audit finding where
 * raw `storage_path` was used directly as an <Image src>.
 */
export function resolveProductImageUrl(pathOrUrl: string | null | undefined): string | null {
  return buildPublicUrl(env.storage.productImagesBucket as BucketId, pathOrUrl);
}

/** The Supabase storage hostname (for next.config remotePatterns), if configured. */
export function storageHostname(): string | null {
  if (!env.supabaseUrl) return null;
  try {
    return new URL(env.supabaseUrl).hostname;
  } catch {
    return null;
  }
}
