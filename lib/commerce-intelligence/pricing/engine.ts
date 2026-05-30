import type { PriceProposal, PricingStrategy } from "../types";

/**
 * Phase F — deterministic pricing engine (pure, replayable, testable).
 * Layers static/inventory/demand/promotional/competitive rules into a bounded
 * price PROPOSAL with explicit reasons + guardrails. It NEVER returns a price
 * below the cost floor, and flags any change that exceeds the guardrail or is
 * high-risk as NOT auto-apply-eligible (governance: humans approve those).
 */
export type PricingSignals = {
  productId: string;
  vendorId?: string;
  currentPriceMinor: number;
  costMinor?: number; // margin floor; defaults to 70% of current if unknown
  currency?: string;
  strategy?: PricingStrategy;
  inventory?: {
    daysOfCover?: number; // < 2 => scarce; > 21 => overstock
    spoilageRisk?: number; // 0..1
    state?: "healthy" | "low_stock" | "critical" | "expiring" | "distressed" | "overstock";
  };
  demand?: { momentum?: number }; // 1 = steady, >1 rising, <1 falling
  promotion?: { active?: boolean; discountPct?: number };
  competitive?: { competitorMedianMinor?: number };
  guardrailMaxChangePct?: number; // default 15%
};

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

export function computePriceProposal(signals: PricingSignals): PriceProposal {
  const currency = signals.currency ?? "INR";
  const current = Math.max(1, Math.round(signals.currentPriceMinor));
  const costFloor = Math.round(signals.costMinor ?? current * 0.7);
  const maxChangePct = signals.guardrailMaxChangePct ?? 15;
  const reasons: string[] = [];

  let multiplier = 1;
  let strategy: PricingStrategy = signals.strategy ?? "static";

  // Inventory layer (markdowns dominate to protect freshness/overstock).
  const inv = signals.inventory;
  if (inv) {
    if ((inv.spoilageRisk ?? 0) >= 0.7 || inv.state === "distressed" || inv.state === "expiring") {
      multiplier *= 0.8;
      strategy = "distress";
      reasons.push("distress markdown: high spoilage / expiring stock");
    } else if ((inv.daysOfCover ?? 99) > 21 || inv.state === "overstock") {
      multiplier *= 0.93;
      strategy = strategy === "static" ? "inventory_based" : strategy;
      reasons.push("overstock markdown: days-of-cover high");
    } else if ((inv.daysOfCover ?? 99) < 2 || inv.state === "critical") {
      multiplier *= 1.05;
      strategy = strategy === "static" ? "inventory_based" : strategy;
      reasons.push("scarcity markup: low days-of-cover");
    }
  }

  // Demand layer.
  const momentum = signals.demand?.momentum;
  if (typeof momentum === "number") {
    if (momentum > 1.2) {
      multiplier *= 1.04;
      strategy = strategy === "static" ? "demand_based" : strategy;
      reasons.push(`demand markup: momentum ${momentum.toFixed(2)}x`);
    } else if (momentum < 0.8) {
      multiplier *= 0.96;
      strategy = strategy === "static" ? "demand_based" : strategy;
      reasons.push(`soft-demand markdown: momentum ${momentum.toFixed(2)}x`);
    }
  }

  // Promotional layer.
  if (signals.promotion?.active) {
    const disc = clamp(signals.promotion.discountPct ?? 10, 0, 50) / 100;
    multiplier *= 1 - disc;
    strategy = "promotional";
    reasons.push(`promotion: -${Math.round(disc * 100)}%`);
  }

  // Competitive layer (nudge toward competitor median, bounded).
  const compMedian = signals.competitive?.competitorMedianMinor;
  if (typeof compMedian === "number" && compMedian > 0) {
    const target = compMedian / current;
    multiplier *= clamp(target, 0.92, 1.08);
    strategy = strategy === "static" ? "competitive" : strategy;
    reasons.push("competitive alignment toward market median");
  }

  let proposed = Math.round(current * multiplier);

  // Guardrail 1: never below cost floor.
  if (proposed < costFloor) {
    proposed = costFloor;
    reasons.push("clamped to cost floor (margin protection)");
  }

  // Guardrail 2: bound the per-change magnitude.
  const maxUp = Math.round(current * (1 + maxChangePct / 100));
  const maxDown = Math.round(current * (1 - maxChangePct / 100));
  let guardrailBreached = false;
  if (proposed > maxUp) {
    guardrailBreached = true;
    proposed = maxUp;
    reasons.push(`clamped to +${maxChangePct}% guardrail`);
  } else if (proposed < maxDown && proposed > costFloor) {
    guardrailBreached = true;
    proposed = maxDown;
    reasons.push(`clamped to -${maxChangePct}% guardrail`);
  }

  const changePct = ((proposed - current) / current) * 100;
  const absChange = Math.abs(changePct);
  const belowHealthyMargin = proposed < costFloor * 1.05;

  const risk: PriceProposal["risk"] =
    guardrailBreached || belowHealthyMargin || absChange >= 12
      ? "high"
      : absChange >= 6
        ? "medium"
        : "low";

  // Governance: only small, low-risk, non-breaching changes may auto-apply.
  const autoApplyEligible = !guardrailBreached && risk === "low" && strategy !== "distress";

  if (reasons.length === 0) reasons.push("no pricing signal change; hold current price");

  return {
    productId: signals.productId,
    vendorId: signals.vendorId,
    currentPriceMinor: current,
    proposedPriceMinor: proposed,
    currency,
    strategy,
    changePct: Math.round(changePct * 100) / 100,
    reasons,
    guardrailBreached,
    risk,
    autoApplyEligible,
  };
}
