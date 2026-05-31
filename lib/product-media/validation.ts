import { MINIMUM_QUALITY_WIDTH, isWellFormedUrl } from "./urls";
import {
  SUPPORTED_IMAGE_FORMATS,
  THUMBNAIL_VARIANTS,
  type MediaAsset,
  type MediaValidationIssue,
  type MediaValidationReport,
  type ProductMediaSet,
} from "./types";

export interface MediaValidationOptions {
  minimumQualityWidth?: number;
}

function validateAsset(asset: MediaAsset, issues: MediaValidationIssue[], minWidth: number): void {
  if (!isWellFormedUrl(asset.url)) {
    issues.push({ code: "BROKEN_URL", severity: "error", entityId: asset.id, message: `Asset "${asset.id}" has a malformed URL.`, detail: { url: asset.url } });
  }
  if (asset.kind !== "VIDEO" && asset.kind !== "AR" && !SUPPORTED_IMAGE_FORMATS.includes(asset.format)) {
    issues.push({ code: "UNSUPPORTED_FORMAT", severity: "error", entityId: asset.id, message: `Asset "${asset.id}" uses unsupported format "${asset.format}".`, detail: { format: asset.format } });
  }
  if (asset.width <= 0 || asset.height <= 0) {
    issues.push({ code: "INVALID_DIMENSIONS", severity: "error", entityId: asset.id, message: `Asset "${asset.id}" has invalid dimensions ${asset.width}x${asset.height}.` });
  } else if (asset.width < minWidth) {
    issues.push({ code: "LOW_QUALITY", severity: "warning", entityId: asset.id, message: `Asset "${asset.id}" width ${asset.width} is below quality threshold ${minWidth}.` });
  }
  if (asset.isPlaceholder) {
    issues.push({ code: "PLACEHOLDER_ASSET", severity: "warning", entityId: asset.id, message: `Asset "${asset.id}" is a placeholder.` });
  }
}

/**
 * Media validation engine (Phase 4). Detects broken URLs, missing primaries/thumbnails, invalid /
 * unsupported formats, invalid dimensions, low quality, placeholders and duplicate assets (by
 * checksum). Deterministic.
 */
export function validateMediaSets(sets: ProductMediaSet[], options: MediaValidationOptions = {}): MediaValidationReport {
  const minWidth = options.minimumQualityWidth ?? MINIMUM_QUALITY_WIDTH;
  const issues: MediaValidationIssue[] = [];
  const checksumOwners = new Map<string, Set<string>>();
  let checkedAssets = 0;

  for (const set of sets) {
    if (!set.primary) {
      issues.push({ code: "MISSING_PRIMARY", severity: "error", entityId: set.productId, message: `Product "${set.productId}" has no primary image.` });
    }
    for (const variant of THUMBNAIL_VARIANTS) {
      if (!set.thumbnails[variant]) {
        issues.push({ code: "MISSING_THUMBNAIL", severity: "warning", entityId: set.productId, message: `Product "${set.productId}" is missing the ${variant} thumbnail.` });
      }
    }
    for (const asset of set.gallery) {
      checkedAssets += 1;
      validateAsset(asset, issues, minWidth);
      const owners = checksumOwners.get(asset.checksum) ?? new Set<string>();
      owners.add(asset.productId);
      checksumOwners.set(asset.checksum, owners);
    }
  }

  for (const [checksum, owners] of checksumOwners) {
    if (owners.size > 1) {
      issues.push({ code: "DUPLICATE_ASSET", severity: "warning", entityId: Array.from(owners)[0], message: `Asset checksum "${checksum}" is shared by ${owners.size} products.`, detail: { owners: Array.from(owners) } });
    }
  }

  const errorCount = issues.filter((issue) => issue.severity === "error").length;
  const warningCount = issues.filter((issue) => issue.severity === "warning").length;
  return { valid: errorCount === 0, checkedAssets, errorCount, warningCount, issues };
}

/** Lower-level asset validation (used by governance/tests). */
export function validateAssets(assets: MediaAsset[], options: MediaValidationOptions = {}): MediaValidationReport {
  const minWidth = options.minimumQualityWidth ?? MINIMUM_QUALITY_WIDTH;
  const issues: MediaValidationIssue[] = [];
  const checksums = new Map<string, number>();
  for (const asset of assets) {
    validateAsset(asset, issues, minWidth);
    checksums.set(asset.checksum, (checksums.get(asset.checksum) ?? 0) + 1);
  }
  for (const [checksum, count] of checksums) {
    if (count > 1) issues.push({ code: "DUPLICATE_ASSET", severity: "warning", entityId: null, message: `Checksum "${checksum}" used ${count} times.` });
  }
  const errorCount = issues.filter((issue) => issue.severity === "error").length;
  return { valid: errorCount === 0, checkedAssets: assets.length, errorCount, warningCount: issues.length - errorCount, issues };
}
