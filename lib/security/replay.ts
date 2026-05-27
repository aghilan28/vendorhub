import { createHash } from "crypto";

type ReplayEntry = {
  expiresAt: number;
};

const replayKeys = new Map<string, ReplayEntry>();

export function hashRequestBody(body: string) {
  return createHash("sha256").update(body).digest("hex");
}

export function checkReplayKey(key: string, ttlMs = 5 * 60_000) {
  const now = Date.now();
  for (const [storedKey, entry] of replayKeys) {
    if (entry.expiresAt <= now) replayKeys.delete(storedKey);
  }

  const existing = replayKeys.get(key);
  if (existing && existing.expiresAt > now) {
    return { allowed: false, expiresAt: existing.expiresAt };
  }

  replayKeys.set(key, { expiresAt: now + ttlMs });
  return { allowed: true, expiresAt: now + ttlMs };
}

export function validateWebhookTimestamp(timestamp: string | null, toleranceMs = 5 * 60_000) {
  if (!timestamp) return { valid: false, reason: "missing_timestamp" };
  const parsed = Number(timestamp);
  const millis = parsed > 10_000_000_000 ? parsed : parsed * 1000;
  if (!Number.isFinite(millis)) return { valid: false, reason: "invalid_timestamp" };
  const drift = Math.abs(Date.now() - millis);
  return drift <= toleranceMs ? { valid: true, driftMs: drift } : { valid: false, reason: "timestamp_outside_tolerance", driftMs: drift };
}

export function clearReplayKeysForTests() {
  replayKeys.clear();
}
