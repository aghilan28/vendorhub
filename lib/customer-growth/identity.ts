// MCP-1D Phase 2 — Customer Identity Platform (deterministic, pure).
//
// Profile completion, lifecycle staging, RFM-based segmentation, customer value
// score, trust indicators and account health. Operates on real customer shapes
// and the labelled sample identically.

import type {
  CustomerActivity,
  CustomerIdentity,
  CustomerProfileInput,
  CustomerSegment,
  LifecycleStage,
  ProfileCompletion,
} from "./types";

const PROFILE_FIELDS: Array<{ key: string; label: string; weight: number; has: (p: CustomerProfileInput) => boolean }> = [
  { key: "name", label: "Name", weight: 12, has: (p) => Boolean(p.name && p.name.trim()) },
  { key: "email", label: "Email", weight: 14, has: (p) => Boolean(p.email && p.email.includes("@")) },
  { key: "emailVerified", label: "Verified email", weight: 10, has: (p) => Boolean(p.emailVerified) },
  { key: "phone", label: "Phone", weight: 12, has: (p) => Boolean(p.phone && p.phone.replace(/\D/g, "").length >= 10) },
  { key: "phoneVerified", label: "Verified phone", weight: 10, has: (p) => Boolean(p.phoneVerified) },
  { key: "address", label: "Saved address", weight: 14, has: (p) => (p.savedAddresses ?? 0) > 0 },
  { key: "city", label: "City / pincode", weight: 8, has: (p) => Boolean(p.city || p.pincode) },
  { key: "interests", label: "Interests", weight: 12, has: (p) => (p.interests?.length ?? 0) > 0 },
  { key: "preferredCategories", label: "Preferred categories", weight: 8, has: (p) => (p.preferredCategories?.length ?? 0) > 0 },
];

export function computeProfileCompletion(profile: CustomerProfileInput): ProfileCompletion {
  const completed: string[] = [];
  const missing: Array<{ label: string; weight: number }> = [];
  let earned = 0;
  let total = 0;
  for (const field of PROFILE_FIELDS) {
    total += field.weight;
    if (field.has(profile)) {
      earned += field.weight;
      completed.push(field.label);
    } else {
      missing.push({ label: field.label, weight: field.weight });
    }
  }
  const score = total ? Math.round((earned / total) * 100) : 0;
  const nextBest = missing.sort((a, b) => b.weight - a.weight)[0];
  return {
    score,
    completedFields: completed,
    missingFields: missing.map((m) => m.label),
    nextBestField: nextBest ? nextBest.label : null,
  };
}

/** Lifecycle stage from recency/frequency. Deterministic thresholds. */
export function deriveLifecycle(activity: CustomerActivity | undefined, joinedDaysAgo = 0): LifecycleStage {
  const a = activity ?? { orders: 0, totalSpend: 0, lastOrderDaysAgo: null, firstOrderDaysAgo: null };
  if (a.orders === 0) return joinedDaysAgo <= 30 ? "new" : "visitor";
  const recency = a.lastOrderDaysAgo ?? 9999;
  if (a.orders === 1 && recency <= 30) return "new";
  if (recency > 180) return "churned";
  if (recency > 90) return "dormant";
  if (recency > 45) return "at_risk";
  // recently reactivated: ordered recently but the previous gap was long
  if ((a.firstOrderDaysAgo ?? 0) > 180 && a.orders <= 3 && recency <= 30) return "reactivated";
  if (a.orders >= 5 && recency <= 45) return "loyal";
  return "active";
}

/** RFM-style customer value score (0..100). */
export function computeValueScore(activity: CustomerActivity | undefined): number {
  const a = activity ?? { orders: 0, totalSpend: 0, lastOrderDaysAgo: null, firstOrderDaysAgo: null };
  const recency = a.lastOrderDaysAgo;
  // Recency: fresher is better. Never ordered = 0.
  const recencyScore = recency === null ? 0 : Math.max(0, 100 - Math.min(100, recency * 1.1));
  // Frequency: saturating at ~12 orders.
  const frequencyScore = Math.min(100, (a.orders / 12) * 100);
  // Monetary: saturating at ~30k spend.
  const monetaryScore = Math.min(100, (a.totalSpend / 30000) * 100);
  // Engagement bonus from reviews/sessions/wishlist.
  const engagement = Math.min(100, ((a.reviews ?? 0) * 8 + (a.sessionsLast30 ?? 0) * 3 + (a.wishlistItems ?? 0) * 2));
  const returnPenalty = Math.min(20, (a.returns ?? 0) * 5);
  const score = recencyScore * 0.3 + frequencyScore * 0.3 + monetaryScore * 0.3 + engagement * 0.1 - returnPenalty;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function deriveSegment(activity: CustomerActivity | undefined, valueScore: number, lifecycle: LifecycleStage): CustomerSegment {
  const a = activity ?? { orders: 0, totalSpend: 0, lastOrderDaysAgo: null, firstOrderDaysAgo: null };
  if (lifecycle === "dormant" || lifecycle === "churned") return "dormant";
  if (lifecycle === "at_risk") return "at_risk";
  if (valueScore >= 80 && a.orders >= 5) return "vip";
  if (valueScore >= 60 && a.orders >= 3) return "loyal";
  if (a.orders === 0) return "new";
  if (lifecycle === "new") return "promising";
  if ((a.returns ?? 0) >= 3 || (a.avgOrderValue ?? a.totalSpend / Math.max(1, a.orders)) < 300) return "bargain";
  return "promising";
}

function trustIndicators(profile: CustomerProfileInput, completion: ProfileCompletion): string[] {
  const out: string[] = [];
  if (profile.emailVerified) out.push("Email verified");
  if (profile.phoneVerified) out.push("Phone verified");
  if ((profile.activity?.orders ?? 0) >= 3) out.push("Repeat customer");
  if ((profile.activity?.reviews ?? 0) > 0) out.push("Contributor");
  if (completion.score >= 80) out.push("Complete profile");
  return out;
}

function accountHealth(completion: ProfileCompletion, valueScore: number, lifecycle: LifecycleStage): number {
  const lifecyclePenalty = lifecycle === "churned" ? 40 : lifecycle === "dormant" ? 25 : lifecycle === "at_risk" ? 12 : 0;
  return Math.max(0, Math.min(100, Math.round(completion.score * 0.4 + valueScore * 0.6 - lifecyclePenalty)));
}

export function buildCustomerIdentity(profile: CustomerProfileInput): CustomerIdentity {
  const completion = computeProfileCompletion(profile);
  const lifecycle = deriveLifecycle(profile.activity, profile.joinedDaysAgo ?? 0);
  const valueScore = computeValueScore(profile.activity);
  const segment = deriveSegment(profile.activity, valueScore, lifecycle);
  const a = profile.activity;
  return {
    customerId: profile.customerId,
    name: profile.name?.trim() || "Customer",
    completion,
    lifecycle,
    segment,
    valueScore,
    trustIndicators: trustIndicators(profile, completion),
    accountHealth: accountHealth(completion, valueScore, lifecycle),
    recency: a?.lastOrderDaysAgo ?? null,
    frequency: a?.orders ?? 0,
    monetary: a?.totalSpend ?? 0,
  };
}
