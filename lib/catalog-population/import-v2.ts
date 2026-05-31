// MCP-1B Phase 4 — Catalog Import Platform V2 (deterministic, pure).
//
// Extends the MCP-1A synchronous import into a chunked / queued / retryable /
// monitorable import suitable for large files (50k+ rows). Reuses the MCP-0B
// `analyzeImport` per chunk. The actual async execution is delegated to the
// repo's existing queue infra; this models the plan + state machine + analytics.

import { analyzeImport, publishableRows, type CatalogProductInput } from "@/lib/catalog";
import type {
  ImportAnalytics,
  ImportChunk,
  ImportJobV2,
  ImportProgress,
  ImportQueueItem,
} from "./types";

const DEFAULT_CHUNK = 1000;
const DEFAULT_MAX_ATTEMPTS = 3;

/** Plan a large import into deterministic chunks (no analysis yet — queued). */
export function planImportJob(
  sellerId: string,
  fileName: string,
  totalRows: number,
  chunkSize = DEFAULT_CHUNK,
  at?: string,
): ImportJobV2 {
  const safeChunk = Math.max(100, Math.min(5000, chunkSize));
  const chunks: ImportChunk[] = [];
  for (let from = 0; from < totalRows; from += safeChunk) {
    const to = Math.min(totalRows, from + safeChunk);
    chunks.push({ index: chunks.length, from, to, size: to - from, state: "pending", attempts: 0, valid: 0, invalid: 0, publishable: 0 });
  }
  return {
    id: `impv2-${sellerId}-${at ?? Date.now()}`,
    sellerId,
    fileName,
    totalRows,
    chunkSize: safeChunk,
    chunks,
    state: totalRows > 0 ? "queued" : "completed",
    createdAt: at ?? new Date().toISOString(),
    maxAttempts: DEFAULT_MAX_ATTEMPTS,
  };
}

/** Process one chunk of already-parsed rows through the 0B validator. */
export function processChunk(job: ImportJobV2, chunkIndex: number, rows: CatalogProductInput[]): ImportJobV2 {
  const chunk = job.chunks[chunkIndex];
  if (!chunk) return job;
  const report = analyzeImport(rows);
  const publishable = publishableRows(report).length;
  const updated: ImportChunk = {
    ...chunk,
    attempts: chunk.attempts + 1,
    valid: report.valid + report.warnings,
    invalid: report.invalid,
    publishable,
    state: report.total > 0 && report.valid + report.warnings === 0 ? "failed" : "done",
  };
  const chunks = job.chunks.map((c, i) => (i === chunkIndex ? updated : c));
  return { ...job, chunks, state: deriveJobState(chunks, job.maxAttempts) };
}

/** Mark a chunk as failed (e.g. parse/transport error) for later retry. */
export function failChunk(job: ImportJobV2, chunkIndex: number): ImportJobV2 {
  const chunks = job.chunks.map((c, i) => (i === chunkIndex ? { ...c, attempts: c.attempts + 1, state: "failed" as const } : c));
  return { ...job, chunks, state: deriveJobState(chunks, job.maxAttempts) };
}

/** Chunks eligible for retry (failed and under the attempt cap). */
export function retryableChunks(job: ImportJobV2): ImportChunk[] {
  return job.chunks.filter((c) => c.state === "failed" && c.attempts < job.maxAttempts);
}

function deriveJobState(chunks: ImportChunk[], maxAttempts: number): ImportJobV2["state"] {
  if (chunks.length === 0) return "completed";
  const pending = chunks.some((c) => c.state === "pending" || c.state === "processing");
  if (pending) return "running";
  const failed = chunks.filter((c) => c.state === "failed");
  if (failed.length === 0) return "completed";
  // Failures remain but all attempts exhausted → completed_with_errors; otherwise failed (retryable).
  const exhausted = failed.every((c) => c.attempts >= maxAttempts);
  const anyDone = chunks.some((c) => c.state === "done");
  if (exhausted) return anyDone ? "completed_with_errors" : "failed";
  return "running";
}

/** Monitoring progress across chunks. */
export function importProgress(job: ImportJobV2): ImportProgress {
  const doneChunks = job.chunks.filter((c) => c.state === "done").length;
  const failedChunks = job.chunks.filter((c) => c.state === "failed").length;
  const processedRows = job.chunks.filter((c) => c.state === "done" || c.state === "failed").reduce((s, c) => s + c.size, 0);
  const publishable = job.chunks.reduce((s, c) => s + c.publishable, 0);
  const invalid = job.chunks.reduce((s, c) => s + c.invalid, 0);
  return {
    totalRows: job.totalRows,
    processedRows,
    totalChunks: job.chunks.length,
    doneChunks,
    failedChunks,
    percent: job.totalRows ? Math.round((processedRows / job.totalRows) * 100) : 100,
    publishable,
    invalid,
  };
}

/** Aggregate analytics across multiple import jobs (seller import dashboard). */
export function importAnalytics(jobs: ImportJobV2[]): ImportAnalytics {
  const rows = jobs.reduce((s, j) => s + j.totalRows, 0);
  const publishable = jobs.reduce((s, j) => s + j.chunks.reduce((cs, c) => cs + c.publishable, 0), 0);
  const invalid = jobs.reduce((s, j) => s + j.chunks.reduce((cs, c) => cs + c.invalid, 0), 0);
  const retries = jobs.reduce((s, j) => s + j.chunks.reduce((cs, c) => cs + Math.max(0, c.attempts - 1), 0), 0);
  const processed = publishable + invalid;
  const totalChunks = jobs.reduce((s, j) => s + j.chunks.length, 0);
  return {
    jobs: jobs.length,
    rows,
    publishable,
    invalid,
    publishRate: processed ? Math.round((publishable / processed) * 100) : 0,
    errorRate: processed ? Math.round((invalid / processed) * 100) : 0,
    retries,
    throughputRowsPerChunk: totalChunks ? Math.round(rows / totalChunks) : 0,
  };
}

/** Queue view for the seller import dashboard. */
export function importQueue(jobs: ImportJobV2[]): ImportQueueItem[] {
  return jobs
    .map((j) => ({ jobId: j.id, sellerId: j.sellerId, fileName: j.fileName, totalRows: j.totalRows, state: j.state, percent: importProgress(j).percent, createdAt: j.createdAt }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/** Capacity check: can a job of N rows be processed within chunk limits? */
export function importCapacity(totalRows: number, chunkSize = DEFAULT_CHUNK): { chunks: number; supported: boolean; note: string } {
  const safeChunk = Math.max(100, Math.min(5000, chunkSize));
  const chunks = Math.ceil(totalRows / safeChunk);
  return {
    chunks,
    supported: totalRows <= 1_000_000,
    note: `${totalRows.toLocaleString("en-IN")} rows → ${chunks.toLocaleString("en-IN")} chunks of ${safeChunk}.`,
  };
}
