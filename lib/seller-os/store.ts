// MCP-0C — Store Management (health + completeness scoring)

import type { SellerOperatingInput, StoreHealth, Tone } from "./types";

function tone(score: number): Tone {
  if (score >= 80) return "healthy";
  if (score >= 65) return "watch";
  if (score >= 45) return "degraded";
  return "critical";
}

/** Computes store health from catalog coverage, verification and order activity. */
export function computeStoreHealth(input: SellerOperatingInput): StoreHealth {
  const verified = input.storeStatus === "ACTIVE";
  const published = input.products.filter((p) => p.status === "published").length;
  const withMedia = input.products.filter((p) => Boolean(p.imageHint)).length;
  const hasOrders = input.orders.length > 0;

  const signals = [
    { label: "Store verified", value: verified ? "Active" : input.storeStatus, ok: verified },
    { label: "Published products", value: String(published), ok: published > 0 },
    { label: "Catalog media", value: `${withMedia}/${input.products.length || 0}`, ok: input.products.length > 0 && withMedia === input.products.length },
    { label: "Order activity", value: hasOrders ? `${input.orders.length} orders` : "No orders yet", ok: hasOrders },
  ];

  const completion = Math.round((signals.filter((s) => s.ok).length / signals.length) * 100);
  let score = completion;
  if (!verified) score -= 15;
  if (published === 0) score -= 20;
  score = Math.max(0, Math.min(100, score));

  return { score, tone: tone(score), profileCompletion: completion, verified, signals };
}
