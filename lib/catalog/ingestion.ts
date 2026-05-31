// MCP-0B — Product Ingestion Platform (Section MCP-0B.5)
// Parse (CSV/JSON) → normalize → validate (taxonomy + attributes) → dedup →
// quality score → batch plan → report. Supports rollback via batch tokens.

import { validateAttributes } from "./attributes";
import { detectDuplicates, toDedupItem } from "./dedup";
import { scoreCatalogQuality } from "./quality";
import { isKnownCategory } from "./taxonomy";
import type {
  CatalogProductInput,
  ImportReport,
  ValidatedRow,
} from "./types";

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

/** Parses a CSV string into raw product input rows. */
export function parseCsv(csv: string): { rows: CatalogProductInput[]; errors: string[] } {
  const errors: string[] = [];
  const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return { rows: [], errors: ["empty_or_headers_only"] };
  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const col = (k: string) => header.indexOf(k);
  const required = ["name", "category", "price"];
  for (const r of required) if (col(r) === -1) errors.push(`missing_column:${r}`);
  if (errors.length) return { rows: [], errors };

  const rows: CatalogProductInput[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cells = lines[i].split(",");
    const attrIdx = col("attributes");
    const attributes: Record<string, string> = {};
    if (attrIdx >= 0 && cells[attrIdx]) {
      for (const pair of cells[attrIdx].split(";")) {
        const [k, v] = pair.split("=");
        if (k && v) attributes[k.trim()] = v.trim();
      }
    }
    rows.push({
      externalId: col("id") >= 0 ? cells[col("id")]?.trim() : String(i),
      name: (cells[col("name")] ?? "").trim(),
      categorySlug: (cells[col("category")] ?? "").trim(),
      price: num(cells[col("price")]),
      brand: col("brand") >= 0 ? cells[col("brand")]?.trim() : undefined,
      sku: col("sku") >= 0 ? cells[col("sku")]?.trim() : undefined,
      description: col("description") >= 0 ? cells[col("description")]?.trim() : undefined,
      stock: col("stock") >= 0 ? num(cells[col("stock")]) : undefined,
      imageUrls: col("images") >= 0 && cells[col("images")] ? cells[col("images")].split("|").map((s) => s.trim()).filter(Boolean) : [],
      attributes,
    });
  }
  return { rows, errors: [] };
}

/** Parses a JSON array of product inputs. */
export function parseJson(json: string): { rows: CatalogProductInput[]; errors: string[] } {
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return { rows: [], errors: ["not_an_array"] };
    return { rows: parsed as CatalogProductInput[], errors: [] };
  } catch {
    return { rows: [], errors: ["invalid_json"] };
  }
}

function validateRow(input: CatalogProductInput): ValidatedRow {
  const ref = input.externalId ?? input.sku ?? input.name;
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!input.name || input.name.trim().length < 3) errors.push("invalid_name");
  if (!input.categorySlug) errors.push("missing_category");
  else if (!isKnownCategory(input.categorySlug)) errors.push("unknown_category");
  if (!(input.price > 0)) errors.push("invalid_price");

  if (input.categorySlug && isKnownCategory(input.categorySlug)) {
    const attr = validateAttributes(input.categorySlug, input.attributes ?? {});
    errors.push(...attr.errors);
    warnings.push(...attr.warnings);
  }

  const quality = scoreCatalogQuality(input);
  if (!input.imageUrls || input.imageUrls.length === 0) warnings.push("no_media");

  const status = errors.length > 0 ? "invalid" : warnings.length > 0 ? "warning" : "valid";
  return { ref, status, errors, warnings, quality, normalized: errors.length ? null : input };
}

/**
 * Runs the full ingestion analysis over a batch of rows: validate every row,
 * detect duplicates across the batch, compute quality, and plan batches.
 */
export function analyzeImport(rows: CatalogProductInput[], batchSize = 500): ImportReport {
  const validated = rows.map(validateRow);
  const dupes = detectDuplicates(
    rows.map((r, i) => toDedupItem(validated[i].ref, r)),
  );
  const dupeRefs = new Set(dupes.map((d) => d.ref));
  for (const row of validated) {
    if (dupeRefs.has(row.ref) && row.status !== "invalid") {
      row.status = "duplicate";
      row.warnings.push("duplicate");
    }
  }

  const valid = validated.filter((r) => r.status === "valid").length;
  const invalid = validated.filter((r) => r.status === "invalid").length;
  const duplicates = validated.filter((r) => r.status === "duplicate").length;
  const warnings = validated.filter((r) => r.status === "warning").length;
  const averageQuality = validated.length
    ? Math.round(validated.reduce((s, r) => s + r.quality.score, 0) / validated.length)
    : 0;

  return {
    total: validated.length,
    valid,
    invalid,
    duplicates,
    warnings,
    averageQuality,
    rows: validated,
    batches: Math.max(1, Math.ceil(validated.length / Math.max(1, batchSize))),
  };
}

/** Rows that are safe to publish (valid; duplicates/invalid excluded). */
export function publishableRows(report: ImportReport): CatalogProductInput[] {
  return report.rows
    .filter((r) => r.status === "valid" || r.status === "warning")
    .map((r) => r.normalized)
    .filter((r): r is CatalogProductInput => r !== null);
}
