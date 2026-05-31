// MCP-1B — Catalog Population engine domain types.
//
// Deterministic + pure. Operates on the real MCP-0B catalog shapes
// (CatalogProductInput / GeneratedProduct / ImportReport) and reuses the
// MCP-0A media engine. Runs identically on live data and the labelled sample.

export type Tone = "healthy" | "watch" | "degraded" | "critical";
export type Severity = "info" | "opportunity" | "watch" | "warning" | "critical";

// ── Import Platform V2 ────────────────────────────────────────────────────────

export type ImportChunkState = "pending" | "processing" | "done" | "failed";

export interface ImportChunk {
  index: number;
  from: number;
  to: number;
  size: number;
  state: ImportChunkState;
  attempts: number;
  valid: number;
  invalid: number;
  publishable: number;
}

export type ImportJobState = "queued" | "running" | "completed" | "completed_with_errors" | "failed";

export interface ImportJobV2 {
  id: string;
  sellerId: string;
  fileName: string;
  totalRows: number;
  chunkSize: number;
  chunks: ImportChunk[];
  state: ImportJobState;
  createdAt: string;
  maxAttempts: number;
}

export interface ImportProgress {
  totalRows: number;
  processedRows: number;
  totalChunks: number;
  doneChunks: number;
  failedChunks: number;
  percent: number;
  publishable: number;
  invalid: number;
}

export interface ImportAnalytics {
  jobs: number;
  rows: number;
  publishable: number;
  invalid: number;
  publishRate: number; // 0..100
  errorRate: number; // 0..100
  retries: number;
  throughputRowsPerChunk: number;
}

export interface ImportQueueItem {
  jobId: string;
  sellerId: string;
  fileName: string;
  totalRows: number;
  state: ImportJobState;
  percent: number;
  createdAt: string;
}

// ── Media population ──────────────────────────────────────────────────────────

export interface MediaAssetInput {
  ref: string;
  url: string;
  bytes?: number;
  width?: number;
  height?: number;
  hash?: string;
}

export interface MediaAssetReport {
  ref: string;
  url: string;
  qualityScore: number; // 0..100
  flags: string[];
  duplicateOf?: string;
  needsCompression: boolean;
  needsThumbnail: boolean;
}

export interface MediaPopulationReport {
  total: number;
  acceptable: number;
  flagged: number;
  duplicates: number;
  averageQuality: number;
  toCompress: number;
  toThumbnail: number;
  assets: MediaAssetReport[];
}

// ── Variant expansion ─────────────────────────────────────────────────────────

import type { GeneratedVariant, VariantAxis } from "@/lib/catalog";

export interface VariantSetDef {
  id: string;
  label: string;
  axes: VariantAxis[];
  description: string;
}

export interface VariantBuildResult {
  setId: string;
  axes: VariantAxis[];
  variants: GeneratedVariant[];
  count: number;
  uniqueSkus: number;
  ok: boolean;
  errors: string[];
}

export interface VariantRecommendation {
  categorySlug: string;
  recommendedAxes: VariantAxis[];
  reason: string;
}

// ── Catalog quality platform ──────────────────────────────────────────────────

export interface CatalogQualityReport {
  products: number;
  catalogHealth: number; // 0..100
  tone: Tone;
  averageProductQuality: number;
  averageMediaQuality: number;
  attributeCompleteness: number; // 0..100
  duplicateRisk: number; // 0..100 (higher worse)
  withMedia: number;
  withoutMedia: number;
  poorQuality: number;
  bands: { excellent: number; good: number; fair: number; poor: number };
  recommendations: CatalogRecommendation[];
}

export interface CatalogRecommendation {
  id: string;
  kind: "media" | "attributes" | "duplicates" | "quality" | "coverage" | "variants";
  severity: Severity;
  title: string;
  detail: string;
  action: string;
  score: number;
}

// ── Discovery readiness ───────────────────────────────────────────────────────

export interface Facet {
  key: string;
  label: string;
  values: Array<{ value: string; count: number }>;
}

export interface DiscoveryReadiness {
  products: number;
  searchableProducts: number;
  searchCoverage: number; // 0..100
  facets: Facet[];
  filterableAttributes: string[];
  sortOptions: string[];
  categoriesCovered: number;
  collections: number;
  readinessScore: number; // 0..100
  tone: Tone;
  gaps: string[];
}

// ── Taxonomy extensions ───────────────────────────────────────────────────────

export interface Collection {
  id: string;
  name: string;
  description: string;
  rule: { kind: "category" | "brand" | "tag" | "price_below"; value: string };
  productCount: number;
}

export interface BrandNode {
  brand: string;
  productCount: number;
  categories: string[];
}

export interface TaxonomyAudit {
  rootCategories: number;
  totalNodes: number;
  maxDepth: number;
  categoriesWithProducts: number;
  emptyCategories: number;
  coverage: number; // 0..100
  brands: number;
  tags: number;
  collections: number;
}

// ── Seller catalog operations ─────────────────────────────────────────────────

export interface CatalogAlert {
  id: string;
  kind: "quality" | "media" | "variant" | "import" | "duplicate" | "coverage";
  severity: Severity;
  title: string;
  detail: string;
  href: string;
}

export interface SellerCatalogSnapshot {
  sellerId: string;
  products: number;
  published: number;
  catalogHealth: number;
  importHealth: number;
  mediaHealth: number;
  quality: CatalogQualityReport;
  alerts: CatalogAlert[];
  briefing: string[];
}

// ── Admin catalog governance ──────────────────────────────────────────────────

export type CatalogQueueKind = "catalog" | "quality" | "duplicate" | "media" | "import" | "risk";

export interface CatalogQueueItem {
  id: string;
  ref: string;
  label: string;
  queue: CatalogQueueKind;
  severity: Severity;
  summary: string;
}

export interface CatalogQueue {
  kind: CatalogQueueKind;
  label: string;
  items: CatalogQueueItem[];
}

export interface CatalogGovernanceSnapshot {
  queues: CatalogQueue[];
  totalPending: number;
  catalogHealth: number;
  tone: Tone;
  products: number;
  publishedProducts: number;
  duplicateRisk: number;
}

// ── Population intelligence ───────────────────────────────────────────────────

export interface CategoryCoverage {
  rootSlug: string;
  name: string;
  products: number;
  sellers: number;
  coverage: number; // 0..100 relative to richest root
  status: "rich" | "growing" | "thin" | "empty";
}

export type PopulationRecommendationKind =
  | "missing_category"
  | "category_gap"
  | "variant_gap"
  | "growth_opportunity"
  | "coverage";

export interface PopulationRecommendation {
  id: string;
  kind: PopulationRecommendationKind;
  severity: Severity;
  refId: string;
  title: string;
  detail: string;
  action: string;
  score: number;
}

export interface PopulationForecast {
  currentProducts: number;
  currentCategories: number;
  projected30d: number;
  projected90d: number;
  targetProducts: number;
  targetProgress: number; // 0..100
}

export interface PopulationIntelligence {
  coverage: CategoryCoverage[];
  recommendations: PopulationRecommendation[];
  forecast: PopulationForecast;
  emptyCategories: string[];
  thinCategories: string[];
}
