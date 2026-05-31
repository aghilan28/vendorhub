// MCP-1A Phase 4/5 — Product Population engine (deterministic, pure).
//
// Orchestrates the REAL MCP-0B catalog ingestion + generator engine into import
// jobs: parse (CSV/JSON/single) → validate → dedupe → quality → publishable
// gating, with reporting, recovery (retry-able refs), history and governance.
// Also exposes product-universe scaling capability (10k/100k/1M) for Phase 5.

import {
  analyzeImport,
  catalogDistribution,
  generateCatalog,
  parseCsv,
  parseJson,
  publishableRows,
  type CatalogProductInput,
  type ImportReport,
} from "@/lib/catalog";
import type { ImportHistoryEntry, ImportJob, ImportSource, ImportState, ImportTemplateColumn } from "./types";

export const IMPORT_TEMPLATE: ImportTemplateColumn[] = [
  { key: "name", label: "Product name", required: true, example: "Sona Masoori Rice 5kg" },
  { key: "category", label: "Category slug", required: true, example: "groceries-staples-rice" },
  { key: "price", label: "Price (INR)", required: true, example: "599" },
  { key: "sku", label: "SKU", required: false, example: "RICE-SONA-5KG" },
  { key: "brand", label: "Brand", required: false, example: "FreshLocal" },
  { key: "stock", label: "Inventory", required: false, example: "120" },
  { key: "description", label: "Description", required: false, example: "Premium aged Sona Masoori rice." },
  { key: "images", label: "Image URLs (| separated)", required: false, example: "https://.../1.jpg|https://.../2.jpg" },
];

/** Downloadable CSV template (header + one example row). */
export function importTemplateCsv(): string {
  const header = IMPORT_TEMPLATE.map((c) => c.key).join(",");
  const example = IMPORT_TEMPLATE.map((c) => `"${c.example}"`).join(",");
  return `${header}\n${example}\n`;
}

function reportState(report: ImportReport): ImportState {
  if (report.total === 0) return "failed";
  if (report.valid === 0) return "failed";
  if (report.invalid > 0 || report.duplicates > 0) return "partial";
  return "validated";
}

/** Build an import job from a validated report. */
export function buildImportJob(sellerId: string, source: ImportSource, report: ImportReport, at?: string): ImportJob {
  const publishable = publishableRows(report).length;
  const recoverableRefs = report.rows.filter((r) => r.status === "invalid" || r.status === "duplicate").map((r) => r.ref);
  return {
    id: `imp-${sellerId}-${at ?? Date.now()}`,
    sellerId,
    source,
    state: reportState(report),
    createdAt: at ?? new Date().toISOString(),
    total: report.total,
    valid: report.valid,
    invalid: report.invalid,
    duplicates: report.duplicates,
    warnings: report.warnings,
    publishable,
    averageQuality: report.averageQuality,
    recoverableRefs,
  };
}

export interface ImportResult {
  report: ImportReport;
  job: ImportJob;
  publishable: CatalogProductInput[];
  parseErrors: string[];
}

/** Import from raw CSV text. */
export function importCsv(sellerId: string, csv: string, at?: string): ImportResult {
  const parsed = parseCsv(csv);
  const report = analyzeImport(parsed.rows);
  return { report, job: buildImportJob(sellerId, "csv", report, at), publishable: publishableRows(report), parseErrors: parsed.errors };
}

/** Import from raw JSON text. */
export function importJson(sellerId: string, json: string, at?: string): ImportResult {
  const parsed = parseJson(json);
  const report = analyzeImport(parsed.rows);
  return { report, job: buildImportJob(sellerId, "json", report, at), publishable: publishableRows(report), parseErrors: parsed.errors };
}

/** Single-product creation routed through the same validation pipeline. */
export function importSingle(sellerId: string, product: CatalogProductInput, at?: string): ImportResult {
  const report = analyzeImport([product]);
  return { report, job: buildImportJob(sellerId, "single", report, at), publishable: publishableRows(report), parseErrors: [] };
}

/** Record a completed import into history. */
export function toHistoryEntry(job: ImportJob): ImportHistoryEntry {
  return {
    jobId: job.id,
    sellerId: job.sellerId,
    source: job.source,
    at: job.createdAt,
    published: job.publishable,
    rejected: job.total - job.publishable,
    state: job.state,
  };
}

/** Import governance: is the job safe to publish, and why/why not. */
export function importGovernance(job: ImportJob): { canPublish: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (job.publishable === 0) reasons.push("No publishable rows.");
  if (job.averageQuality < 40) reasons.push(`Average quality ${job.averageQuality} is below the 40 publish floor.`);
  if (job.invalid > job.valid) reasons.push("More invalid than valid rows — review the file.");
  return { canPublish: reasons.length === 0, reasons };
}

// ── Phase 5: Product universe scaling ────────────────────────────────────────

export interface UniverseScaleResult {
  count: number;
  uniqueSlugs: number;
  uniqueSkus: number;
  rootCategories: number;
  averageQuality: number;
  variants: number;
  withMedia: number;
  searchable: number;
}

/**
 * Validate product-universe scaling at a target count using the deterministic
 * generator. Proves taxonomy spread, uniqueness, media and searchability hold.
 */
export function validateUniverseScale(count: number, seed = "mcp1a"): UniverseScaleResult {
  const products = generateCatalog(count, seed);
  const slugs = new Set(products.map((p) => p.slug));
  const skus = new Set(products.map((p) => p.sku));
  const distribution = catalogDistribution(products);
  const quality = products.reduce((sum, p) => sum + p.qualityScore, 0) / (products.length || 1);
  return {
    count: products.length,
    uniqueSlugs: slugs.size,
    uniqueSkus: skus.size,
    rootCategories: Object.keys(distribution).length,
    averageQuality: Math.round(quality),
    variants: products.reduce((sum, p) => sum + p.variants.length, 0),
    withMedia: products.filter((p) => p.imageUrl).length,
    searchable: products.filter((p) => p.searchDocument.length > 0).length,
  };
}

/** Catalog health score over an import report or live catalog quality. */
export function catalogHealth(averageQuality: number, publishedRatio: number, categoryCoverage: number): number {
  return Math.max(0, Math.min(100, Math.round(averageQuality * 0.5 + publishedRatio * 100 * 0.3 + categoryCoverage * 100 * 0.2)));
}
