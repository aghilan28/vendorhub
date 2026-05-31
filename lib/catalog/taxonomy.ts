// MCP-0B — Master Commerce Taxonomy (loaded from the shared JSON source)

import taxonomyData from "@/config/catalog/taxonomy.json";
import type { TaxonomyNode, VariantAxis } from "./types";

interface RawSub {
  slug: string;
  name: string;
  attrFamily?: string;
  variantAxes?: string[];
  keywords?: string[];
}
interface RawRoot extends RawSub {
  subcategories?: RawSub[];
}
interface RawTaxonomy {
  version: string;
  roots: RawRoot[];
}

const raw = taxonomyData as unknown as RawTaxonomy;

function flatten(): TaxonomyNode[] {
  const nodes: TaxonomyNode[] = [];
  for (const root of raw.roots) {
    nodes.push({
      slug: root.slug,
      name: root.name,
      parentSlug: null,
      attrFamily: root.attrFamily ?? "generic",
      variantAxes: (root.variantAxes ?? []) as VariantAxis[],
      keywords: root.keywords ?? [],
      depth: 0,
    });
    for (const sub of root.subcategories ?? []) {
      nodes.push({
        slug: sub.slug,
        name: sub.name,
        parentSlug: root.slug,
        attrFamily: sub.attrFamily ?? root.attrFamily ?? "generic",
        variantAxes: (sub.variantAxes ?? root.variantAxes ?? []) as VariantAxis[],
        keywords: [...(root.keywords ?? []), ...(sub.keywords ?? [])],
        depth: 1,
      });
    }
  }
  return nodes;
}

export const taxonomyVersion = raw.version;
export const taxonomyNodes: TaxonomyNode[] = flatten();

const bySlug = new Map<string, TaxonomyNode>(taxonomyNodes.map((n) => [n.slug, n]));

export const rootCategories = taxonomyNodes.filter((n) => n.depth === 0);
export const leafCategories = taxonomyNodes.filter((n) => n.depth === 1);

export function getCategory(slug: string): TaxonomyNode | undefined {
  return bySlug.get(slug);
}

export function isKnownCategory(slug: string): boolean {
  return bySlug.has(slug);
}

export function rootSlugFor(slug: string): string | null {
  const node = bySlug.get(slug);
  if (!node) return null;
  return node.parentSlug ?? node.slug;
}

export function childrenOf(slug: string): TaxonomyNode[] {
  return taxonomyNodes.filter((n) => n.parentSlug === slug);
}

export function categoryPath(slug: string): TaxonomyNode[] {
  const node = bySlug.get(slug);
  if (!node) return [];
  if (!node.parentSlug) return [node];
  const parent = bySlug.get(node.parentSlug);
  return parent ? [parent, node] : [node];
}
