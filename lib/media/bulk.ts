// MCP-0A — Bulk Media Ingestion (Section MCP-0A.9)
// Deterministic planning for ZIP / CSV+images / folder imports: parse a
// manifest, validate rows, batch them, and model progress + resume.

export interface ManifestRow {
  /** External row identifier (line number / SKU). */
  ref: string;
  sku?: string;
  name?: string;
  /** Image filenames (within the uploaded ZIP/folder) for this product. */
  images: string[];
}

export interface ManifestParseResult {
  rows: ManifestRow[];
  errors: Array<{ line: number; message: string }>;
}

/**
 * Parses a CSV manifest. Expected header includes `sku,name,images` where
 * `images` is a pipe-separated list of filenames.
 */
export function parseCsvManifest(csv: string): ManifestParseResult {
  const rows: ManifestRow[] = [];
  const errors: Array<{ line: number; message: string }> = [];
  const lines = csv.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return { rows, errors };

  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const idx = (key: string) => header.indexOf(key);
  const skuIdx = idx("sku");
  const nameIdx = idx("name");
  const imagesIdx = idx("images");

  if (imagesIdx === -1) {
    errors.push({ line: 1, message: "missing_images_column" });
    return { rows, errors };
  }

  for (let i = 1; i < lines.length; i += 1) {
    const cols = lines[i].split(",");
    const images = (cols[imagesIdx] ?? "")
      .split("|")
      .map((s) => s.trim())
      .filter(Boolean);
    if (images.length === 0) {
      errors.push({ line: i + 1, message: "no_images" });
      continue;
    }
    rows.push({
      ref: String(i + 1),
      sku: skuIdx >= 0 ? cols[skuIdx]?.trim() : undefined,
      name: nameIdx >= 0 ? cols[nameIdx]?.trim() : undefined,
      images,
    });
  }

  return { rows, errors };
}

export interface IngestionBatch {
  index: number;
  rows: ManifestRow[];
}

export interface IngestionPlan {
  totalRows: number;
  totalImages: number;
  batchSize: number;
  batches: IngestionBatch[];
}

/** Splits a manifest into deterministic processing batches. */
export function planIngestion(rows: ManifestRow[], batchSize = 100): IngestionPlan {
  const safeBatch = Math.max(1, Math.min(1000, batchSize));
  const batches: IngestionBatch[] = [];
  for (let i = 0; i < rows.length; i += safeBatch) {
    batches.push({ index: batches.length, rows: rows.slice(i, i + safeBatch) });
  }
  return {
    totalRows: rows.length,
    totalImages: rows.reduce((sum, r) => sum + r.images.length, 0),
    batchSize: safeBatch,
    batches,
  };
}

export type RowState = "pending" | "processing" | "done" | "failed";

export interface IngestionProgress {
  total: number;
  done: number;
  failed: number;
  pending: number;
  percent: number;
}

/** Computes progress from per-row states (supports resume after failures). */
export function computeProgress(states: RowState[]): IngestionProgress {
  const total = states.length;
  const done = states.filter((s) => s === "done").length;
  const failed = states.filter((s) => s === "failed").length;
  const pending = states.filter((s) => s === "pending" || s === "processing").length;
  return {
    total,
    done,
    failed,
    pending,
    percent: total ? Math.round(((done + failed) / total) * 100) : 0,
  };
}

/** Rows that should be retried on resume (failed + not-yet-started). */
export function resumableRows(rows: ManifestRow[], states: RowState[]): ManifestRow[] {
  return rows.filter((_, i) => states[i] === "failed" || states[i] === "pending");
}
