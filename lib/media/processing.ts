// MCP-0A — Media Processing Pipeline (Section MCP-0A.6)
// Deterministic planning + validation for the ingest pipeline. Client-safe
// (no node:crypto here — see hash.ts). The actual byte-level transforms
// (resize/encode) run in the worker; this module decides WHAT must happen,
// validates inputs, and produces an audited plan.

import { getBucketPolicy } from "./storage";
import type { BucketId, MediaFormat, MediaTransformation, VariantPurpose } from "./types";

export interface UploadCandidate {
  filename: string;
  mime: string;
  bytes: number;
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  format: MediaFormat;
}

const MIME_FORMAT: Record<string, MediaFormat> = {
  "image/jpeg": "jpeg",
  "image/jpg": "jpeg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
};

export function detectFormat(mime: string): MediaFormat {
  return MIME_FORMAT[mime.toLowerCase()] ?? "unknown";
}

/** Validates an upload candidate against the target bucket policy. */
export function validateUpload(candidate: UploadCandidate, bucket: BucketId): ValidationResult {
  const policy = getBucketPolicy(bucket);
  const errors: string[] = [];
  const format = detectFormat(candidate.mime);

  if (!candidate.filename || candidate.filename.length > 240) errors.push("invalid_filename");
  if (!policy.allowedMime.includes(candidate.mime.toLowerCase())) errors.push("unsupported_mime");
  if (candidate.bytes <= 0) errors.push("empty_file");
  if (candidate.bytes > policy.maxBytes) errors.push("file_too_large");
  if (format === "unknown") errors.push("unknown_format");

  return { ok: errors.length === 0, errors, format };
}

/** Target rendition sizes for product imagery (long-edge px). */
export const VARIANT_SPECS: Array<{ purpose: VariantPurpose; longEdge: number; format: MediaFormat; bucket: BucketId }> = [
  { purpose: "thumbnail", longEdge: 200, format: "webp", bucket: "product-thumbnails" },
  { purpose: "card", longEdge: 480, format: "webp", bucket: "product-webp" },
  { purpose: "gallery", longEdge: 1080, format: "webp", bucket: "product-webp" },
  { purpose: "zoom", longEdge: 2000, format: "webp", bucket: "product-webp" },
  { purpose: "avif", longEdge: 1080, format: "avif", bucket: "product-webp" },
];

export interface VariantPlanItem {
  purpose: VariantPurpose;
  format: MediaFormat;
  bucket: BucketId;
  targetLongEdge: number;
}

/**
 * Plans the renditions to generate from an original of the given dimensions.
 * Never upscales: variants larger than the source are skipped.
 */
export function planVariants(originalLongEdge: number): VariantPlanItem[] {
  return VARIANT_SPECS.filter((spec) => spec.longEdge <= originalLongEdge || spec.purpose === "thumbnail").map(
    (spec) => ({
      purpose: spec.purpose,
      format: spec.format,
      bucket: spec.bucket,
      targetLongEdge: Math.min(spec.longEdge, originalLongEdge),
    }),
  );
}

/** The ordered, audited pipeline steps for an asset. */
export function planPipeline(input: { kind: "image" | "video"; originalLongEdge: number }): MediaTransformation[] {
  const steps: MediaTransformation["step"][] = [
    "validate",
    "virus_scan",
    "moderation_scan",
    "decode_metadata",
    "hash",
    "duplicate_check",
    "compress",
    "resize",
    "thumbnail",
    "webp",
    "avif",
    "quality_score",
    "place_storage",
    "cdn_publish",
  ];
  const variants = planVariants(input.originalLongEdge);
  const hasAvif = variants.some((v) => v.format === "avif");
  return steps.map((step) => ({
    step,
    status:
      step === "avif" && !hasAvif
        ? "skipped"
        : input.kind === "video" && (step === "thumbnail" || step === "webp" || step === "avif")
          ? "skipped"
          : "pending",
  }));
}
