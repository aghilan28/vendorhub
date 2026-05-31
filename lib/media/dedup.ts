// MCP-0A — Duplicate Detection (deterministic, hash-based)

export interface HashedAsset {
  assetId: string;
  sha256: string;
  perceptual: string;
}

export interface DuplicateMatch {
  assetId: string;
  duplicateOf: string;
  kind: "exact" | "near";
}

/** Hamming-style distance between two equal-length perceptual hash suffixes. */
function perceptualDistance(a: string, b: string): number {
  if (a === b) return 0;
  const [, arA = "", szA = "", hexA = ""] = a.split("_");
  const [, arB = "", szB = "", hexB = ""] = b.split("_");
  let dist = 0;
  if (arA !== arB) dist += 4;
  if (szA !== szB) dist += 2;
  const len = Math.min(hexA.length, hexB.length);
  for (let i = 0; i < len; i += 1) if (hexA[i] !== hexB[i]) dist += 1;
  return dist + Math.abs(hexA.length - hexB.length);
}

/**
 * Finds exact (sha256) and near (perceptual) duplicates against an existing set.
 * The first occurrence is treated as canonical; later matches are flagged.
 */
export function findDuplicates(assets: HashedAsset[], nearThreshold = 2): DuplicateMatch[] {
  const matches: DuplicateMatch[] = [];
  const seenSha = new Map<string, string>();
  const canonical: HashedAsset[] = [];

  for (const asset of assets) {
    const exact = seenSha.get(asset.sha256);
    if (exact) {
      matches.push({ assetId: asset.assetId, duplicateOf: exact, kind: "exact" });
      continue;
    }
    const near = canonical.find((c) => perceptualDistance(c.perceptual, asset.perceptual) <= nearThreshold);
    if (near) {
      matches.push({ assetId: asset.assetId, duplicateOf: near.assetId, kind: "near" });
      continue;
    }
    seenSha.set(asset.sha256, asset.assetId);
    canonical.push(asset);
  }

  return matches;
}

/** True if a candidate hash duplicates any asset in the corpus. */
export function isDuplicate(candidate: HashedAsset, corpus: HashedAsset[], nearThreshold = 2): boolean {
  return corpus.some(
    (c) => c.sha256 === candidate.sha256 || perceptualDistance(c.perceptual, candidate.perceptual) <= nearThreshold,
  );
}
