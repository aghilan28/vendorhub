import { checkRateLimit } from "@/lib/security/rate-limit";

export function checkPaymentRateLimit(key: string, limit = 12, windowMs = 60_000) {
  return checkRateLimit(key, { limit, windowMs });
}
