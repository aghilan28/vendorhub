// MCP-0A — Media platform engine (public surface)
// Deterministic, dependency-light core for the marketplace media pipeline.

export * from "./types";
export * from "./storage";
export * from "./quality";
export * from "./processing";
export * from "./hash";
export * from "./moderation";
export * from "./dedup";
export * from "./bulk";
export * from "./gallery";

import { autoModerate } from "./moderation";
import { hashContent, perceptualHash } from "./hash";
import { planPipeline, planVariants, validateUpload, type UploadCandidate } from "./processing";
import { scoreMediaQuality, type QualitySignals } from "./quality";
import type { BucketId, MediaMetadata } from "./types";

export interface IngestAnalysis {
  ok: boolean;
  errors: string[];
  quality: ReturnType<typeof scoreMediaQuality>;
  moderation: ReturnType<typeof autoModerate>;
  variants: ReturnType<typeof planVariants>;
  pipeline: ReturnType<typeof planPipeline>;
  hashes: { sha256: string; perceptual: string };
}

/**
 * End-to-end deterministic analysis of a single asset at ingest time:
 * validate → hash → quality → auto-moderate → plan variants + pipeline.
 * (The worker performs the actual byte transforms using this plan.)
 */
export function analyzeIngest(input: {
  candidate: UploadCandidate;
  bucket: BucketId;
  metadata: MediaMetadata;
  signals?: QualitySignals;
  contentSurrogate: string;
}): IngestAnalysis {
  const validation = validateUpload(input.candidate, input.bucket);
  const quality = scoreMediaQuality(input.metadata, input.signals);
  const moderation = autoModerate({ quality });
  const sha256 = hashContent(input.contentSurrogate);
  const perceptual = perceptualHash({
    width: input.metadata.width,
    height: input.metadata.height,
    bytes: input.metadata.bytes,
    sha256,
  });
  const longEdge = Math.max(input.metadata.width, input.metadata.height);

  return {
    ok: validation.ok,
    errors: validation.errors,
    quality,
    moderation,
    variants: planVariants(longEdge),
    pipeline: planPipeline({ kind: input.metadata.durationSeconds ? "video" : "image", originalLongEdge: longEdge }),
    hashes: { sha256, perceptual },
  };
}
