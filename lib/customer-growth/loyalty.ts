// MCP-1D Phase 3 — Loyalty Engine (deterministic, pure).
//
// Reward points, 4-tier system (Bronze/Silver/Gold/Platinum), reward ledger,
// rules, redemption, expiration and progress tracking. Points balance is derived
// from the ledger so the engine is reproducible and auditable.

import type {
  LoyaltyAccount,
  LoyaltyTier,
  LoyaltyTierConfig,
  RewardLedgerEntry,
  RewardRedemptionOption,
} from "./types";

export const TIER_CONFIG: LoyaltyTierConfig[] = [
  { tier: "bronze", minPoints: 0, pointsPerCurrency: 1, perks: ["Earn 1 pt / ₹100", "Birthday reward"] },
  { tier: "silver", minPoints: 1000, pointsPerCurrency: 1.25, perks: ["Earn 1.25× points", "Early access to sales"] },
  { tier: "gold", minPoints: 5000, pointsPerCurrency: 1.5, perks: ["Earn 1.5× points", "Free delivery on orders > ₹299", "Priority support"] },
  { tier: "platinum", minPoints: 15000, pointsPerCurrency: 2, perks: ["Earn 2× points", "Free delivery always", "Dedicated concierge", "Exclusive drops"] },
];

const TIER_ORDER: LoyaltyTier[] = ["bronze", "silver", "gold", "platinum"];

export const REDEMPTION_CATALOG: RewardRedemptionOption[] = [
  { id: "rd-50", label: "₹50 off coupon", pointsCost: 500, valueLabel: "₹50", kind: "coupon" },
  { id: "rd-free-del", label: "Free delivery", pointsCost: 300, valueLabel: "1 delivery", kind: "free_delivery" },
  { id: "rd-150", label: "₹150 off coupon", pointsCost: 1200, valueLabel: "₹150", kind: "coupon", minTier: "silver" },
  { id: "rd-cashback", label: "₹250 cashback", pointsCost: 2000, valueLabel: "₹250", kind: "cashback", minTier: "gold" },
  { id: "rd-gift", label: "Mystery gift", pointsCost: 5000, valueLabel: "Gift", kind: "gift", minTier: "platinum" },
];

/** Points earned for an order of `amount` at a tier's multiplier (1 pt / ₹100 base). */
export function pointsForOrder(amount: number, tier: LoyaltyTier): number {
  const cfg = TIER_CONFIG.find((t) => t.tier === tier) ?? TIER_CONFIG[0];
  return Math.max(0, Math.round((amount / 100) * cfg.pointsPerCurrency));
}

export function tierForLifetimePoints(lifetimePoints: number): LoyaltyTier {
  let tier: LoyaltyTier = "bronze";
  for (const cfg of TIER_CONFIG) {
    if (lifetimePoints >= cfg.minPoints) tier = cfg.tier;
  }
  return tier;
}

function nextTierOf(tier: LoyaltyTier): LoyaltyTier | null {
  const idx = TIER_ORDER.indexOf(tier);
  return idx >= 0 && idx < TIER_ORDER.length - 1 ? TIER_ORDER[idx + 1] : null;
}

export interface LedgerTotals {
  balance: number;
  earnedLifetime: number;
  spentLifetime: number;
  expired: number;
  expiringSoon: number;
}

/** Reduce a ledger into balances. Earn entries are positive; redemptions/expiry negative. */
export function reduceLedger(entries: RewardLedgerEntry[]): LedgerTotals {
  let balance = 0;
  let earnedLifetime = 0;
  let spentLifetime = 0;
  let expired = 0;
  let expiringSoon = 0;
  for (const e of entries) {
    balance += e.points;
    if (e.points > 0 && e.reason !== "adjustment") earnedLifetime += e.points;
    if (e.points < 0 && e.reason === "redemption") spentLifetime += -e.points;
    if (e.reason === "expiration") expired += -e.points;
    // an earn entry whose expiry is within 30 days and still "live"
    if (e.points > 0 && e.expiresInDays !== undefined) {
      const remaining = e.expiresInDays - e.daysAgo;
      if (remaining > 0 && remaining <= 30) expiringSoon += e.points;
    }
  }
  return { balance: Math.max(0, balance), earnedLifetime, spentLifetime, expired, expiringSoon };
}

export interface RedemptionResult {
  ok: boolean;
  reason: string;
  entry?: RewardLedgerEntry;
  newBalance: number;
}

/** Validate + produce the ledger entry for a redemption. Pure (no mutation). */
export function redeemReward(
  option: RewardRedemptionOption,
  account: Pick<LoyaltyAccount, "customerId" | "pointsBalance" | "tier">,
): RedemptionResult {
  if (option.minTier && TIER_ORDER.indexOf(account.tier) < TIER_ORDER.indexOf(option.minTier)) {
    return { ok: false, reason: `Requires ${option.minTier} tier or above.`, newBalance: account.pointsBalance };
  }
  if (account.pointsBalance < option.pointsCost) {
    return { ok: false, reason: `Need ${option.pointsCost - account.pointsBalance} more points.`, newBalance: account.pointsBalance };
  }
  const entry: RewardLedgerEntry = {
    id: `rl-redeem-${option.id}-${account.customerId}`,
    customerId: account.customerId,
    points: -option.pointsCost,
    reason: "redemption",
    refId: option.id,
    daysAgo: 0,
    note: `Redeemed ${option.label}`,
  };
  return { ok: true, reason: `Redeemed ${option.label}.`, entry, newBalance: account.pointsBalance - option.pointsCost };
}

export function buildLoyaltyAccount(customerId: string, ledger: RewardLedgerEntry[]): LoyaltyAccount {
  const totals = reduceLedger(ledger);
  const tier = tierForLifetimePoints(totals.earnedLifetime);
  const nextTier = nextTierOf(tier);
  const cfg = TIER_CONFIG.find((t) => t.tier === tier) ?? TIER_CONFIG[0];
  const nextCfg = nextTier ? TIER_CONFIG.find((t) => t.tier === nextTier) : null;

  const pointsToNextTier = nextCfg ? Math.max(0, nextCfg.minPoints - totals.earnedLifetime) : null;
  const tierProgress = nextCfg
    ? Math.max(0, Math.min(100, Math.round(((totals.earnedLifetime - cfg.minPoints) / Math.max(1, nextCfg.minPoints - cfg.minPoints)) * 100)))
    : 100;

  const redeemable = REDEMPTION_CATALOG.filter(
    (o) => !o.minTier || TIER_ORDER.indexOf(tier) >= TIER_ORDER.indexOf(o.minTier),
  );

  return {
    customerId,
    tier,
    nextTier,
    pointsBalance: totals.balance,
    pointsEarnedLifetime: totals.earnedLifetime,
    pointsSpentLifetime: totals.spentLifetime,
    pointsExpired: totals.expired,
    pointsExpiringSoon: totals.expiringSoon,
    pointsToNextTier,
    tierProgress,
    perks: cfg.perks,
    redeemable,
  };
}
