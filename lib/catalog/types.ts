// MCP-0B — Catalog domain types (deterministic, dependency-light)

export type AttributeType = "text" | "number" | "enum" | "unit" | "boolean";

export interface AttributeDef {
  key: string;
  label: string;
  type: AttributeType;
  required: boolean;
  unit?: string;
  options?: string[];
  filterable: boolean;
  searchable: boolean;
}

export type VariantAxis =
  | "color"
  | "size"
  | "pack_size"
  | "weight"
  | "volume"
  | "configuration"
  | "material"
  | "style"
  | "storage";

export interface TaxonomyNode {
  slug: string;
  name: string;
  parentSlug: string | null;
  attrFamily: string;
  variantAxes: VariantAxis[];
  keywords: string[];
  depth: number;
}

export interface CatalogProductInput {
  externalId?: string;
  name: string;
  description?: string;
  categorySlug: string;
  brand?: string;
  sku?: string;
  price: number;
  currency?: string;
  stock?: number;
  attributes?: Record<string, string | number | boolean>;
  imageUrls?: string[];
  variantAxes?: VariantAxis[];
}

export interface GeneratedVariant {
  sku: string;
  name: string;
  attributes: Record<string, string>;
  priceDelta: number;
  stock: number;
}

export interface GeneratedProduct {
  externalId: string;
  name: string;
  slug: string;
  description: string;
  categorySlug: string;
  rootSlug: string;
  brand: string;
  sku: string;
  price: number;
  currency: string;
  stock: number;
  attributes: Record<string, string | number | boolean>;
  variants: GeneratedVariant[];
  searchDocument: string;
  imageUrl: string;
  qualityScore: number;
}

export interface CatalogQuality {
  score: number; // 0..100
  flags: string[];
  missingFields: string[];
}

export type DuplicateKind = "exact" | "near" | "sku_collision" | "brand_collision";

export interface DuplicateMatch {
  ref: string;
  duplicateOf: string;
  kind: DuplicateKind;
  confidence: number;
}

export type RowStatus = "valid" | "invalid" | "duplicate" | "warning";

export interface ValidatedRow {
  ref: string;
  status: RowStatus;
  errors: string[];
  warnings: string[];
  quality: CatalogQuality;
  normalized: CatalogProductInput | null;
}

export interface ImportReport {
  total: number;
  valid: number;
  invalid: number;
  duplicates: number;
  warnings: number;
  averageQuality: number;
  rows: ValidatedRow[];
  batches: number;
}
