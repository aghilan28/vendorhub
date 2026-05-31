// MCP-0B — Duplicate Detection Platform (Section MCP-0B.8)

import type { CatalogProductInput, DuplicateMatch } from "./types";

export function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenSet(value: string): Set<string> {
  return new Set(normalizeName(value).split(" ").filter((t) => t.length > 1));
}

/** Jaccard similarity between two product names (0..1). */
export function nameSimilarity(a: string, b: string): number {
  const sa = tokenSet(a);
  const sb = tokenSet(b);
  if (sa.size === 0 || sb.size === 0) return 0;
  let inter = 0;
  for (const t of sa) if (sb.has(t)) inter += 1;
  const union = sa.size + sb.size - inter;
  return union === 0 ? 0 : inter / union;
}

export interface DedupItem {
  ref: string;
  name: string;
  brand?: string;
  sku?: string;
}

/**
 * Detects duplicates across a batch: exact (name+brand), near (name similarity),
 * and SKU collisions. The first occurrence is canonical.
 */
export function detectDuplicates(items: DedupItem[], nearThreshold = 0.82): DuplicateMatch[] {
  const matches: DuplicateMatch[] = [];
  const exactKey = new Map<string, string>();
  const skuOwner = new Map<string, string>();
  const canonical: DedupItem[] = [];

  for (const item of items) {
    if (item.sku) {
      const owner = skuOwner.get(item.sku.toLowerCase());
      if (owner) {
        matches.push({ ref: item.ref, duplicateOf: owner, kind: "sku_collision", confidence: 1 });
        continue;
      }
      skuOwner.set(item.sku.toLowerCase(), item.ref);
    }

    const key = `${normalizeName(item.name)}|${(item.brand ?? "").toLowerCase()}`;
    const exact = exactKey.get(key);
    if (exact) {
      matches.push({ ref: item.ref, duplicateOf: exact, kind: "exact", confidence: 1 });
      continue;
    }

    const near = canonical.find((c) => nameSimilarity(c.name, item.name) >= nearThreshold);
    if (near) {
      matches.push({
        ref: item.ref,
        duplicateOf: near.ref,
        kind: "near",
        confidence: Math.round(nameSimilarity(near.name, item.name) * 100) / 100,
      });
      continue;
    }

    exactKey.set(key, item.ref);
    canonical.push(item);
  }

  return matches;
}

export function toDedupItem(ref: string, input: CatalogProductInput): DedupItem {
  return { ref, name: input.name, brand: input.brand, sku: input.sku };
}
