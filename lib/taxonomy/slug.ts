import type { Clock } from "./types";

/**
 * Deterministic slugifier. Lower-cases, strips diacritics, and collapses any non-alphanumeric
 * run into a single hyphen. Pure and stable for a given input.
 */
export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

/** Builds a hierarchical, globally-unique slug from an ancestor slug chain. */
export function buildHierarchicalSlug(localSlugChain: string[]): string {
  return localSlugChain.filter(Boolean).join("-");
}

/** Builds a human-readable, slash-delimited path from an ancestor slug chain. */
export function buildPath(localSlugChain: string[]): string {
  return localSlugChain.filter(Boolean).join("/");
}

/**
 * Creates a deterministic, monotonic clock that yields ISO timestamps. Used as the default clock
 * so the engine and governance layer never depend on wall-clock time, guaranteeing reproducible
 * tests and stable audit ordering.
 */
export function createDeterministicClock(baseEpochMs = 1_735_689_600_000, stepMs = 1_000): Clock {
  let tick = 0;
  return () => new Date(baseEpochMs + tick++ * stepMs).toISOString();
}

/** A live wall-clock implementation for production callers that want real timestamps. */
export const systemClock: Clock = () => new Date().toISOString();
