import { normalizeCommerceText } from "@/lib/commerce-foundation";
import type { BrandEngine } from "./engine";
import type { Brand } from "./types";

export interface BrandSearchDocument {
  brandId: string;
  name: string;
  slug: string;
  companyName: string | null;
  /** Normalized, de-duplicated tokens from name, aliases, company name + aliases, departments. */
  tokens: string[];
  aliases: string[];
  departments: string[];
  industry: string;
  fuzzyReady: boolean;
  semanticReady: boolean;
}

/**
 * Search-readiness projection (Phase 6). Produces brand search documents (with company + alias
 * surface forms for misspellings/abbreviations such as HUL → Hindustan Unilever). Builds
 * search-ready structures; it does not perform search.
 */
export function buildBrandSearchIndex(engine: BrandEngine): BrandSearchDocument[] {
  return engine.brands().map((brand) => {
    const company = brand.companyId ? engine.getCompany(brand.companyId) : undefined;
    const surfaceForms = [
      brand.name,
      ...brand.aliases,
      ...Object.values(brand.localizedNames),
      ...(company ? [company.name, ...company.aliases] : []),
    ].filter(Boolean);

    const tokens = Array.from(new Set(surfaceForms.flatMap((value) => normalizeCommerceText(value).split(" ")))).filter(Boolean).sort();

    return {
      brandId: brand.id,
      name: brand.name,
      slug: brand.slug,
      companyName: company?.name ?? null,
      tokens,
      aliases: Array.from(new Set(brand.aliases)).sort(),
      departments: [...brand.departments].sort(),
      industry: brand.industry,
      fuzzyReady: tokens.length > 0,
      semanticReady: tokens.length > 0,
    };
  });
}

/** Maps normalized token -> brandIds (brand + alias + company synonym grouping). */
export function buildBrandSynonymGroups(engine: BrandEngine): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  for (const document of buildBrandSearchIndex(engine)) {
    const terms = new Set<string>([...document.tokens, ...document.aliases.map((alias) => normalizeCommerceText(alias))]);
    for (const term of terms) {
      if (!term) continue;
      const bucket = groups.get(term) ?? [];
      if (!bucket.includes(document.brandId)) bucket.push(document.brandId);
      groups.set(term, bucket);
    }
  }
  return groups;
}

/** Resolves brands discoverable via a free-text term (matches names, aliases, company synonyms). */
export function brandsForSearchTerm(engine: BrandEngine, term: string): Brand[] {
  const tokens = normalizeCommerceText(term).split(" ").filter(Boolean);
  if (!tokens.length) return [];
  const groups = buildBrandSynonymGroups(engine);
  const matches = new Set<string>();
  for (const token of tokens) {
    for (const brandId of groups.get(token) ?? []) matches.add(brandId);
  }
  return Array.from(matches)
    .map((id) => engine.getBrand(id))
    .filter((brand): brand is Brand => Boolean(brand));
}
