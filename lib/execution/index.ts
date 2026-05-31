// KARTEX M8 — Operational Execution & Decision Activation Engine
// Public surface for the execution module. Deterministic, dependency-free, and
// safe to import from both server (API routes) and client (zustand store).

export * from "./types";
export * from "./workflow";
export * from "./factory";
export * from "./analytics";
export * from "./mutations";
export { buildSeedDataset } from "./seed";

import { buildExecutionSnapshot, type ExecutionSnapshot } from "./analytics";
import { buildSeedDataset } from "./seed";
import type { ExecutionDataset } from "./types";

/**
 * Returns the default seeded dataset plus a computed snapshot. Used by the API
 * GET handler and as the initial state for the interactive client store.
 */
export function getExecutionState(generatedAt?: string): {
  data: ExecutionDataset;
  snapshot: ExecutionSnapshot;
} {
  const data = buildSeedDataset();
  return { data, snapshot: buildExecutionSnapshot(data, generatedAt) };
}
