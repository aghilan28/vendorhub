// MCP-1B Phase 5 — Media Population Engine (deterministic, pure).
//
// Extends MCP-0A: bulk image planning (reuses `parseCsvManifest`/`planIngestion`/
// `computeProgress`/`resumableRows`) plus image validation, quality scoring,
// deduplication, compression + thumbnail planning, and media analytics.

import type { MediaAssetInput, MediaAssetReport, MediaPopulationReport } from "./types";

// thresholds (documented assumptions; byte transforms run in the 0A async worker)
const MIN_DIMENSION = 600;
const MAX_BYTES = 1_500_000; // 1.5MB → flag for compression
const THUMBNAIL_DIMENSION = 400;

function looksValidUrl(url: string): boolean {
  return /^https?:\/\/.+/.test(url) || url.startsWith("/") || /\.(jpg|jpeg|png|webp|gif)$/i.test(url);
}

/** Score a single media asset 0..100 with flags. */
export function scoreMediaAsset(asset: MediaAssetInput): MediaAssetReport {
  const flags: string[] = [];
  let score = 100;

  if (!looksValidUrl(asset.url)) {
    flags.push("invalid_url");
    score -= 50;
  }
  const minDim = Math.min(asset.width ?? MIN_DIMENSION, asset.height ?? MIN_DIMENSION);
  if (asset.width && asset.height) {
    if (minDim < MIN_DIMENSION) {
      flags.push("low_resolution");
      score -= 30;
    }
    const ratio = asset.width / asset.height;
    if (ratio < 0.5 || ratio > 2) {
      flags.push("extreme_aspect_ratio");
      score -= 10;
    }
  } else {
    flags.push("dimensions_unknown");
    score -= 8;
  }
  const needsCompression = (asset.bytes ?? 0) > MAX_BYTES;
  if (needsCompression) {
    flags.push("oversized");
    score -= 8;
  }
  const needsThumbnail = !asset.width || asset.width > THUMBNAIL_DIMENSION;

  return {
    ref: asset.ref,
    url: asset.url,
    qualityScore: Math.max(0, Math.min(100, score)),
    flags,
    needsCompression,
    needsThumbnail,
  };
}

/** Plan a bulk media population: validate + quality + dedupe + transform plan. */
export function planMediaPopulation(assets: MediaAssetInput[]): MediaPopulationReport {
  const seenHash = new Map<string, string>();
  const seenUrl = new Map<string, string>();
  const reports: MediaAssetReport[] = assets.map((asset) => {
    const report = scoreMediaAsset(asset);
    // exact dedup by hash, then by url
    const key = asset.hash ?? "";
    if (key && seenHash.has(key)) {
      report.duplicateOf = seenHash.get(key);
      if (!report.flags.includes("duplicate")) report.flags.push("duplicate");
    } else if (seenUrl.has(asset.url)) {
      report.duplicateOf = seenUrl.get(asset.url);
      if (!report.flags.includes("duplicate")) report.flags.push("duplicate");
    } else {
      if (key) seenHash.set(key, asset.ref);
      seenUrl.set(asset.url, asset.ref);
    }
    return report;
  });

  const duplicates = reports.filter((r) => r.duplicateOf).length;
  const flagged = reports.filter((r) => r.flags.some((f) => f !== "dimensions_unknown" && f !== "duplicate")).length;
  const acceptable = reports.filter((r) => r.qualityScore >= 60 && !r.duplicateOf).length;
  const averageQuality = reports.length ? Math.round(reports.reduce((s, r) => s + r.qualityScore, 0) / reports.length) : 0;

  return {
    total: reports.length,
    acceptable,
    flagged,
    duplicates,
    averageQuality,
    toCompress: reports.filter((r) => r.needsCompression && !r.duplicateOf).length,
    toThumbnail: reports.filter((r) => r.needsThumbnail && !r.duplicateOf).length,
    assets: reports,
  };
}

/** Media governance: is the batch safe to attach to the catalog? */
export function mediaGovernance(report: MediaPopulationReport): { canAttach: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (report.total === 0) reasons.push("No media to attach.");
  if (report.acceptable === 0 && report.total > 0) reasons.push("No acceptable-quality media in the batch.");
  if (report.averageQuality < 50 && report.total > 0) reasons.push(`Average media quality ${report.averageQuality} is below the 50 attach floor.`);
  return { canAttach: reasons.length === 0, reasons };
}

// Re-export the 0A bulk primitives so media population is one import surface.
export { parseCsvManifest, planIngestion, computeProgress, resumableRows } from "@/lib/media/bulk";
