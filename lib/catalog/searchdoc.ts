// MCP-0B — Search document builder (catalog → searchable text)

import { categoryPath, getCategory } from "./taxonomy";
import type { CatalogProductInput } from "./types";

function normalize(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Builds the searchable text for a product: name + brand + category path +
 * category keywords + searchable attribute values. Mirrors what the DB
 * `search_document` and the vector embedding consume.
 */
export function buildSearchDocument(input: CatalogProductInput): string {
  const node = getCategory(input.categorySlug);
  const path = categoryPath(input.categorySlug).map((n) => n.name);
  const attrValues = Object.values(input.attributes ?? {}).map((v) => String(v));
  const tokens = [
    input.name,
    input.brand ?? "",
    ...path,
    ...(node?.keywords ?? []),
    ...attrValues,
    input.description ?? "",
  ];
  return normalize(tokens.filter(Boolean).join(" "));
}

/** Distinct keyword tokens (for lightweight token search / dedup). */
export function searchTokens(input: CatalogProductInput): string[] {
  return Array.from(new Set(buildSearchDocument(input).split(" ").filter((t) => t.length > 1)));
}
