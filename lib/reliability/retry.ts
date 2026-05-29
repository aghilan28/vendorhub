/**
 * Phase D — retry with exponential backoff + full jitter and an overall deadline.
 * Jitter avoids retry-storm synchronization (a real failure-amplification risk
 * called out by the in-app alerts: "retry amplification"). Only retries errors
 * the caller marks retryable; respects CircuitOpenError by NOT retrying it.
 */
import { CircuitOpenError } from "./circuit-breaker";

export type RetryOptions = {
  attempts?: number; // total attempts including the first
  baseDelayMs?: number;
  maxDelayMs?: number;
  deadlineMs?: number; // overall budget across all attempts
  retryable?: (error: unknown, attempt: number) => boolean;
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void;
  sleep?: (ms: number) => Promise<void>; // injectable for tests
};

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function fullJitter(attempt: number, baseDelayMs: number, maxDelayMs: number): number {
  const exp = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
  return Math.floor(Math.random() * exp);
}

export async function withRetry<T>(fn: (attempt: number) => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const attempts = options.attempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 100;
  const maxDelayMs = options.maxDelayMs ?? 5000;
  const deadlineMs = options.deadlineMs ?? Number.POSITIVE_INFINITY;
  const retryable = options.retryable ?? (() => true);
  const sleep = options.sleep ?? defaultSleep;
  const startedAt = Date.now();

  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
      // Never retry a fast-failing open circuit, and never retry the last attempt.
      if (error instanceof CircuitOpenError || attempt >= attempts || !retryable(error, attempt)) {
        throw error;
      }
      const delay = fullJitter(attempt, baseDelayMs, maxDelayMs);
      if (Date.now() - startedAt + delay > deadlineMs) {
        throw error;
      }
      try {
        options.onRetry?.(error, attempt, delay);
      } catch {
        /* hook must not throw */
      }
      await sleep(delay);
    }
  }
  throw lastError;
}

/** Common retryable predicate: network/5xx/timeouts, not 4xx client errors. */
export function isTransientError(error: unknown): boolean {
  if (error instanceof CircuitOpenError) return false;
  const status = (error as any)?.status ?? (error as any)?.statusCode;
  if (typeof status === "number") return status >= 500 || status === 429;
  const name = (error as any)?.name ?? "";
  if (name === "AbortError" || name === "TimeoutError") return true;
  const code = (error as any)?.code ?? "";
  return ["ECONNRESET", "ETIMEDOUT", "ECONNREFUSED", "EAI_AGAIN", "EPIPE"].includes(code);
}
