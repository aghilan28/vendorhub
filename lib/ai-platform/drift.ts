/**
 * Phase E — Drift detection. Detects data/feature/prediction/embedding/knowledge
 * drift via standard statistics (no dependencies). Status convention: 0 ok,
 * 1 warn, 2 drift — mirrored to the kartex_ai_drift_status gauge so drift is
 * alertable and a model can be flagged for re-evaluation/retraining.
 */
export type DriftStatus = 0 | 1 | 2;

export const PSI_THRESHOLDS = { warn: 0.1, drift: 0.25 };

/** Bin numeric samples into `bins` equal-width buckets over [min,max]; returns proportions. */
export function toDistribution(samples: number[], bins = 10, range?: [number, number]): number[] {
  if (samples.length === 0) return new Array(bins).fill(0);
  const min = range?.[0] ?? Math.min(...samples);
  const max = range?.[1] ?? Math.max(...samples);
  const width = (max - min) / bins || 1;
  const counts = new Array(bins).fill(0);
  for (const s of samples) {
    let idx = Math.floor((s - min) / width);
    if (idx < 0) idx = 0;
    if (idx >= bins) idx = bins - 1;
    counts[idx] += 1;
  }
  return counts.map((c) => c / samples.length);
}

/**
 * Population Stability Index between an expected (baseline) and actual distribution.
 * Both inputs are proportions over the same bins. Small epsilon avoids log(0).
 */
export function populationStabilityIndex(expected: number[], actual: number[]): number {
  const bins = Math.max(expected.length, actual.length);
  const eps = 1e-6;
  let psi = 0;
  for (let i = 0; i < bins; i += 1) {
    const e = Math.max(expected[i] ?? 0, eps);
    const a = Math.max(actual[i] ?? 0, eps);
    psi += (a - e) * Math.log(a / e);
  }
  return psi;
}

export function psiStatus(psi: number): DriftStatus {
  if (psi >= PSI_THRESHOLDS.drift) return 2;
  if (psi >= PSI_THRESHOLDS.warn) return 1;
  return 0;
}

/** Freshness drift: how stale is the derived artifact (embeddings, profile, snapshot). */
export function freshnessDrift(lastUpdatedAt: string | number | Date | null, maxAgeHours: number): { ageHours: number | null; status: DriftStatus } {
  if (lastUpdatedAt == null) return { ageHours: null, status: 2 };
  const ageHours = (Date.now() - new Date(lastUpdatedAt).getTime()) / 3.6e6;
  const status: DriftStatus = ageHours > maxAgeHours ? 2 : ageHours > maxAgeHours * 0.75 ? 1 : 0;
  return { ageHours, status };
}

function cosine(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < n; i += 1) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/** Embedding drift: cosine distance between baseline and current centroid. */
export function embeddingCentroidDrift(baselineCentroid: number[], currentCentroid: number[], thresholds = { warn: 0.05, drift: 0.15 }): { distance: number; status: DriftStatus } {
  const distance = 1 - cosine(baselineCentroid, currentCentroid);
  const status: DriftStatus = distance >= thresholds.drift ? 2 : distance >= thresholds.warn ? 1 : 0;
  return { distance, status };
}

export function centroid(vectors: number[][]): number[] {
  if (vectors.length === 0) return [];
  const dim = vectors[0].length;
  const out = new Array(dim).fill(0);
  for (const v of vectors) for (let i = 0; i < dim; i += 1) out[i] += v[i] ?? 0;
  return out.map((x) => x / vectors.length);
}

export type DriftReport = {
  model: string;
  checks: { kind: string; status: DriftStatus; detail: Record<string, unknown> }[];
  worst: DriftStatus;
};

export function aggregateDrift(model: string, checks: DriftReport["checks"]): DriftReport {
  const worst = checks.reduce<DriftStatus>((acc, c) => (c.status > acc ? c.status : acc), 0);
  return { model, checks, worst };
}
