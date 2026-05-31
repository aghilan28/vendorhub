// MCP-0A — Content + perceptual hashing (server-only; uses node:crypto).
// Kept separate from processing.ts so client bundles never pull node:crypto.

import { createHash } from "node:crypto";

/** Content hash for dedup/integrity. Accepts bytes or a string surrogate. */
export function hashContent(data: Buffer | Uint8Array | string): string {
  return createHash("sha256").update(data).digest("hex");
}

/**
 * Deterministic perceptual hash surrogate derived from coarse dimensional +
 * byte buckets. (Real pHash runs in the worker with pixels.)
 */
export function perceptualHash(input: {
  width: number;
  height: number;
  bytes: number;
  sha256: string;
}): string {
  const ar = input.height ? Math.round((input.width / input.height) * 8) : 0;
  const sizeBucket = Math.round(Math.log2(Math.max(1, input.bytes)));
  return `p_${ar}_${sizeBucket}_${input.sha256.slice(0, 12)}`;
}
